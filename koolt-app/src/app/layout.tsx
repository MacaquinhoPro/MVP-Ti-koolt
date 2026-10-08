import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Chivo, IBM_Plex_Mono } from 'next/font/google';
import { Shell } from '@/components/Shell';
import { rolActual } from '@/lib/sesion';
import { estadoInventario, alertas } from '@/dominio/inventario';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Chivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'KOOLT · Operación',
  description: 'Registro de ventas, control de inventario y gestión de compras de KOOLT — Cajicá, Cundinamarca.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c2185b' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const rol = await rolActual();
  const enAlerta = rol === 'admin' ? alertas(await estadoInventario()).length : 0;

  return (
    <html lang="es-CO">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <Shell rol={rol} enAlerta={enAlerta}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
