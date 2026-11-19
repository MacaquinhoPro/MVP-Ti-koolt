import type { ReactNode } from 'react';
import { LogoKoolt } from './iconos';

/** Marco de las pantallas de acceso: la marca a un lado, la tarea al otro. */
export function Acceso({ children }: { children: ReactNode }) {
  return (
    <div className="acceso">
      <aside className="acceso-marca">
        <div className="brand">
          <LogoKoolt className="brand-mk" />
          <div className="brand-tx">
            <strong>KOOLT</strong>
            <span>Cajicá</span>
          </div>
        </div>
        <div className="acceso-lema">
          <h1>Ventas, inventario y compras en un solo lugar.</h1>
          <p>
            Cada venta descuenta los ingredientes por receta, avisa antes de que algo se agote y deja el cierre del día
            listo sin papel.
          </p>
        </div>
        <p className="acceso-pie">Heladería de yogurt y granizados · Cajicá, Cundinamarca</p>
      </aside>
      <main className="acceso-tarea">{children}</main>
    </div>
  );
}
