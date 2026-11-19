import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { Acceso } from '@/components/Acceso';

export const metadata: Metadata = { title: 'Ingresar · KOOLT' };

export default function PaginaIngresar() {
  return (
    <Acceso>
      <SignIn path="/ingresar" routing="path" signUpUrl="/registro" />
    </Acceso>
  );
}
