'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';
import { Card, Aviso, Chip, Tabla } from './ui';
import { cantidad as fmtCantidad, dec } from '@/lib/formato';
import { METAS } from '@/dominio/constantes';

export type OpcionInsumo = { id: string; nombre: string; unidad: string; stock: number };
export type ConteoVista = { id: string; nombre: string; unidad: string; sistema: number; fisico: number; desviacion: number };

export function InventarioForms({ insumos, conteos }: { insumos: OpcionInsumo[]; conteos: ConteoVista[] }) {
  const router = useRouter();
  const { avisar, toast } = useToast();

  const [movInsumo, setMovInsumo] = useState(insumos[0]?.id ?? '');
  const [movTipo, setMovTipo] = useState<'entrada' | 'merma' | 'ajuste'>('entrada');
  const [movCantidad, setMovCantidad] = useState('');
  const [movNota, setMovNota] = useState('');
  const [movEnviando, setMovEnviando] = useState(false);

  const [ctInsumo, setCtInsumo] = useState(insumos[0]?.id ?? '');
  const [ctCantidad, setCtCantidad] = useState('');
  const [ctEnviando, setCtEnviando] = useState(false);

  const segunSistema = insumos.find((i) => i.id === ctInsumo);

  async function registrarMovimiento() {
    if (!(Number(movCantidad) > 0)) return avisar('Indique una cantidad mayor que cero');
    setMovEnviando(true);
    try {
      const r = await enviar('/api/movimientos', { insumoId: movInsumo, tipo: movTipo, cantidad: movCantidad, nota: movNota });
      avisar(r.mensaje);
      setMovCantidad('');
      setMovNota('');
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo registrar el movimiento');
    } finally {
      setMovEnviando(false);
    }
  }

  async function registrarConteo() {
    if (ctCantidad === '' || !(Number(ctCantidad) >= 0)) return avisar('Indique la cantidad contada');
    setCtEnviando(true);
    try {
      const r = await enviar('/api/conteos', { insumoId: ctInsumo, conteoFisico: ctCantidad });
      avisar(r.mensaje);
      setCtCantidad('');
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo registrar el conteo');
    } finally {
      setCtEnviando(false);
    }
  }

  const opciones = insumos.map((i) => (
    <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
  ));

  return (
    <>
      <div className="grid g2">
        <Card titulo="Entrada, merma o ajuste">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="fl" htmlFor="mv-ins">Insumo</label>
              <select id="mv-ins" value={movInsumo} onChange={(e) => setMovInsumo(e.target.value)}>{opciones}</select>
            </div>
            <div>
              <label className="fl" htmlFor="mv-tipo">Tipo</label>
              <select id="mv-tipo" value={movTipo} onChange={(e) => setMovTipo(e.target.value as 'entrada')}>
                <option value="entrada">Entrada — reposición desde bodega</option>
                <option value="merma">Merma — vencimiento o descarte</option>
                <option value="ajuste">Ajuste manual</option>
              </select>
            </div>
            <div>
              <label className="fl" htmlFor="mv-cant">Cantidad (unidad base)</label>
              <input id="mv-cant" type="number" step="any" min={0} placeholder="0" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="fl" htmlFor="mv-nota">Nota</label>
              <input id="mv-nota" placeholder="p. ej. 2 bolsas traídas de bodega" value={movNota} onChange={(e) => setMovNota(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-pri" onClick={registrarMovimiento} disabled={movEnviando}>
              {movEnviando ? 'Registrando…' : 'Registrar movimiento'}
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Aviso>
              El stock es el total de la referencia —las dos o tres bolsas del local más el saldo en bodega—. La
              entrada documenta tanto la reposición desde bodega como la recepción de una compra.
            </Aviso>
            <Aviso>
              La merma documenta el descarte que el diagnóstico cuantificó: ~0,5 L de leche cada 3 días y ~50 g diarios
              de topping. Registrarla es lo que evita que el stock del sistema se desvíe en silencio.
            </Aviso>
          </div>
        </Card>

        <Card titulo="Conteo físico" derecha={<Chip>mide OE3</Chip>}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="fl" htmlFor="ct-ins">Insumo</label>
              <select id="ct-ins" value={ctInsumo} onChange={(e) => setCtInsumo(e.target.value)}>{opciones}</select>
            </div>
            <div>
              <label className="fl" htmlFor="ct-cant">Cantidad contada</label>
              <input id="ct-cant" type="number" step="any" min={0} placeholder="0" value={ctCantidad} onChange={(e) => setCtCantidad(e.target.value)} />
            </div>
            <div>
              <span className="fl">Según el sistema</span>
              <div className="num" style={{ padding: '7px 0' }}>
                {segunSistema ? fmtCantidad(segunSistema.stock, segunSistema.unidad) : '—'}
              </div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-pri" onClick={registrarConteo} disabled={ctEnviando}>
              {ctEnviando ? 'Registrando…' : 'Registrar conteo'}
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            {conteos.length ? (
              <Tabla
                cols={[{ t: 'Insumo' }, { t: 'Sistema', n: true }, { t: 'Físico', n: true }, { t: 'Desviación', n: true }]}
                filas={conteos.map((c) => [
                  c.nombre,
                  fmtCantidad(c.sistema, c.unidad),
                  fmtCantidad(c.fisico, c.unidad),
                  <span style={{ color: Math.abs(c.desviacion) <= METAS.desviacionConteoPct ? 'var(--good)' : 'var(--crit)' }}>
                    {c.desviacion > 0 ? '+' : ''}{dec(c.desviacion)} %
                  </span>,
                ])}
              />
            ) : (
              <Aviso>
                El conteo no corrige el stock en silencio: deja un movimiento con su desviación, que es exactamente lo
                que mide el objetivo OE3 (≤ {METAS.desviacionConteoPct} % por ingrediente).
              </Aviso>
            )}
          </div>
        </Card>
      </div>
      {toast}
    </>
  );
}
