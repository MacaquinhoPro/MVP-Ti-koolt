'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Card } from './ui';
import { cop, copCorto, dec } from '@/lib/formato';
import type { PuntoDia, PuntoHora, PuntoTopping, PuntoLinea } from '@/dominio/reportes';
import { cantidad as fmtCantidad } from '@/lib/formato';

/* ── Capa de hover compartida ───────────────────────────────────────────── */
/**
 * Un gráfico HTML es interactivo por definición: todas las formas comparten
 * esta capa, que define una zona de contacto más grande que la marca dibujada
 * y muestra el valor exacto al pasar por encima.
 */
type MarcaZona = {
  /** Punto donde se ancla la etiqueta flotante, en coordenadas del viewBox. */
  x: number;
  y: number;
  /** Zona de contacto, más generosa que la marca para que sea fácil de apuntar. */
  zonaX: number;
  zonaY: number;
  zonaW: number;
  zonaH: number;
  contenido: ReactNode;
};

/**
 * Ancho real del contenedor en píxeles. El viewBox se dibuja a esa medida para
 * que las etiquetas conserven su tamaño de fuente en cualquier columna, en vez
 * de escalarse con la tarjeta.
 */
function useAncho(base = 700) {
  const [ancho, setAncho] = useState(base);
  const caja = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [caja, ancho] as const;
}

function SinDatos({ children }: { children: ReactNode }) {
  return <div className="ch-vacio">{children}</div>;
}

function Lienzo({
  caja, ancho, alto, etiqueta, marcas, children,
}: {
  caja: (el: HTMLDivElement | null) => void;
  ancho: number; alto: number; etiqueta: string; marcas: MarcaZona[]; children: ReactNode;
}) {
  const [activa, setActiva] = useState<number | null>(null);
  const m = activa == null ? null : marcas[activa];
  return (
    <div className="ch" ref={caja} onPointerLeave={() => setActiva(null)}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={etiqueta}>
        {children}
        {marcas.map((mk, i) => (
          <rect
            key={i}
            className="hit"
            x={mk.zonaX} y={mk.zonaY} width={mk.zonaW} height={mk.zonaH}
            onPointerEnter={() => setActiva(i)}
          />
        ))}
      </svg>
      {m && (
        <div className="tip" style={{ left: `${(m.x / ancho) * 100}%`, top: `${(m.y / alto) * 100}%` }}>
          {m.contenido}
        </div>
      )}
    </div>
  );
}

function escalaBonita(max: number): number {
  if (max <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const r = max / mag;
  const paso = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
  return paso * mag;
}

function extremoRedondeado(x: number, y: number, w: number, h: number, r = 4) {
  if (w < r + 1) return `M${x} ${y}h${Math.max(w, 1)}v${h}h${-Math.max(w, 1)}Z`;
  return `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`;
}
function topeRedondeado(x: number, y: number, w: number, h: number, r = 4) {
  if (h < r + 1) return `M${x} ${y}h${w}v${Math.max(h, 1)}h${-w}Z`;
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

/* ── Venta diaria ───────────────────────────────────────────────────────── */
export function GraficoDias({ dias }: { dias: PuntoDia[] }) {
  const [caja, W] = useAncho();
  if (!dias.some((d) => d.monto > 0)) return <SinDatos>Todavía no hay ventas en la ventana. La curva aparece con la primera venta registrada.</SinDatos>;
  const H = 232, PL = 52, PR = 10, PT = 14, PB = 28;
  const pw = W - PL - PR, ph = H - PT - PB;
  const max = escalaBonita(Math.max(...dias.map((d) => d.monto)) * 1.08) || 1;
  const cada = W < 520 ? 4 : 3;
  const n = dias.length, dx = n > 1 ? pw / (n - 1) : 0;
  const X = (i: number) => PL + i * dx;
  const Y = (v: number) => PT + ph - (v / max) * ph;

  const linea = dias.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(d.monto).toFixed(1)}`).join('');
  const area = `${linea}L${X(n - 1).toFixed(1)} ${PT + ph}L${PL} ${PT + ph}Z`;
  const ultimo = dias[n - 1];

  const marcas: MarcaZona[] = dias.map((d, i) => ({
    x: X(i), y: Y(d.monto) - 10,
    zonaX: X(i) - Math.max(dx, 10) / 2, zonaY: PT, zonaW: Math.max(dx, 10), zonaH: ph,
    contenido: <>{d.etiquetaLarga} · <b>{cop(d.monto)}</b> · {d.unidades} unidades</>,
  }));

  return (
    <Lienzo caja={caja} ancho={W} alto={H} etiqueta={`Venta diaria de los últimos ${n} días, en pesos`} marcas={marcas}>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (max * i) / 4, y = Y(v);
        return (
          <g key={i}>
            <line className="gl" x1={PL} y1={y} x2={W - PR} y2={y} />
            <text className="ax" x={PL - 8} y={y + 3.5} textAnchor="end">{copCorto(v)}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="g-dias" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--s1)" stopOpacity={0.18} />
          <stop offset="1" stopColor="var(--s1)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g-dias)" />
      <path d={linea} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(n - 1)} cy={Y(ultimo.monto)} r={4.5} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
      <text className="dl" x={X(n - 1) - 6} y={Y(ultimo.monto) - 11} textAnchor="end">{copCorto(ultimo.monto)}</text>
      {dias.map((d, i) =>
        (i % cada === 0 && n - 1 - i >= cada / 2) || i === n - 1 ? (
          <text key={i} className="ax" x={X(i)} y={H - 9} textAnchor="middle">{d.etiqueta}</text>
        ) : null,
      )}
    </Lienzo>
  );
}

/* ── Franja horaria ─────────────────────────────────────────────────────── */
export function GraficoHoras({ horas }: { horas: PuntoHora[] }) {
  const [caja, W] = useAncho();
  if (!horas.some((h) => h.monto > 0)) return <SinDatos>Sin ventas para repartir por franja horaria.</SinDatos>;
  const H = 200, PL = 52, PR = 10, PT = 12, PB = 28;
  const pw = W - PL - PR, ph = H - PT - PB;
  const max = escalaBonita(Math.max(...horas.map((h) => h.monto)) * 1.1) || 1;
  const banda = pw / horas.length, bw = Math.max(Math.min(banda * 0.68, 34), 6);

  const marcas: MarcaZona[] = horas.map((h, i) => {
    const alt = (h.monto / max) * ph;
    const x = PL + i * banda + (banda - bw) / 2;
    return {
      x: x + bw / 2, y: PT + ph - alt,
      zonaX: PL + i * banda, zonaY: PT, zonaW: banda, zonaH: ph,
      contenido: <>{h.etiqueta} · <b>{cop(h.monto)}</b> · {h.transacciones} ventas</>,
    };
  });

  return (
    <Lienzo caja={caja} ancho={W} alto={H} etiqueta="Venta acumulada por franja horaria; la franja de mayor venta está resaltada" marcas={marcas}>
      {[0, 1, 2, 3].map((i) => {
        const v = (max * i) / 3, y = PT + ph - (v / max) * ph;
        return (
          <g key={i}>
            <line className="gl" x1={PL} y1={y} x2={W - PR} y2={y} />
            <text className="ax" x={PL - 8} y={y + 3.5} textAnchor="end">{copCorto(v)}</text>
          </g>
        );
      })}
      {horas.map((h, i) => {
        const alt = (h.monto / max) * ph;
        const x = PL + i * banda + (banda - bw) / 2;
        return (
          <g key={h.hora}>
            <path d={topeRedondeado(x, PT + ph - alt, bw, alt)} fill={h.pico ? 'var(--s1)' : 'var(--s1-soft)'} />
            <text className="ax" x={PL + i * banda + banda / 2} y={H - 9} textAnchor="middle">{h.hora}</text>
          </g>
        );
      })}
    </Lienzo>
  );
}

/* ── Barras horizontales ────────────────────────────────────────────────── */
export function GraficoToppings({ toppings }: { toppings: PuntoTopping[] }) {
  const [caja, W] = useAncho();
  if (!toppings.some((t) => t.adiciones > 0)) return <SinDatos>Ninguna adición vendida en la ventana.</SinDatos>;
  const rh = 30, PLab = Math.min(168, W * 0.36), PR = 56, PT = 4;
  const pw = W - PLab - PR, H = PT + toppings.length * rh + 6;
  const max = Math.max(...toppings.map((t) => t.adiciones)) || 1;

  const marcas: MarcaZona[] = toppings.map((t, i) => {
    const bw = (t.adiciones / max) * pw;
    return {
      x: PLab + bw / 2, y: PT + i * rh + 3,
      zonaX: PLab, zonaY: PT + i * rh, zonaW: pw, zonaH: rh,
      contenido: <>{t.nombre} · <b>{t.adiciones.toLocaleString('es-CO')} adiciones</b> · {fmtCantidad(t.consumo, t.unidad)} consumidos</>,
    };
  });

  return (
    <Lienzo caja={caja} ancho={W} alto={H} etiqueta="Adiciones más vendidas, de mayor a menor, con el valor al final de cada barra" marcas={marcas}>
      {toppings.map((t, i) => {
        const y = PT + i * rh, bw = Math.max((t.adiciones / max) * pw, 2);
        return (
          <g key={t.insumoId}>
            <text className="axl" x={0} y={y + 15}>{t.nombre}</text>
            <rect x={PLab} y={y + 4} width={pw} height={14} rx={4} className="pista" />
            <path d={extremoRedondeado(PLab, y + 4, bw, 14)} fill={i < 3 ? 'var(--s1)' : 'var(--s1-soft)'} />
            <text className="dl" x={PLab + bw + 9} y={y + 15}>{t.adiciones.toLocaleString('es-CO')}</text>
          </g>
        );
      })}
    </Lienzo>
  );
}

export function GraficoLineas({ lineas }: { lineas: PuntoLinea[] }) {
  const [caja, W] = useAncho();
  if (!lineas.some((l) => l.monto > 0)) return <SinDatos>Sin ventas para calcular el mix por línea.</SinDatos>;
  const rh = 34, PLab = 92, PR = 64, PT = 4;
  const pw = W - PLab - PR, H = PT + lineas.length * rh + 6;
  const max = Math.max(...lineas.map((l) => l.monto)) || 1;
  const color = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

  const marcas: MarcaZona[] = lineas.map((l, i) => {
    const bw = (l.monto / max) * pw;
    return {
      x: PLab + bw / 2, y: PT + i * rh + 4,
      zonaX: PLab, zonaY: PT + i * rh, zonaW: pw, zonaH: rh,
      contenido: <>{l.linea} · <b>{cop(l.monto)}</b> · {l.unidades.toLocaleString('es-CO')} unidades</>,
    };
  });

  return (
    <Lienzo caja={caja} ancho={W} alto={H} etiqueta="Participación de cada línea de producto en la venta" marcas={marcas}>
      {lineas.map((l, i) => {
        const y = PT + i * rh, bw = Math.max((l.monto / max) * pw, 2);
        return (
          <g key={l.linea}>
            <text className="axl" x={0} y={y + 16}>{l.linea}</text>
            <rect x={PLab} y={y + 4} width={pw} height={16} rx={4} className="pista" />
            <path d={extremoRedondeado(PLab, y + 4, bw, 16)} fill={color[i % 4]} />
            <text className="dl" x={PLab + bw + 9} y={y + 16}>{dec(l.participacion)} %</text>
          </g>
        );
      })}
    </Lienzo>
  );
}

/* ── Cobertura de inventario ────────────────────────────────────────────── */
export type PuntoCobertura = { nombre: string; cobertura: number; disparo: number; estado: string };

export function GraficoCobertura({ items }: { items: PuntoCobertura[] }) {
  const [caja, W] = useAncho();
  if (!items.length) return <SinDatos>La cobertura se calcula con el consumo de las ventas. Aparece cuando haya consumo registrado.</SinDatos>;
  const rh = 29, PLab = Math.min(186, W * 0.36), PR = 52, PT = 18;
  const pw = W - PLab - PR, H = PT + items.length * rh + 10;
  const max = Math.max(32, Math.ceil(Math.max(...items.map((i) => Math.min(i.cobertura, 60))) / 10) * 10);
  const ticks = Array.from({ length: Math.floor(max / 10) + 1 }, (_, i) => i * 10);

  const marcas: MarcaZona[] = items.map((it, i) => {
    const bw = (Math.min(it.cobertura, max) / max) * pw;
    return {
      x: PLab + bw / 2, y: PT + i * rh + 4,
      zonaX: PLab, zonaY: PT + i * rh, zonaW: pw, zonaH: rh,
      contenido: <>{it.nombre} · cobertura <b>{dec(it.cobertura)} días</b> · la alerta se dispara a los {it.disparo} días</>,
    };
  });

  return (
    <Lienzo caja={caja} ancho={W} alto={H} etiqueta="Días de cobertura por insumo, con una marca vertical en el punto de reorden de cada referencia" marcas={marcas}>
      {ticks.map((t) => {
        const x = PLab + (t / max) * pw;
        return (
          <g key={t}>
            <line className="gl" x1={x} y1={PT} x2={x} y2={H - 10} />
            <text className="ax" x={x} y={PT - 6} textAnchor="middle">{t}</text>
          </g>
        );
      })}
      <text className="axl" x={PLab + pw + 6} y={PT - 6}>días</text>
      {items.map((it, i) => {
        const y = PT + i * rh + 4;
        const bw = Math.max((Math.min(it.cobertura, max) / max) * pw, 2);
        const col = it.estado === 'ok' ? 'var(--s4)' : it.estado === 'reordenar' ? 'var(--s3)' : 'var(--crit)';
        const mk = PLab + (Math.min(it.disparo, max) / max) * pw;
        return (
          <g key={it.nombre}>
            <text className="axl" x={0} y={y + 13}>{it.nombre}</text>
            <path d={extremoRedondeado(PLab, y + 2, bw, 14)} fill={col} />
            <line x1={mk} y1={y - 1} x2={mk} y2={y + 17} stroke="var(--ink-3)" strokeWidth={2} />
            <text className="dl" x={PLab + pw + 8} y={y + 13}>{dec(it.cobertura)}</text>
          </g>
        );
      })}
    </Lienzo>
  );
}

/* ── Tarjeta con alternancia gráfico / tabla ────────────────────────────── */
export function TarjetaGrafico({
  titulo, detalle, nota, leyenda, grafico, tabla,
}: {
  titulo: string; detalle?: ReactNode; nota?: ReactNode; leyenda?: ReactNode; grafico: ReactNode; tabla: ReactNode;
}) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <Card
      titulo={titulo}
      derecha={
        <>
          {detalle && <span className="tiny muted">{detalle}</span>}
          <div className="seg seg-sm" role="group" aria-label={`Vista de ${titulo.toLowerCase()}`}>
            <button aria-pressed={!verTabla} onClick={() => setVerTabla(false)}>Gráfico</button>
            <button aria-pressed={verTabla} onClick={() => setVerTabla(true)}>Tabla</button>
          </div>
        </>
      }
      nota={nota}
    >
      {!verTabla && leyenda}
      {verTabla ? tabla : grafico}
    </Card>
  );
}
