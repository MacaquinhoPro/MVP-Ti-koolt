import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { Acceso } from '@/components/Acceso';

export const metadata: Metadata = { title: 'Crear cuenta · KOOLT' };

export default function PaginaRegistro() {
  return (
    <Acceso>
      <div className="acceso-col">
        <SignUp path="/registro" routing="path" signInUrl="/ingresar" />
        <p className="acceso-nota">
          Las cuentas nuevas quedan pendientes hasta que la administración las aprueba y les asigna un rol.
        </p>
      </div>
    </Acceso>
  );
}
