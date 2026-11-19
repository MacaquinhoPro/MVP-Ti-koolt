import { redirect } from 'next/navigation';
import { sesionActual, type Sesion } from './sesion';

/**
 * Ocultar un módulo del menú no es una restricción: cualquiera podría escribir
 * la URL. La sesión y el rol se verifican en el servidor, antes de leer un
 * solo dato.
 */
export async function exigirSesion(): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect('/ingresar');
  if (!s.habilitada) redirect('/pendiente');
  return s;
}

export async function exigirAdmin(): Promise<Sesion> {
  const s = await exigirSesion();
  if (s.rol !== 'admin') redirect('/venta');
  return s;
}
