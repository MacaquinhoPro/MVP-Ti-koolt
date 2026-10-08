import { prisma } from '@/lib/db';

/** Entrada por reposición, merma por vencimiento o ajuste manual. */
export async function registrarMovimiento(input: {
  insumoId: string;
  tipo: 'entrada' | 'merma' | 'ajuste';
  cantidad: number;
  nota?: string;
}) {
  if (!(input.cantidad > 0)) throw new Error('La cantidad debe ser mayor que cero');
  const insumo = await prisma.insumo.findUniqueOrThrow({ where: { id: input.insumoId } });
  const delta = input.tipo === 'entrada' ? input.cantidad : -input.cantidad;
  const nuevo = Math.max(0, insumo.stock + delta);

  const [, mov] = await prisma.$transaction([
    prisma.insumo.update({ where: { id: insumo.id }, data: { stock: nuevo } }),
    prisma.movimiento.create({
      data: {
        insumoId: insumo.id,
        tipo: input.tipo,
        cantidad: delta,
        referencia: input.nota?.trim() || (input.tipo === 'entrada' ? 'reposición desde bodega' : 'sin nota'),
      },
    }),
  ]);
  return { movimiento: mov, stock: nuevo, insumo };
}

/**
 * Conteo físico. No corrige el stock en silencio: ajusta el saldo y deja un
 * movimiento con la desviación encontrada, que es lo que mide el objetivo OE3
 * (≤ 5 % por ingrediente en el conteo de cierre del piloto).
 */
export async function registrarConteo(input: { insumoId: string; conteoFisico: number }) {
  if (!(input.conteoFisico >= 0)) throw new Error('El conteo no puede ser negativo');
  const insumo = await prisma.insumo.findUniqueOrThrow({ where: { id: input.insumoId } });
  const sistema = insumo.stock;
  const desviacionPct = sistema > 0 ? ((input.conteoFisico - sistema) / sistema) * 100 : input.conteoFisico > 0 ? 100 : 0;

  const [, , conteo] = await prisma.$transaction([
    prisma.insumo.update({ where: { id: insumo.id }, data: { stock: input.conteoFisico } }),
    prisma.movimiento.create({
      data: {
        insumoId: insumo.id,
        tipo: 'conteo',
        cantidad: input.conteoFisico - sistema,
        referencia: `desviación ${desviacionPct.toFixed(1).replace('.', ',')} %`,
      },
    }),
    prisma.conteo.create({
      data: { insumoId: insumo.id, segunSistema: sistema, conteoFisico: input.conteoFisico, desviacionPct },
    }),
  ]);
  return { conteo, insumo, desviacionPct };
}

export function movimientosRecientes(limite = 15) {
  return prisma.movimiento.findMany({
    orderBy: { fechaHora: 'desc' },
    take: limite,
    include: { insumo: { select: { nombre: true, unidad: true } } },
  });
}

export function conteosRecientes(limite = 8) {
  return prisma.conteo.findMany({
    orderBy: { fechaHora: 'desc' },
    take: limite,
    include: { insumo: { select: { nombre: true, unidad: true } } },
  });
}
