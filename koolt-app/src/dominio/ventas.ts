import { prisma } from '@/lib/db';
import { folio as fmtFolio } from '@/lib/formato';

export type LineaEntrada =
  | { tipo: 'producto'; productoId: string; cantidad: number }
  | { tipo: 'adicion'; insumoId: string; cantidad: number };

export type ResultadoVenta = {
  id: string;
  folio: number;
  folioTexto: string;
  total: number;
  duracionMs: number;
  insumosDescontados: number;
  agotados: string[];
};

/**
 * Registra una venta en una sola transacción: inserta la venta y sus líneas,
 * explota la receta, descuenta el inventario y deja un asiento por insumo.
 *
 * Es el paso que no existe hoy: el inventario se mueve en el mismo instante
 * que la venta, no en una revisión visual posterior. Si el descuento falla,
 * la venta no queda registrada a medias.
 */
export async function registrarVenta(input: {
  lineas: LineaEntrada[];
  medioPago: string;
  usuarioId: string;
  duracionMs?: number;
}): Promise<ResultadoVenta> {
  if (!input.lineas.length) throw new Error('La venta no tiene líneas');

  const [productos, insumos, recetas] = await Promise.all([
    prisma.producto.findMany(),
    prisma.insumo.findMany(),
    prisma.receta.findMany(),
  ]);
  const productoPor = new Map(productos.map((p) => [p.id, p]));
  const insumoPor = new Map(insumos.map((i) => [i.id, i]));

  const recetaPor = new Map<string, { insumoId: string; cantidad: number }[]>();
  for (const r of recetas) {
    const l = recetaPor.get(r.productoId) ?? [];
    l.push({ insumoId: r.insumoId, cantidad: r.cantidad });
    recetaPor.set(r.productoId, l);
  }

  // Precios y consumo se resuelven en el servidor: el cliente no los decide.
  const lineas = input.lineas.map((l) => {
    if (l.tipo === 'producto') {
      const p = productoPor.get(l.productoId);
      if (!p) throw new Error(`Producto desconocido: ${l.productoId}`);
      return { tipo: 'producto' as const, productoId: p.id, insumoId: null, cantidad: l.cantidad, precioUnitario: p.precio };
    }
    const i = insumoPor.get(l.insumoId);
    if (!i || !i.esTopping || i.precioAdicion == null) throw new Error(`Adición desconocida: ${l.insumoId}`);
    return { tipo: 'adicion' as const, productoId: null, insumoId: i.id, cantidad: l.cantidad, precioUnitario: i.precioAdicion };
  });

  const total = lineas.reduce((a, l) => a + l.precioUnitario * l.cantidad, 0);

  const consumo = new Map<string, number>();
  const sumar = (id: string, v: number) => consumo.set(id, (consumo.get(id) ?? 0) + v);
  for (const l of lineas) {
    if (l.tipo === 'producto' && l.productoId) {
      for (const ing of recetaPor.get(l.productoId) ?? []) sumar(ing.insumoId, ing.cantidad * l.cantidad);
    } else if (l.insumoId) {
      sumar(l.insumoId, (insumoPor.get(l.insumoId)?.porcion ?? 0) * l.cantidad);
    }
  }

  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.venta.aggregate({ _max: { folio: true } });
    const folio = (ultimo._max.folio ?? 0) + 1;
    const folioTexto = fmtFolio(folio);

    const venta = await tx.venta.create({
      data: {
        folio,
        usuarioId: input.usuarioId,
        medioPago: input.medioPago,
        total,
        duracionMs: Math.max(0, Math.round(input.duracionMs ?? 0)),
        lineas: { create: lineas },
      },
    });

    const agotados: string[] = [];
    for (const [insumoId, usado] of consumo) {
      const actual = insumoPor.get(insumoId)!;
      const nuevo = Math.max(0, actual.stock - usado);
      await tx.insumo.update({ where: { id: insumoId }, data: { stock: nuevo } });
      await tx.movimiento.create({
        data: { insumoId, tipo: 'venta', cantidad: -usado, referencia: folioTexto },
      });
      if (actual.stock > 0 && nuevo <= 0) {
        agotados.push(actual.nombre);
        await tx.eventoAgotamiento.create({ data: { insumoId, referencia: folioTexto } });
      }
    }

    return {
      id: venta.id,
      folio,
      folioTexto,
      total,
      duracionMs: venta.duracionMs,
      insumosDescontados: consumo.size,
      agotados,
    };
  });
}
