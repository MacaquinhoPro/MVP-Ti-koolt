'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';
import { Card, Tabla, Chip, ChipEstado } from './ui';
import { cantidad as fmtCantidad, cop, copCorto, dec } from '@/lib/formato';
import type { EstadoInsumo } from '@/dominio/constantes';

export type GrupoSugerencia = {
  proveedor: string;
  costo: number;
  items: {
    insumoId: string; nombre: string; empaque: string; unidad: string;
    cobertura: number; estado: string; empaques: number; cantidad: number; costoItem: number;
  }[];
};
export type OpcionCompra = { id: string; nombre: string; empaque: string; unidad: string; contenido: number; costoEmpaque: number };

export function Sugerencias({ grupos }: { grupos: GrupoSugerencia[] }) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const todos = grupos.flatMap((g) => g.items);
  const seleccionados = todos.filter((i) => !excluidos.has(i.insumoId));

  function alternar(id: string) {
    setExcluidos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function crear() {
    if (!seleccionados.length) return avisar('No hay referencias seleccionadas');
    setEnviando(true);
    try {
      const r = await enviar('/api/ordenes', {
        origen: 'sugerencia',
        lineas: seleccionados.map((i) => ({ insumoId: i.insumoId, empaques: i.empaques })),
      });
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo crear la orden');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Card
        titulo="Sugerencia de compra"
        derecha={
          <>
            <span className="tiny muted">consumo de 14 días · cobertura objetivo 30 días · redondeo al empaque</span>
            {grupos.length > 0 && (
              <button className="btn btn-pri btn-sm" onClick={crear} disabled={enviando}>
                {enviando ? 'Creando…' : `Crear orden (${seleccionados.length})`}
              </button>
            )}
          </>
        }
      >
        {grupos.length ? (
          grupos.map((g) => (
            <div key={g.proveedor} style={{ marginBottom: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: 13.5 }}>{g.proveedor}</strong>
                <Chip>{g.items.length} referencias · {copCorto(g.costo)}</Chip>
              </div>
              <Tabla
                cols={[
                  { t: '' }, { t: 'Insumo' }, { t: 'Estado' }, { t: 'Cobertura', n: true },
                  { t: 'Empaques', n: true }, { t: 'Cantidad', n: true }, { t: 'Costo estimado', n: true },
                ]}
                filas={g.items.map((i) => [
                  <input
                    type="checkbox"
                    checked={!excluidos.has(i.insumoId)}
                    onChange={() => alternar(i.insumoId)}
                    aria-label={`Incluir ${i.nombre}`}
                    style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
                  />,
                  <>
                    <span className="em">{i.nombre}</span>
                    <br />
                    <span className="tiny muted">{i.empaque}</span>
                  </>,
                  <ChipEstado estado={i.estado as EstadoInsumo} />,
                  Number.isFinite(i.cobertura) ? `${dec(i.cobertura)} d` : '—',
                  String(i.empaques),
                  fmtCantidad(i.cantidad, i.unidad),
                  cop(i.costoItem),
                ])}
              />
            </div>
          ))
        ) : (
          <div className="empty">No hay sugerencias: ninguna referencia está por debajo de su punto de reorden.</div>
        )}
      </Card>
      {toast}
    </>
  );
}

export function OrdenManual({ insumos }: { insumos: OpcionCompra[] }) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [insumoId, setInsumoId] = useState(insumos[0]?.id ?? '');
  const [empaques, setEmpaques] = useState('1');
  const [borrador, setBorrador] = useState<{ insumoId: string; empaques: number }[]>([]);
  const [enviando, setEnviando] = useState(false);

  const por = new Map(insumos.map((i) => [i.id, i]));

  function agregar() {
    const n = Math.round(Number(empaques));
    if (!(n > 0)) return avisar('Indique al menos un empaque');
    setBorrador((prev) => {
      const i = prev.findIndex((l) => l.insumoId === insumoId);
      if (i < 0) return [...prev, { insumoId, empaques: n }];
      const copia = [...prev];
      copia[i] = { ...copia[i], empaques: copia[i].empaques + n };
      return copia;
    });
  }

  async function crear() {
    setEnviando(true);
    try {
      const r = await enviar('/api/ordenes', { origen: 'manual', lineas: borrador });
      avisar(r.mensaje);
      setBorrador([]);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo crear la orden');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Card titulo="Orden manual">
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) 110px auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label className="fl" htmlFor="od-ins">Insumo</label>
            <select id="od-ins" value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre} — {i.empaque}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fl" htmlFor="od-paq">Empaques</label>
            <input id="od-paq" type="number" min={1} step={1} value={empaques} onChange={(e) => setEmpaques(e.target.value)} />
          </div>
          <button className="btn" onClick={agregar}>Agregar</button>
        </div>

        <div style={{ marginTop: 14 }}>
          <Tabla
            cols={[{ t: 'Insumo' }, { t: 'Empaques', n: true }, { t: 'Cantidad', n: true }, { t: 'Costo', n: true }, { t: '' }]}
            filas={borrador.map((l, ix) => {
              const i = por.get(l.insumoId)!;
              return [
                i.nombre,
                String(l.empaques),
                fmtCantidad(l.empaques * i.contenido, i.unidad),
                cop(l.empaques * i.costoEmpaque),
                <button className="btn btn-sm btn-gh" onClick={() => setBorrador((p) => p.filter((_, j) => j !== ix))}>
                  Quitar
                </button>,
              ];
            })}
            vacio="Sin líneas. Agregue una referencia para armar la orden."
          />
        </div>

        {borrador.length > 0 && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-pri" onClick={crear} disabled={enviando}>
              {enviando ? 'Creando…' : 'Crear orden manual'}
            </button>
            <span className="tiny muted">
              Queda marcada como <b>manual</b>: así el indicador OE6 distingue las órdenes que nacieron del sistema.
            </span>
          </div>
        )}
      </Card>
      {toast}
    </>
  );
}

export function BotonRecepcion({ ordenId, codigo }: { ordenId: string; codigo: string }) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [enviando, setEnviando] = useState(false);

  async function recibir() {
    setEnviando(true);
    try {
      const r = await enviar(`/api/ordenes/${ordenId}/recepcion`);
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : `No se pudo recibir ${codigo}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button className="btn btn-sm" onClick={recibir} disabled={enviando}>
        {enviando ? 'Registrando…' : 'Registrar recepción'}
      </button>
      {toast}
    </>
  );
}
