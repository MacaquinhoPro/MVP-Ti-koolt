import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { recibirOrden } from '@/dominio/compras';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const { id } = await params;
    const o = await recibirOrden(id);
    revalidatePath('/compras');
    revalidatePath('/inventario');
    return { mensaje: `Recepción de ${o.codigo} registrada · el inventario ya quedó actualizado` };
  });
}
