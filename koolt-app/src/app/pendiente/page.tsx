import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import { sesionActual } from '@/lib/sesion';
import { Acceso } from '@/components/Acceso';

export const metadata: Metadata = { title: 'Cuenta pendiente · KOOLT' };
export const dynamic = 'force-dynamic';

export default async function PaginaPendiente() {
  const s = await sesionActual();
  if (!s) redirect('/ingresar');
  if (s.habilitada) redirect('/');

  const desactivada = s.estado === 'desactivada';
  return (
    <Acceso>
      <div className="espera">
        <span className={`espera-ic${desactivada ? ' off' : ''}`} aria-hidden />
        <h2>{desactivada ? 'Cuenta desactivada' : 'Su cuenta está en revisión'}</h2>
        <p>
          {desactivada
            ? 'La administración desactivó el acceso de esta cuenta. Si cree que es un error, hable con la persona a cargo del local.'
            : 'La administración de KOOLT tiene que aprobarla y asignarle un rol antes de que pueda registrar ventas o ver información del negocio. Vuelva a entrar cuando se lo confirmen.'}
        </p>
        <dl className="espera-dato">
          <dt>Cuenta</dt>
          <dd>{s.email ?? s.nombre}</dd>
        </dl>
        <SignOutButton redirectUrl="/ingresar">
          <button className="btn">Cerrar sesión</button>
        </SignOutButton>
      </div>
    </Acceso>
  );
}
