import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { prisma } from '@/lib/db';

/** Marca a una persona como capacitada: es la base del indicador OE8. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const { id } = await params;
    const { capacitado } = await req.json();
    const u = await prisma.usuario.update({ where: { id }, data: { capacitado: !!capacitado } });
    revalidatePath('/metricas');
    return { mensaje: `${u.nombre}: ${u.capacitado ? 'capacitado' : 'pendiente de capacitación'}` };
  });
}
