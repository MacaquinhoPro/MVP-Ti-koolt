import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './db';

export type Rol = 'admin' | 'mostrador';

export type Sesion = {
  id: string;
  nombre: string;
  email: string | null;
  rol: Rol;
  estado: 'activa' | 'pendiente' | 'desactivada';
  /** Aprobada por un administrador y no desactivada: puede operar. */
  habilitada: boolean;
};

/**
 * Correos que entran como administradores sin esperar aprobación. Si no se
 * define, la primera cuenta que se registra queda como administradora.
 */
function correosAdmin() {
  return (process.env.KOOLT_ADMIN_EMAILS ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Persona que tiene la sesión abierta, o null si nadie la tiene. La primera
 * vez que una cuenta de Clerk entra se crea su registro: como administradora
 * si es la primera o está en KOOLT_ADMIN_EMAILS, y si no, como mostrador
 * pendiente de aprobación.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const u = (await prisma.usuario.findUnique({ where: { clerkId: userId } })) ?? (await registrar(userId));
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol === 'admin' ? 'admin' : 'mostrador',
    estado: !u.activo ? 'desactivada' : u.aprobado ? 'activa' : 'pendiente',
    habilitada: u.aprobado && u.activo,
  };
});

async function registrar(clerkId: string) {
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const nombre =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(' ') || cu?.username || email?.split('@')[0] || 'Sin nombre';

  try {
    return await prisma.$transaction(
      async (tx) => {
        const lista = correosAdmin();
        const hayAdmin = await tx.usuario.count({
          where: { clerkId: { not: null }, rol: 'admin', aprobado: true, activo: true },
        });
        const esAdmin = email != null && lista.includes(email) ? true : lista.length === 0 && hayAdmin === 0;
        return tx.usuario.create({
          data: { clerkId, email, nombre, rol: esAdmin ? 'admin' : 'mostrador', aprobado: esAdmin },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (e) {
    // Dos peticiones simultáneas de la misma cuenta nueva: la otra ya la creó.
    const existente = await prisma.usuario.findUnique({ where: { clerkId } });
    if (existente) return existente;
    throw e;
  }
}

/** Rol de la sesión, para las vistas que solo necesitan saber qué mostrar. */
export async function rolActual(): Promise<Rol> {
  return (await sesionActual())?.rol ?? 'mostrador';
}
