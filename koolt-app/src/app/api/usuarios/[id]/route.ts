import { revalidatePath } from 'next/cache';
import { manejar } from '@/lib/api';
import { prisma } from '@/lib/db';

/**
 * Administración del equipo: aprobar una cuenta nueva, cambiar su rol,
 * desactivarla o marcarla como capacitada. Nadie puede quitarse el acceso a sí
 * mismo ni dejar el local sin un administrador habilitado.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar('admin', async (sesion) => {
    const { id } = await params;
    const cuerpo = await req.json();
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u || !u.clerkId) throw new Error('Esa persona no tiene cuenta de acceso');

    const data: { rol?: string; aprobado?: boolean; activo?: boolean; capacitado?: boolean } = {};
    if (cuerpo.rol === 'admin' || cuerpo.rol === 'mostrador') data.rol = cuerpo.rol;
    if (typeof cuerpo.aprobado === 'boolean') data.aprobado = cuerpo.aprobado;
    if (typeof cuerpo.activo === 'boolean') data.activo = cuerpo.activo;
    if (typeof cuerpo.capacitado === 'boolean') data.capacitado = cuerpo.capacitado;

    const pierdeAdmin =
      u.rol === 'admin' && u.aprobado && u.activo &&
      (data.rol === 'mostrador' || data.activo === false || data.aprobado === false);
    if (pierdeAdmin) {
      if (u.id === sesion.id) throw new Error('No puede quitarse a sí mismo el rol de administración ni el acceso');
      const otros = await prisma.usuario.count({
        where: { id: { not: u.id }, clerkId: { not: null }, rol: 'admin', aprobado: true, activo: true },
      });
      if (!otros) throw new Error('El local debe conservar al menos un administrador habilitado');
    }

    const n = await prisma.usuario.update({ where: { id }, data });
    revalidatePath('/equipo');
    revalidatePath('/metricas');

    if (data.aprobado && !u.aprobado) return { mensaje: `${n.nombre} ya puede ingresar como ${n.rol === 'admin' ? 'administración' : 'mostrador'}` };
    if (data.activo === false) return { mensaje: `${n.nombre} ya no tiene acceso` };
    if (data.activo === true && !u.activo) return { mensaje: `${n.nombre} recuperó el acceso` };
    if (data.rol && data.rol !== u.rol) return { mensaje: `${n.nombre} ahora es ${n.rol === 'admin' ? 'administración' : 'mostrador'}` };
    if ('capacitado' in data) return { mensaje: `${n.nombre}: ${n.capacitado ? 'capacitación completa' : 'capacitación pendiente'}` };
    return { mensaje: 'Sin cambios' };
  });
}
