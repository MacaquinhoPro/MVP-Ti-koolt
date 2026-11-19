import { prisma } from '@/lib/db';
import { estadoInventario, alertas } from './inventario';
import { MARGEN_ALERTA, METAS, VENTANA_CONSUMO } from './constantes';
import { dec } from '@/lib/formato';

export type Metrica = {
  indicador: string;
  meta: string;
  valor: number | null;
  valorTexto: string | null;
  enMeta: boolean;
  nota: string;
};

/**
 * Indicadores de operación, medidos sobre el uso real de la aplicación. Lo que
 * todavía no tiene datos se reporta como "sin medir" en vez de inventar un cero.
 */
export async function metricas(): Promise<Metrica[]> {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    duraciones, conteos, estados, ordenesTotal, ordenesSugeridas, agotamientos, ultimoCierre, personas, capacitadas,
  ] = await Promise.all([
    prisma.venta.findMany({ where: { demo: false, duracionMs: { gt: 0 } }, select: { duracionMs: true } }),
    prisma.conteo.findMany({ orderBy: { fechaHora: 'desc' }, take: 8, select: { desviacionPct: true } }),
    estadoInventario(),
    prisma.ordenCompra.count(),
    prisma.ordenCompra.count({ where: { origen: 'sugerencia' } }),
    prisma.eventoAgotamiento.count({ where: { fechaHora: { gte: hace30 } } }),
    prisma.cierreDiario.findFirst({ where: { demo: false }, orderBy: { fecha: 'desc' } }),
    prisma.usuario.count({ where: { clerkId: { not: null }, aprobado: true, activo: true } }),
    prisma.usuario.count({ where: { clerkId: { not: null }, aprobado: true, activo: true, capacitado: true } }),
  ]);

  const enAlerta = alertas(estados);
  const atrasadas = enAlerta.filter((e) => e.estado === 'critico' || e.estado === 'agotado').length;
  const programados = estados.filter((e) => (e.insumo.margenAlerta ?? MARGEN_ALERTA) >= MARGEN_ALERTA);
  const disparo = programados.length ? Math.min(...programados.map((e) => e.disparoDias)) : null;

  const segundos = duraciones.length
    ? duraciones.reduce((a, d) => a + d.duracionMs, 0) / duraciones.length / 1000
    : null;
  const desviacion = conteos.length
    ? conteos.reduce((a, c) => a + Math.abs(c.desviacionPct), 0) / conteos.length
    : null;
  const segundosCierre = ultimoCierre ? ultimoCierre.generadoEnMs / 1000 : null;

  const m = (
    indicador: string, meta: string,
    valor: number | null, texto: (v: number) => string, ok: (v: number) => boolean, nota: string,
  ): Metrica => ({
    indicador, meta, valor,
    valorTexto: valor == null ? null : texto(valor),
    enMeta: valor != null && ok(valor),
    nota,
  });

  return [
    m('Tiempo promedio de registro por venta', `≤ ${METAS.segundosPorVenta} s`,
      segundos, (v) => `${dec(v)} s`, (v) => v <= METAS.segundosPorVenta,
      duraciones.length ? `medido en ${duraciones.length} venta${duraciones.length === 1 ? '' : 's'}` : 'se mide al registrar la primera venta'),

    m('Tiempo de generación del cierre diario', '≤ 2 min',
      segundosCierre, (v) => (v < 1 ? `${(v * 1000).toFixed(0)} ms` : `${dec(v)} s`), (v) => v <= METAS.segundosCierre,
      ultimoCierre ? 'último cierre generado' : 'se mide al generar el primer cierre'),

    m('Desviación entre el inventario y el conteo físico', `≤ ${METAS.desviacionConteoPct} %`,
      desviacion, (v) => `${dec(v)} %`, (v) => v <= METAS.desviacionConteoPct,
      conteos.length ? `promedio de los últimos ${conteos.length} conteos` : 'registre un conteo físico en Inventario'),

    m('Anticipación de la alerta de reorden', `≥ ${METAS.diasAnticipacion} días`,
      disparo, (v) => `${v.toFixed(0)} días`, (v) => v >= METAS.diasAnticipacion,
      `consumo de ${VENTANA_CONSUMO} días × (plazo de entrega + ${MARGEN_ALERTA} días) · ${enAlerta.length} alerta${enAlerta.length === 1 ? '' : 's'} vigente${enAlerta.length === 1 ? '' : 's'}` +
        (atrasadas ? `, ${atrasadas} ya por debajo del plazo de entrega` : '')),

    m('Agotamientos en los últimos 30 días', `≤ ${METAS.agotamientosPorMes} / mes`,
      agotamientos, (v) => v.toFixed(0), (v) => v <= METAS.agotamientosPorMes,
      'se cuenta cada vez que una venta deja un insumo en cero'),

    m('Órdenes de compra sugeridas por el sistema', `≥ ${METAS.ordenesDesdeSugerenciaPct} %`,
      ordenesTotal ? (ordenesSugeridas / ordenesTotal) * 100 : null, (v) => `${v.toFixed(0)} %`,
      (v) => v >= METAS.ordenesDesdeSugerenciaPct,
      ordenesTotal ? `${ordenesSugeridas} de ${ordenesTotal} órdenes` : 'genere una orden en Compras'),

    m('Equipo capacitado', '100 %',
      personas ? (capacitadas / personas) * 100 : null, (v) => `${v.toFixed(0)} %`, (v) => v >= 100,
      personas ? `${capacitadas} de ${personas} personas · se marca en Equipo` : 'aprueba cuentas en Equipo'),
  ];
}
