import { prisma } from '@/lib/db';
import { VENTANA_CONSUMO, LINEAS } from './constantes';
import { fechaCorta, fechaLarga, inicioDia } from '@/lib/formato';

export type PuntoDia = { etiqueta: string; etiquetaLarga: string; monto: number; unidades: number };
export type PuntoHora = { hora: number; etiqueta: string; monto: number; transacciones: number; pico: boolean };
export type PuntoTopping = { insumoId: string; nombre: string; adiciones: number; consumo: number; unidad: string; costo: number };
export type PuntoLinea = { linea: string; monto: number; unidades: number; participacion: number };

export type Reportes = {
  dias: PuntoDia[];
  horas: PuntoHora[];
  toppings: PuntoTopping[];
  lineas: PuntoLinea[];
  resumen: { total: number; transacciones: number; ticketPromedio: number; unidades: number; adiciones: number };
};

/**
 * Los reportes que el Excel de totales no podía producir: la venta
 * desagregada por día, por franja horaria, por línea de producto y por
 * adición. El granizado aparece con cifra propia aunque su máquina no
 * tenga contador: el registro lo mide igual.
 */
export async function reportes(ventanaDias = VENTANA_CONSUMO): Promise<Reportes> {
  const hoy = inicioDia();
  const corte = new Date(hoy.getTime() - (ventanaDias - 1) * 86_400_000);

  const [ventas, productos, toppings] = await Promise.all([
    prisma.venta.findMany({ where: { fechaHora: { gte: corte } }, include: { lineas: true } }),
    prisma.producto.findMany(),
    prisma.insumo.findMany({ where: { esTopping: true }, orderBy: { orden: 'asc' } }),
  ]);

  const productoPor = new Map(productos.map((p) => [p.id, p]));

  // Por día
  const porDia = new Map<number, { monto: number; unidades: number }>();
  // Por hora
  const porHora = new Map<number, { monto: number; transacciones: number }>();
  for (let h = 11; h <= 21; h++) porHora.set(h, { monto: 0, transacciones: 0 });
  // Por línea y por topping
  const porLinea = new Map<string, { monto: number; unidades: number }>();
  for (const l of LINEAS) porLinea.set(l, { monto: 0, unidades: 0 });
  const porTopping = new Map<string, number>();

  let unidades = 0;
  let adiciones = 0;

  for (const v of ventas) {
    const dia = Math.floor((inicioDia(v.fechaHora).getTime() - corte.getTime()) / 86_400_000);
    const d = porDia.get(dia) ?? { monto: 0, unidades: 0 };
    d.monto += v.total;

    const h = porHora.get(v.fechaHora.getHours()) ?? { monto: 0, transacciones: 0 };
    h.monto += v.total;
    h.transacciones += 1;
    porHora.set(v.fechaHora.getHours(), h);

    for (const l of v.lineas) {
      if (l.tipo === 'adicion' && l.insumoId) {
        adiciones += l.cantidad;
        porTopping.set(l.insumoId, (porTopping.get(l.insumoId) ?? 0) + l.cantidad);
        continue;
      }
      if (!l.productoId) continue;
      const p = productoPor.get(l.productoId);
      if (!p) continue;
      d.unidades += l.cantidad;
      unidades += l.cantidad;
      const li = porLinea.get(p.linea) ?? { monto: 0, unidades: 0 };
      li.monto += l.precioUnitario * l.cantidad;
      li.unidades += l.cantidad;
      porLinea.set(p.linea, li);
    }
    porDia.set(dia, d);
  }

  const dias: PuntoDia[] = [];
  for (let i = 0; i < ventanaDias; i++) {
    const fecha = new Date(corte.getTime() + i * 86_400_000);
    const d = porDia.get(i) ?? { monto: 0, unidades: 0 };
    dias.push({ etiqueta: fechaCorta(fecha), etiquetaLarga: fechaLarga(fecha), monto: d.monto, unidades: d.unidades });
  }

  const maxHora = Math.max(...[...porHora.values()].map((v) => v.monto));
  const horas: PuntoHora[] = [...porHora.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hora, v]) => ({
      hora,
      etiqueta: `${hora}:00 – ${hora + 1}:00`,
      monto: v.monto,
      transacciones: v.transacciones,
      pico: maxHora > 0 && v.monto === maxHora,
    }));

  const listaToppings: PuntoTopping[] = toppings
    .map((t) => {
      const n = porTopping.get(t.id) ?? 0;
      const consumo = n * (t.porcion ?? 0);
      return {
        insumoId: t.id,
        nombre: t.nombre,
        adiciones: n,
        consumo,
        unidad: t.unidad,
        costo: (consumo / t.contenido) * t.costoEmpaque,
      };
    })
    .sort((a, b) => b.adiciones - a.adiciones);

  const totalLineas = [...porLinea.values()].reduce((a, v) => a + v.monto, 0) || 1;
  const lineas: PuntoLinea[] = LINEAS.map((l) => {
    const v = porLinea.get(l)!;
    return { linea: l, monto: v.monto, unidades: v.unidades, participacion: (v.monto / totalLineas) * 100 };
  });

  const total = ventas.reduce((a, v) => a + v.total, 0);
  return {
    dias,
    horas,
    toppings: listaToppings,
    lineas,
    resumen: {
      total,
      transacciones: ventas.length,
      ticketPromedio: ventas.length ? total / ventas.length : 0,
      unidades,
      adiciones,
    },
  };
}
