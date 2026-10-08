import type { ReactNode } from 'react';
import { IconoInfo, IconoCampana } from './iconos';
import type { EstadoInsumo } from '@/dominio/constantes';

export function Encabezado({ eyebrow, titulo, sub, acciones }: { eyebrow: string; titulo: string; sub: string; acciones?: ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{titulo}</h1>
        <p className="sub">{sub}</p>
      </div>
      {acciones && <div className="topbar-r">{acciones}</div>}
    </div>
  );
}

export function Kpi({ k, v, f, acento }: { k: string; v: string; f?: string; acento?: boolean }) {
  return (
    <div className={`kpi${acento ? ' kpi-ac' : ''}`}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      {f && <span className="f">{f}</span>}
    </div>
  );
}

export function Card({ titulo, derecha, children, nota }: { titulo?: string; derecha?: ReactNode; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="card">
      {(titulo || derecha) && (
        <div className="card-h">
          {titulo && <h3>{titulo}</h3>}
          {derecha && <div className="r">{derecha}</div>}
        </div>
      )}
      <div className="card-b" style={titulo ? { paddingTop: 12 } : undefined}>
        {children}
        {nota && <p className="tiny muted" style={{ marginTop: 10 }}>{nota}</p>}
      </div>
    </div>
  );
}

export function Seccion({ children }: { children: string }) {
  return (
    <div className="sec-t">
      <h2>{children}</h2>
      <div className="l" />
    </div>
  );
}

export function Aviso({ children, acento, campana }: { children: ReactNode; acento?: boolean; campana?: boolean }) {
  return (
    <div className={`note${acento ? ' note-ac' : ''}`}>
      {campana ? <IconoCampana /> : <IconoInfo />}
      <div>{children}</div>
    </div>
  );
}

const ETIQUETA: Record<EstadoInsumo, [string, string]> = {
  ok: ['chip-ok', 'En nivel'],
  reordenar: ['chip-warn', 'Por reordenar'],
  critico: ['chip-crit', 'Crítico'],
  agotado: ['chip-crit', 'Agotado'],
};

export function Chip({ children, tono }: { children: ReactNode; tono?: 'ok' | 'warn' | 'crit' | 'ac' }) {
  return (
    <span className={`chip${tono ? ` chip-${tono}` : ''}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function ChipEstado({ estado }: { estado: EstadoInsumo }) {
  const [cls, texto] = ETIQUETA[estado];
  return (
    <span className={`chip ${cls}`}>
      <span className="dot" />
      {texto}
    </span>
  );
}

export type Columna = { t: string; n?: boolean };

export function Tabla({ cols, filas, vacio }: { cols: Columna[]; filas: ReactNode[][]; vacio?: string }) {
  if (!filas.length) return <div className="empty">{vacio ?? 'Sin registros.'}</div>;
  return (
    <div className="tw">
      <table className="t">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={c.n ? 'n' : undefined}>{c.t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((c, j) => (
                <td key={j} className={cols[j]?.n ? 'n' : undefined}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Medidor({ valor, minimo, tope, estado }: { valor: number; minimo: number; tope: number; estado: EstadoInsumo }) {
  const clase = estado === 'ok' ? '' : estado === 'reordenar' ? 'w' : 'c';
  return (
    <div className="meter">
      <i className={clase} style={{ width: `${Math.min(100, (valor / tope) * 100).toFixed(1)}%` }} />
      <span className="mk" style={{ left: `${Math.min(99, (minimo / tope) * 100).toFixed(1)}%` }} />
    </div>
  );
}
