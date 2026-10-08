import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { prisma } from '@/lib/db';

/** Edición de maestros: precio de un producto o mínimo de un insumo. */
export async function PATCH(req: Request) {
  return manejar(async () => {
    const { productoId, precio, insumoId, minimo } = await req.json();

    if (productoId) {
      const valor = Math.round(Number(precio));
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('El precio debe ser mayor que cero');
      await prisma.producto.update({ where: { id: productoId }, data: { precio: valor } });
      revalidatePath('/catalogo');
      revalidatePath('/venta');
      return { mensaje: 'Precio actualizado' };
    }

    if (insumoId) {
      const valor = Number(minimo);
      if (!Number.isFinite(valor) || valor < 0) throw new Error('El mínimo no puede ser negativo');
      await prisma.insumo.update({ where: { id: insumoId }, data: { minimo: valor } });
      revalidatePath('/catalogo');
      revalidatePath('/inventario');
      return { mensaje: 'Mínimo actualizado' };
    }

    throw new Error('Nada que actualizar');
  });
}
