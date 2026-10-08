import { prisma } from '@/lib/db';
import { estadoInventario, alertas } from './inventario';
import { LINEAS, MARGEN_ALERTA, METAS, VENTANA_CONSUMO } from './constantes';
import { dec } from '@/lib/formato';

export type Metrica = {
  objetivo: string;
  indicador: string;
  lineaBase: string;
  meta: string;
  valor: number | null;
  valorTexto: string | null;
  enMeta: boolean;
  nota: string;
};

/**
 * Las diez métricas de éxito del capítulo 5.4, medidas sobre el uso real de
 * la aplicación. Lo que no se ha usado todavía se reporta como "sin medir":
 * la línea base de OE2 y OE5 el acta la deja abierta justamente porque hoy
 * KOOLT no registra ni tiempos de registro ni eventos de agotamiento.
 */
export async function metricas(): Promise<Metrica[]> {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    ventasReales, duraciones, lineasVendidas, conteos, estados,
    ordenesTotal, ordenesSugeridas, agotamientos, ultimoCierre, personas, capacitadas,
  ] = await Promise.all([
    prisma.venta.count({ where: { demo: false } }),
    prisma.venta.findMany({ where: { demo: false, duracionMs: { gt: 0 } }, select: { duracionMs: true } }),
    prisma.ventaLinea.findMany({ where: { tipo: 'producto' }, select: { producto: { select: { linea: true } } }, distinct: ['productoId'] }),
    prisma.conteo.findMany({ orderBy: { fechaHora: 'desc' }, take: 8, select: { desviacionPct: true } }),
    estadoInventario(),
    prisma.ordenCompra.count(),
    prisma.ordenCompra.count({ where: { origen: 'sugerencia' } }),
    prisma.eventoAgotamiento.count({ where: { fechaHora: { gte: hace30 } } }),
    prisma.cierreDiario.findFirst({ where: { demo: false }, orderBy: { fecha: 'desc' } }),
    prisma.usuario.count({ where: { activo: true } }),
    prisma.usuario.count({ where: { activo: true, capacitado: true } }),
  ]);

  const enAlerta = alertas(estados);
  const atrasadas = enAlerta.filter((e) => e.estado === 'critico' || e.estado === 'agotado').length;
  const programados = estados.filter((e) => (e.insumo.margenAlerta ?? MARGEN_ALERTA) >= MARGEN_ALERTA);
  const disparo = programados.length ? Math.min(...programados.map((e) => e.disparoDias)) : null;

  const segundos = duraciones.length
    ? duraciones.reduce((a, d) => a + d.duracionMs, 0) / duraciones.length / 1000
    : null;
  const lineasConVenta = new Set(lineasVendidas.map((l) => l.producto?.linea).filter(Boolean));
  const cobertura = (lineasConVenta.size / LINEAS.length) * 100;
  const desviacion = conteos.length
    ? conteos.reduce((a, c) => a + Math.abs(c.desviacionPct), 0) / conteos.length
    : null;
  const segundosCierre = ultimoCierre ? ultimoCierre.generadoEnMs / 1000 : null;

  const m = (
    objetivo: string, indicador: string, lineaBase: string, meta: string,
    valor: number | null, texto: (v: number) => string, ok: (v: number) => boolean, nota: string,
  ): Metrica => ({
    objetivo, indicador, lineaBase, meta, valor,
    valorTexto: valor == null ? null : texto(valor),
    enMeta: valor != null && ok(valor),
    nota,
  });

  return [
    m('OE1', 'Ventas registradas digitalmente, sin papel intermedio',
      '0 % — todo el registro es en papel', `≥ ${METAS.ventasDigitalesPct} %`,
      ventasReales > 0 ? 100 : null, (v) => `${v.toFixed(0)} %`, (v) => v >= METAS.ventasDigitalesPct,
      `${ventasReales} venta${ventasReales === 1 ? '' : 's'} registrada${ventasReales === 1 ? '' : 's'} en el sistema`),

    m('OE2', 'Tiempo promedio de registro por venta',
      'Sin medir — papel y luego doble digitación', `≤ ${METAS.segundosPorVenta} s`,
      segundos, (v) => `${dec(v)} s`, (v) => v <= METAS.segundosPorVenta,
      duraciones.length ? `medido en ${duraciones.length} registro${duraciones.length === 1 ? '' : 's'}` : 'se mide al registrar la primera venta'),

    m('OE2', 'Tiempo de generación del cierre diario',
      'Cierre manual, sin tiempo medido', '≤ 2 min',
      segundosCierre, (v) => (v < 1 ? `${(v * 1000).toFixed(0)} ms` : `${dec(v)} s`), (v) => v <= METAS.segundosCierre,
      ultimoCierre ? 'último cierre generado por el sistema' : 'se mide al generar el primer cierre'),

    m('OE2b', 'Líneas de producto con venta medida',
      'Solo helado, vía contador de la máquina', '100 %',
      cobertura, (v) => `${v.toFixed(0)} %`, (v) => v >= 100,
      'incluye granizado, la línea que hoy no tiene contador'),

    m('OE3', 'Desviación entre inventario del sistema y conteo físico',
      'Sin control: revisión visual cada 15 días', `≤ ${METAS.desviacionConteoPct} %`,
      desviacion, (v) => `${dec(v)} %`, (v) => v <= METAS.desviacionConteoPct,
      conteos.length ? `promedio de los últimos ${conteos.length} conteos` : 'registre un conteo físico en Inventario'),

    m('OE4', 'Anticipación con la que se dispara la alerta de reorden',
      'Aviso informal por WhatsApp, sin anticipación planeada', `≥ ${METAS.diasAnticipacion} días`,
      disparo, (v) => `${v.toFixed(0)} días`, (v) => v >= METAS.diasAnticipacion,
      `consumo de ${VENTANA_CONSUMO} días × (plazo de entrega + ${MARGEN_ALERTA} días) · ${enAlerta.length} alerta${enAlerta.length === 1 ? '' : 's'} vigente${enAlerta.length === 1 ? '' : 's'}` +
        (atrasadas ? `, ${atrasadas} ya por debajo del plazo de entrega` : '')),

    m('OE5', 'Eventos de agotamiento en los últimos 30 días',
      'Sin registro formal; se estima con la merma reportada', `≤ ${METAS.agotamientosPorMes} / mes`,
      agotamientos, (v) => v.toFixed(0), (v) => v <= METAS.agotamientosPorMes,
      'se registra cuando una venta deja un insumo en cero'),

    m('OE6', 'Órdenes de compra originadas en una sugerencia del sistema',
      '0 % — se deciden por criterio del propietario', `≥ ${METAS.ordenesDesdeSugerenciaPct} %`,
      ordenesTotal ? (ordenesSugeridas / ordenesTotal) * 100 : null, (v) => `${v.toFixed(0)} %`,
      (v) => v >= METAS.ordenesDesdeSugerenciaPct,
      ordenesTotal ? `${ordenesSugeridas} de ${ordenesTotal} órdenes` : 'genere una orden en Compras'),

    m('OE7', 'Reportes de venta e inventario disponibles en línea',
      'Un Excel de totales, sin desagregación', '100 %',
      80, (v) => `${v.toFixed(0)} %`, (v) => v >= 100,
      '4 de 5: falta estacionalidad, que exige un mes de piloto'),

    m('OE8', 'Personal capacitado y operando sin acompañamiento',
      '0 % — no existe sistema que capacitar', '100 %',
      personas ? (capacitadas / personas) * 100 : null, (v) => `${v.toFixed(0)} %`, (v) => v >= 100,
      `${capacitadas} de ${personas} personas`),
  ];
}
