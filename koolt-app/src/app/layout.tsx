import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Chivo, IBM_Plex_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import { Shell } from '@/components/Shell';
import { sesionActual } from '@/lib/sesion';
import { prisma } from '@/lib/db';
import { estadoInventario, alertas } from '@/dominio/inventario';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Chivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'KOOLT · Operación',
  description: 'Ventas, inventario y compras de KOOLT — Cajicá, Cundinamarca.',
};

// El subtítulo de Clerk usa el nombre interno de la instancia; aquí va el del local.
const localizacion = {
  ...esES,
  formFieldInputPlaceholder__signUpPassword: 'Cree una contraseña',
  signIn: { ...esES.signIn, start: { ...esES.signIn?.start, title: 'Ingresar a KOOLT', subtitle: 'Use la cuenta con la que lo registraron en el equipo' } },
  signUp: { ...esES.signUp, start: { ...esES.signUp?.start, title: 'Crear cuenta', subtitle: 'Para registrar ventas y operar el local' } },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1e1322' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  const admin = sesion?.habilitada && sesion.rol === 'admin';
  const [enAlerta, pendientes] = admin
    ? await Promise.all([
        estadoInventario().then((e) => alertas(e).length),
        prisma.usuario.count({ where: { clerkId: { not: null }, aprobado: false, activo: true } }),
      ])
    : [0, 0];

  return (
    <ClerkProvider
      localization={localizacion}
      signInUrl="/ingresar"
      signUpUrl="/registro"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#c2185b',
          colorForeground: '#1c1420',
          colorMutedForeground: '#5d5468',
          colorBackground: '#ffffff',
          colorInput: '#ffffff',
          colorBorder: '#d3cadd',
          colorRing: '#c2185b',
          colorDanger: '#b4291b',
          borderRadius: '10px',
          fontFamily: 'var(--font-body), system-ui, sans-serif',
        },
      }}
    >
      <html lang="es-CO" className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <body>
          {sesion?.habilitada ? (
            <Shell
              sesion={{ nombre: sesion.nombre, email: sesion.email, rol: sesion.rol }}
              enAlerta={enAlerta}
              pendientes={pendientes}
            >
              {children}
            </Shell>
          ) : (
            children
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
