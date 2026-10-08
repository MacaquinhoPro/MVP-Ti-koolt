import { prisma } from '@/lib/db';
import { inicioDia } from '@/lib/formato';

export type ResumenDia = {
  fecha: Date;
  transacciones: number;
  total: number;
  unidadesHelado: number;
  unidadesGranizado: number;
  adiciones: number;
  porProducto: { id: string; nombre: string; tamano: string; unidades: number; monto: number }[];
  porMedioPago: { medio: string; transacciones: number; monto: number }[];
};

export async function resumenDelDia(fecha = inicioDia()): Promise<ResumenDia> {
  const hasta = new Date(fecha.getTime() + 86_400_000);
  const [ventas, productos] = await Promise.all([
    prisma.venta.findMany({
      where: { fechaHora: { gte: fecha, lt: hasta } },
      include: { lineas: true },
    }),
    prisma.producto.findMany({ orderBy: { orden: 'asc' } }),
  ]);

  const lineaDe = new Map(productos.map((p) => [p.id, p.linea]));
  const acumulado = new Map<string, { unidades: number; monto: number }>();
  let unidadesHelado = 0;
  let unidadesGranizado = 0;
  let adiciones = 0;
  const pagos = new Map<string, { transacciones: number; monto: number }>();

  for (const v of ventas) {
    const p = pagos.get(v.medioPago) ?? { transacciones: 0, monto: 0 };
    pagos.set(v.medioPago, { transacciones: p.transacciones + 1, monto: p.monto + v.total });

    for (const l of v.lineas) {
      if (l.tipo === 'adicion') {
        adiciones += l.cantidad;
        continue;
      }
      if (!l.productoId) continue;
      const a = acumulado.get(l.productoId) ?? { unidades: 0, monto: 0 };
      acumulado.set(l.productoId, {
        unidades: a.unidades + l.cantidad,
        monto: a.monto + l.precioUnitario * l.cantidad,
      });
      if (lineaDe.get(l.productoId) === 'Granizado') unidadesGranizado += l.cantidad;
      else unidadesHelado += l.cantidad;
    }
  }

  return {
    fecha,
    transacciones: ventas.length,
    total: ventas.reduce((a, v) => a + v.total, 0),
    unidadesHelado,
    unidadesGranizado,
    adiciones,
    porProducto: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      tamano: p.tamano,
      unidades: acumulado.get(p.id)?.unidades ?? 0,
      monto: acumulado.get(p.id)?.monto ?? 0,
    })),
    porMedioPago: [...pagos.entries()].map(([medio, v]) => ({ medio, ...v })),
  };
}

/**
 * Consolida el día y lo guarda. El contador de la máquina de helados es
 * opcional y entra a mano: los equipos no exponen interfaz de conexión, así
 * que se usa como control cruzado y nunca como fuente del dato.
 *
 * La diferencia contra el contador expone lo que el total de ventas no puede
 * explicar por sí solo: merma, calibración y consumo interno.
 */
export async function generarCierre(contadorMaquina: number | null, fecha = inicioDia()) {
  const t0 = performance.now();
  const r = await resumenDelDia(fecha);
  const diferencia = contadorMaquina == null ? null : r.unidadesHelado - contadorMaquina;
  const generadoEnMs = Math.max(1, Math.round(performance.now() - t0));

  const datos = {
    transacciones: r.transacciones,
    total: r.total,
    unidadesHelado: r.unidadesHelado,
    unidadesGranizado: r.unidadesGranizado,
    contadorMaquina,
    diferencia,
    generadoEnMs,
    demo: false,
  };

  return prisma.cierreDiario.upsert({
    where: { fecha },
    create: { fecha, ...datos },
    update: datos,
  });
}

export function cierresRecientes(limite = 20) {
  return prisma.cierreDiario.findMany({ orderBy: { fecha: 'desc' }, take: limite });
}
