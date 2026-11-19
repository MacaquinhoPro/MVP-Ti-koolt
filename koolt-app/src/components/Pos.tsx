'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop, dec, folio as fmtFolio } from '@/lib/formato';
import { LINEAS, MEDIOS_PAGO, METAS } from '@/dominio/constantes';
import { useToast, enviar } from './Toast';
import { Aviso, Card, Chip } from './ui';
import { IconoMenos } from './iconos';

export type ProductoVista = {
  id: string; nombre: string; tamano: string; linea: string; precio: number;
  temporada: boolean; falta: string | null;
};
export type ToppingVista = { id: string; nombre: string; precioAdicion: number; disponible: boolean };

type Linea = { tipo: 'producto' | 'adicion'; ref: string; nombre: string; detalle: string; cantidad: number; precio: number };

type Comprobante = {
  folioTexto: string; total: number; duracionMs: number;
  insumosDescontados: number; medioPago: string; hora: string;
};

export function Pos({
  productos, toppings, siguienteFolio, rol,
}: {
  productos: ProductoVista[]; toppings: ToppingVista[]; siguienteFolio: number; rol: string;
}) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [medioPago, setMedioPago] = useState<string>(MEDIOS_PAGO[0]);
  const [inicio, setInicio] = useState<number | null>(null);
  const [transcurrido, setTranscurrido] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const cronometro = useRef<ReturnType<typeof setInterval> | null>(null);

  // El cronómetro arranca con el primer toque y mide el indicador de tiempo de registro:
  // el tiempo real de registro de una venta, no una estimación.
  useEffect(() => {
    if (inicio == null) {
      if (cronometro.current) clearInterval(cronometro.current);
      setTranscurrido(0);
      return;
    }
    cronometro.current = setInterval(() => setTranscurrido(Date.now() - inicio), 120);
    return () => { if (cronometro.current) clearInterval(cronometro.current); };
  }, [inicio]);

  function agregar(l: Omit<Linea, 'cantidad'>) {
    setInicio((t) => t ?? Date.now());
    setLineas((prev) => {
      const i = prev.findIndex((x) => x.tipo === l.tipo && x.ref === l.ref);
      if (i < 0) return [...prev, { ...l, cantidad: 1 }];
      const copia = [...prev];
      copia[i] = { ...copia[i], cantidad: copia[i].cantidad + 1 };
      return copia;
    });
  }

  function quitar(i: number) {
    setLineas((prev) => {
      const copia = [...prev];
      if (copia[i].cantidad > 1) copia[i] = { ...copia[i], cantidad: copia[i].cantidad - 1 };
      else copia.splice(i, 1);
      if (!copia.length) setInicio(null);
      return copia;
    });
  }

  function cancelar() {
    setLineas([]);
    setInicio(null);
    avisar('Venta cancelada');
  }

  const total = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
  const nProductos = lineas.reduce((a, l) => a + (l.tipo === 'producto' ? l.cantidad : 0), 0);
  const nAdiciones = lineas.reduce((a, l) => a + (l.tipo === 'adicion' ? l.cantidad : 0), 0);
  const segundos = transcurrido / 1000;
  const enVenta = new Map(lineas.filter((l) => l.tipo === 'producto').map((l) => [l.ref, l.cantidad]));

  async function cobrar() {
    if (!lineas.length || enviando) return;
    setEnviando(true);
    try {
      const r = await enviar('/api/ventas', {
        lineas: lineas.map((l) =>
          l.tipo === 'producto'
            ? { tipo: 'producto', productoId: l.ref, cantidad: l.cantidad }
            : { tipo: 'adicion', insumoId: l.ref, cantidad: l.cantidad },
        ),
        medioPago,
        duracionMs: inicio ? Date.now() - inicio : 0,
      });
      setComprobante({
        folioTexto: r.folioTexto, total: r.total, duracionMs: r.duracionMs,
        insumosDescontados: r.insumosDescontados, medioPago,
        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      });
      setLineas([]);
      setInicio(null);
      avisar(
        r.agotados.length
          ? `Venta ${r.folioTexto} registrada · ${r.agotados[0]} quedó en cero: se registró un evento de agotamiento`
          : `Venta ${r.folioTexto} registrada en ${dec(r.duracionMs / 1000)} s · inventario actualizado`,
      );
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo registrar la venta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="pos">
        <div className="stack">
          <Card titulo="Producto" derecha={<Chip>4 líneas · granizado incluido</Chip>}>
            <div className="pgrid">
              {productos.map((p) => {
                const n = enVenta.get(p.id);
                const serie = LINEAS.indexOf(p.linea as (typeof LINEAS)[number]);
                return (
                  <button
                    key={p.id}
                    className={`pbtn${p.falta ? ' falta' : ''}`}
                    style={{ '--ln': `var(--s${(serie < 0 ? 0 : serie) + 1})` } as React.CSSProperties}
                    aria-label={`${p.nombre}, ${p.tamano}, ${cop(p.precio)}${n ? `, ${n} en la venta` : ''}`}
                    onClick={() => agregar({ tipo: 'producto', ref: p.id, nombre: p.nombre, detalle: `${p.tamano} · ${p.linea}`, precio: p.precio })}
                  >
                    {n ? <span className="pc num">{n}</span> : null}
                    <span className="pn">{p.nombre}</span>
                    <span className="pz">
                      <i className="ln" />
                      {p.falta ? `Falta ${p.falta.toLowerCase()}` : `${p.tamano} · ${p.linea}`}
                    </span>
                    <span className="pp">{cop(p.precio)}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card titulo="Adiciones" derecha={<Chip>{toppings.length} referencias</Chip>}>
            <div className="row" style={{ gap: 7 }}>
              {toppings.map((t) => (
                <button
                  key={t.id}
                  className="tbtn"
                  disabled={!t.disponible}
                  aria-pressed={lineas.some((l) => l.tipo === 'adicion' && l.ref === t.id)}
                  onClick={() => agregar({ tipo: 'adicion', ref: t.id, nombre: t.nombre, detalle: 'adición', precio: t.precioAdicion })}
                >
                  {t.nombre}
                  <span className="tp">{t.disponible ? `+${cop(t.precioAdicion)}` : 'agotado'}</span>
                </button>
              ))}
            </div>
          </Card>

          {comprobante && (
            <Card
              titulo="Último comprobante"
              derecha={<Chip tono="ok">Registrado</Chip>}
              nota={`Comprobante interno: no reemplaza la factura electrónica. Esta venta descontó ${comprobante.insumosDescontados} ingredientes del inventario según la receta.`}
            >
              <div className="row" style={{ gap: 22, alignItems: 'flex-start' }}>
                <Dato k="Folio" v={comprobante.folioTexto} />
                <Dato k="Hora" v={comprobante.hora} />
                <Dato k="Total" v={cop(comprobante.total)} />
                <Dato k="Medio de pago" v={comprobante.medioPago} mono={false} />
                <Dato
                  k="Tiempo de registro"
                  v={`${dec(comprobante.duracionMs / 1000)} s`}
                  color={comprobante.duracionMs / 1000 <= METAS.segundosPorVenta ? 'var(--good)' : 'var(--warn)'}
                />
              </div>
            </Card>
          )}
        </div>

        <div className="tick" id="venta-en-curso">
          <div className="tick-h">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong className="tick-t">Venta en curso</strong>
              <span className="fol">{fmtFolio(siguienteFolio)}</span>
            </div>
            <div className="timer">
              {inicio == null ? (
                'El cronómetro arranca con el primer toque'
              ) : (
                <>
                  <span className="dot" style={{ background: segundos <= METAS.segundosPorVenta ? 'var(--good)' : 'var(--warn)' }} />
                  <b>{dec(segundos)} s</b>
                  {segundos <= METAS.segundosPorVenta ? ` · dentro de la meta de ${METAS.segundosPorVenta} s` : ` · por encima de la meta de ${METAS.segundosPorVenta} s`}
                </>
              )}
            </div>
          </div>

          {lineas.length ? (
            <div className="tick-l">
              {lineas.map((l, i) => (
                <div className="tl" key={`${l.tipo}-${l.ref}`}>
                  <span className="q">{l.cantidad}×</span>
                  <span className="d">
                    {l.nombre}
                    <em>{l.detalle}</em>
                  </span>
                  <span className="m">{cop(l.precio * l.cantidad)}</span>
                  <button className="x" onClick={() => quitar(i)} aria-label={`Quitar una unidad de ${l.nombre}`}>
                    <IconoMenos />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty tick-e">
              <strong>Sin líneas todavía</strong>
              Toque un producto para empezar.
            </div>
          )}

          <div className="tick-tot">
            <div className="tr">
              <span>
                {nProductos} producto{nProductos === 1 ? '' : 's'} · {nAdiciones} adición{nAdiciones === 1 ? '' : 'es'}
              </span>
              <span>{cop(total)}</span>
            </div>
            <div className="tr big">
              <span>Total</span>
              <span>{cop(total)}</span>
            </div>
          </div>

          <div className="tick-f">
            <div>
              <span className="fl">Medio de pago</span>
              <div className="seg" role="group" aria-label="Medio de pago" style={{ width: '100%' }}>
                {MEDIOS_PAGO.map((p) => (
                  <button key={p} aria-pressed={medioPago === p} onClick={() => setMedioPago(p)} style={{ flex: 1 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-pri btn-lg" disabled={!lineas.length || enviando} onClick={cobrar}>
              {enviando ? 'Registrando…' : lineas.length ? <>Cobrar <span className="num">{cop(total)}</span></> : 'Cobrar y registrar'}
            </button>
            {lineas.length > 0 && (
              <button className="btn btn-gh btn-sm" onClick={cancelar}>Cancelar venta</button>
            )}
          </div>
        </div>
      </div>

      {lineas.length > 0 && (
        <div className="pos-bar" role="region" aria-label="Resumen de la venta">
          <a href="#venta-en-curso" className="pos-bar-r">
            <span className="tiny">{nProductos + nAdiciones} ítem{nProductos + nAdiciones === 1 ? '' : 's'} · ver detalle</span>
            <strong className="num">{cop(total)}</strong>
          </a>
          <button className="btn btn-pri" disabled={enviando} onClick={cobrar}>
            {enviando ? 'Registrando…' : 'Cobrar'}
          </button>
        </div>
      )}

      {rol === 'mostrador' && (
        <div style={{ marginTop: 18 }}>
          <Aviso>
            Sesión de mostrador: puede registrar ventas y consultar el cierre del día. El inventario, las compras y la
            configuración son de administración.
          </Aviso>
        </div>
      )}
      {toast}
    </>
  );
}

function Dato({ k, v, color, mono = true }: { k: string; v: string; color?: string; mono?: boolean }) {
  return (
    <div>
      <div className="dk">{k}</div>
      <div className={mono ? 'num dv' : 'dv'} style={{ color }}>{v}</div>
    </div>
  );
}
