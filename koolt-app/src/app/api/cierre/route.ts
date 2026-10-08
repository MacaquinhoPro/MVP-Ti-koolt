import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { generarCierre } from '@/dominio/cierre';
import { duracion, fechaLarga } from '@/lib/formato';

export async function POST(req: Request) {
  return manejar(async () => {
    const { contadorMaquina } = await req.json();
    const valor =
      contadorMaquina === null || contadorMaquina === '' || contadorMaquina === undefined
        ? null
        : Math.round(Number(contadorMaquina));
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) throw new Error('El contador debe ser un número positivo');

    const c = await generarCierre(valor);
    revalidatePath('/cierre');
    revalidatePath('/metricas');
    return {
      mensaje:
        `Cierre de ${fechaLarga(c.fecha)} generado en ${duracion(c.generadoEnMs)}` +
        (c.diferencia == null ? '' : ` · diferencia de ${c.diferencia} unidades contra el contador`),
    };
  });
}
