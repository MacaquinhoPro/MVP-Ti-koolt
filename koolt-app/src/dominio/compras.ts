import { prisma } from '@/lib/db';
import { estadoInventario, alertas, sugerencia, type Sugerencia } from './inventario';

export type SugerenciaAgrupada = {
  proveedor: string;
  costo: number;
  items: {
    insumoId: string;
    nombre: string;
    empaque: string;
    unidad: string;
    cobertura: number;
    estado: string;
    sugerencia: Sugerencia;
  }[];
};

/**
 * Sugerencias de compra agrupadas por proveedor: así una sola orden cubre
 * todo lo que llega en el mismo viaje a Bogotá, que es lo que evita el viaje
 * adicional de urgencia de ~$400.000 del diagnóstico.
 */
export async function sugerenciasDeCompra(): Promise<SugerenciaAgrupada[]> {
  const estados = await estadoInventario();
  const grupos = new Map<string, SugerenciaAgrupada>();

  for (const e of alertas(estados)) {
    const s = sugerencia(e);
    if (!s) continue;
    const g = grupos.get(e.insumo.proveedor) ?? { proveedor: e.insumo.proveedor, costo: 0, items: [] };
    g.items.push({
      insumoId: e.insumo.id,
      nombre: e.insumo.nombre,
      empaque: e.insumo.empaque,
      unidad: e.insumo.unidad,
      cobertura: e.cobertura,
      estado: e.estado,
      sugerencia: s,
    });
    g.costo += s.costo;
    grupos.set(e.insumo.proveedor, g);
  }

  return [...grupos.values()].sort((a, b) => b.costo - a.costo);
}

export async function crearOrden(input: {
  lineas: { insumoId: string; empaques: number }[];
  origen: 'sugerencia' | 'manual';
}) {
  if (!input.lineas.length) throw new Error('La orden no tiene líneas');

  const insumos = await prisma.insumo.findMany({
    where: { id: { in: input.lineas.map((l) => l.insumoId) } },
  });
  const por = new Map(insumos.map((i) => [i.id, i]));

  const lineas = input.lineas.map((l) => {
    const i = por.get(l.insumoId);
    if (!i) throw new Error(`Insumo desconocido: ${l.insumoId}`);
    const empaques = Math.max(1, Math.round(l.empaques));
    return { insumoId: i.id, empaques, cantidad: empaques * i.contenido, costo: empaques * i.costoEmpaque };
  });

  const proveedores = new Set(lineas.map((l) => por.get(l.insumoId)!.proveedor));
  const total = await prisma.ordenCompra.count();

  return prisma.ordenCompra.create({
    data: {
      codigo: 'OC-' + String(total + 1).padStart(3, '0'),
      proveedor: proveedores.size === 1 ? [...proveedores][0] : 'Varios proveedores',
      origen: input.origen,
      estado: 'enviada',
      lineas: { create: lineas },
    },
    include: { lineas: true },
  });
}

/** La recepción es lo que mueve el inventario, no la creación de la orden. */
export async function recibirOrden(ordenId: string) {
  const orden = await prisma.ordenCompra.findUnique({ where: { id: ordenId }, include: { lineas: true } });
  if (!orden) throw new Error('Orden no encontrada');
  if (orden.estado === 'recibida') throw new Error('La orden ya fue recibida');

  return prisma.$transaction(async (tx) => {
    for (const l of orden.lineas) {
      const insumo = await tx.insumo.findUniqueOrThrow({ where: { id: l.insumoId } });
      await tx.insumo.update({ where: { id: l.insumoId }, data: { stock: insumo.stock + l.cantidad } });
      await tx.movimiento.create({
        data: { insumoId: l.insumoId, tipo: 'entrada', cantidad: l.cantidad, referencia: orden.codigo },
      });
    }
    return tx.ordenCompra.update({
      where: { id: ordenId },
      data: { estado: 'recibida', recibida: new Date() },
    });
  });
}

export function ordenes(limite = 25) {
  return prisma.ordenCompra.findMany({
    orderBy: { creada: 'desc' },
    take: limite,
    include: { lineas: { include: { insumo: { select: { nombre: true, unidad: true } } } } },
  });
}
