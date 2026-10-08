import { redirect } from 'next/navigation';
import { rolActual } from './sesion';

/**
 * Frontera del proceso 9 del alcance. Ocultar el módulo del menú no es una
 * restricción: cualquiera podría escribir la URL. El rol se verifica en el
 * servidor, antes de leer un solo dato.
 */
export async function exigirAdmin() {
  if ((await rolActual()) !== 'admin') redirect('/venta');
}
