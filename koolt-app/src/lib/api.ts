import { NextResponse } from 'next/server';

/**
 * Envoltorio común de las rutas: deja el manejo de errores en un solo lugar y
 * garantiza que el cliente siempre reciba JSON con una forma conocida.
 */
export async function manejar<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json({ ok: true, datos: await fn() });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado';
    console.error('[api]', mensaje);
    return NextResponse.json({ ok: false, error: mensaje }, { status: 400 });
  }
}
