import { NextResponse } from 'next/server';
import { sesionActual, type Sesion } from './sesion';

/** Quién puede llamar una ruta: cualquier persona habilitada o solo administración. */
export type Permiso = 'equipo' | 'admin';

class ErrorAcceso extends Error {
  constructor(mensaje: string, readonly status: number) {
    super(mensaje);
  }
}

/** Verifica la sesión de una ruta de la API; lanza un error con su código HTTP. */
export async function verificar(permiso: Permiso): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) throw new ErrorAcceso('Inicie sesión para continuar', 401);
  if (!s.habilitada) throw new ErrorAcceso('Su cuenta todavía no está aprobada', 403);
  if (permiso === 'admin' && s.rol !== 'admin') throw new ErrorAcceso('Esta acción es solo para administración', 403);
  return s;
}

/**
 * Envoltorio común de las rutas: verifica el permiso, deja el manejo de errores
 * en un solo lugar y garantiza que el cliente siempre reciba JSON con una forma
 * conocida.
 */
export async function manejar<T>(permiso: Permiso, fn: (sesion: Sesion) => Promise<T>) {
  try {
    const sesion = await verificar(permiso);
    return NextResponse.json({ ok: true, datos: await fn(sesion) });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado';
    const status = e instanceof ErrorAcceso ? e.status : 400;
    if (status === 400) console.error('[api]', mensaje);
    return NextResponse.json({ ok: false, error: mensaje }, { status });
  }
}
