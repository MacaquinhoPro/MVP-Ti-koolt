import { cookies } from 'next/headers';

export type Rol = 'admin' | 'mostrador';

const COOKIE = 'koolt_rol';

/**
 * Sesión mínima del proceso 9 del alcance: dos perfiles, mostrador y
 * administrador. En producción esto se reemplaza por autenticación real;
 * la frontera —qué puede ver y hacer cada rol— ya queda aquí.
 */
export async function rolActual(): Promise<Rol> {
  const c = await cookies();
  return c.get(COOKIE)?.value === 'mostrador' ? 'mostrador' : 'admin';
}

export const COOKIE_ROL = COOKIE;

export const USUARIO_POR_ROL: Record<Rol, string> = {
  admin: 'u-seb',
  mostrador: 'u-cam',
};
