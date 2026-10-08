import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { crearOrden } from '@/dominio/compras';

export async function POST(req: Request) {
  return manejar(async () => {
    const { lineas, origen } = await req.json();
    const o = await crearOrden({
      lineas,
      origen: origen === 'manual' ? 'manual' : 'sugerencia',
    });
    revalidatePath('/compras');
    revalidatePath('/metricas');
    return {
      codigo: o.codigo,
      mensaje:
        `Orden ${o.codigo} creada con ${o.lineas.length} ` +
        `${o.lineas.length === 1 ? 'línea' : 'líneas'} · registre la recepción cuando llegue`,
    };
  });
}
