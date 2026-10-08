'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Rol } from '@/lib/sesion';
import {
  IconoVenta, IconoCierre, IconoInventario, IconoCompras,
  IconoAnalitica, IconoMetricas, IconoCatalogo, LogoKoolt,
} from './iconos';

type Modulo = {
  href: string;
  titulo: string;
  grupo: string;
  soloAdmin: boolean;
  Icono: (p: { className?: string }) => React.ReactNode;
};

export const MODULOS: Modulo[] = [
  { href: '/venta', titulo: 'Venta', grupo: 'Operación diaria', soloAdmin: false, Icono: IconoVenta },
  { href: '/cierre', titulo: 'Cierre diario', grupo: 'Operación diaria', soloAdmin: false, Icono: IconoCierre },
  { href: '/inventario', titulo: 'Inventario', grupo: 'Abastecimiento', soloAdmin: true, Icono: IconoInventario },
  { href: '/compras', titulo: 'Compras', grupo: 'Abastecimiento', soloAdmin: true, Icono: IconoCompras },
  { href: '/analitica', titulo: 'Analítica', grupo: 'Información', soloAdmin: true, Icono: IconoAnalitica },
  { href: '/metricas', titulo: 'Métricas del piloto', grupo: 'Información', soloAdmin: true, Icono: IconoMetricas },
  { href: '/catalogo', titulo: 'Catálogo y recetas', grupo: 'Maestros', soloAdmin: true, Icono: IconoCatalogo },
];

export function Shell({ rol, enAlerta, children }: { rol: Rol; enAlerta: number; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [cambiando, iniciar] = useTransition();

  const visibles = MODULOS.filter((m) => rol === 'admin' || !m.soloAdmin);
  const grupos = [...new Set(visibles.map((m) => m.grupo))];

  function cambiarRol(nuevo: string) {
    iniciar(async () => {
      await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rol: nuevo }),
      });
      if (nuevo === 'mostrador' && MODULOS.find((m) => m.href === path)?.soloAdmin) router.push('/venta');
      router.refresh();
    });
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <LogoKoolt className="brand-mk" />
          <div className="brand-tx">
            <strong>KOOLT</strong>
            <span>Cajicá · sede única</span>
          </div>
        </div>

        <nav className="nav" aria-label="Módulos">
          {grupos.map((g) => (
            <div key={g}>
              <div className="nav-g eyebrow">{g}</div>
              {visibles
                .filter((m) => m.grupo === g)
                .map(({ href, titulo, Icono }) => (
                  <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
                    <Icono className="ni" />
                    {titulo}
                    {href === '/inventario' && enAlerta > 0 && <span className="nav-badge">{enAlerta}</span>}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        <div className="rail-foot">
          <div>
            <label className="fl" htmlFor="rol">Sesión</label>
            <select id="rol" value={rol} disabled={cambiando} onChange={(e) => cambiarRol(e.target.value)}>
              <option value="admin">Sebastián · administrador</option>
              <option value="mostrador">Mostrador · turno</option>
            </select>
          </div>
          <div className="sync">
            <span className="dot" />
            <span>SQLite local · {process.env.NODE_ENV === 'production' ? 'producción' : 'desarrollo'}</span>
          </div>
        </div>
      </aside>

      <div className="mobile-nav">
        <div className="mn-top">
          <LogoKoolt className="brand-mk" />
          <strong style={{ fontFamily: 'var(--fd)', fontSize: 16 }}>KOOLT</strong>
          <select
            value={rol}
            disabled={cambiando}
            onChange={(e) => cambiarRol(e.target.value)}
            style={{ width: 'auto', marginLeft: 'auto', fontSize: 12, padding: '5px 7px' }}
            aria-label="Sesión"
          >
            <option value="admin">Administrador</option>
            <option value="mostrador">Mostrador</option>
          </select>
        </div>
        <div className="mn-scroll">
          {visibles.map((m) => (
            <Link key={m.href} href={m.href} aria-current={path === m.href ? 'page' : undefined}>
              {m.titulo}
            </Link>
          ))}
        </div>
      </div>

      <main className="main">{children}</main>
    </div>
  );
}
