import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { registrarVenta, type LineaEntrada } from '@/dominio/ventas';
import { rolActual, USUARIO_POR_ROL } from '@/lib/sesion';
import { MEDIOS_PAGO } from '@/dominio/constantes';

export async function POST(req: Request) {
  return manejar(async () => {
    const cuerpo = await req.json();
    const lineas = cuerpo.lineas as LineaEntrada[];
    if (!Array.isArray(lineas) || !lineas.length) throw new Error('La venta no tiene líneas');
    const medioPago = MEDIOS_PAGO.includes(cuerpo.medioPago) ? cuerpo.medioPago : MEDIOS_PAGO[0];

    const rol = await rolActual();
    const resultado = await registrarVenta({
      lineas,
      medioPago,
      usuarioId: USUARIO_POR_ROL[rol],
      duracionMs: Number(cuerpo.duracionMs) || 0,
    });

    revalidatePath('/venta');
    revalidatePath('/cierre');
    revalidatePath('/inventario');
    return resultado;
  });
}
