import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { registrarConteo } from '@/dominio/movimientos';
import { dec } from '@/lib/formato';

export async function POST(req: Request) {
  return manejar(async () => {
    const { insumoId, conteoFisico } = await req.json();
    const r = await registrarConteo({ insumoId, conteoFisico: Number(conteoFisico) });
    revalidatePath('/inventario');
    revalidatePath('/metricas');
    return {
      mensaje: `Conteo de ${r.insumo.nombre} registrado · desviación de ${dec(r.desviacionPct)} % frente al sistema`,
    };
  });
}
