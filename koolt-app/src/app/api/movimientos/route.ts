import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { registrarMovimiento } from '@/dominio/movimientos';
import { cantidad as fmtCantidad } from '@/lib/formato';

export async function POST(req: Request) {
  return manejar(async () => {
    const { insumoId, tipo, cantidad, nota } = await req.json();
    if (!['entrada', 'merma', 'ajuste'].includes(tipo)) throw new Error('Tipo de movimiento no válido');

    const r = await registrarMovimiento({ insumoId, tipo, cantidad: Number(cantidad), nota });
    revalidatePath('/inventario');
    revalidatePath('/compras');

    const etiqueta = { entrada: 'Entrada', merma: 'Merma', ajuste: 'Ajuste' }[tipo as 'entrada'];
    return {
      mensaje: `${etiqueta} de ${fmtCantidad(Number(cantidad), r.insumo.unidad)} en ${r.insumo.nombre} · stock ahora ${fmtCantidad(r.stock, r.insumo.unidad)}`,
    };
  });
}
