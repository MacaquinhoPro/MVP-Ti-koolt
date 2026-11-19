import { metricas } from '@/dominio/metricas';
import { prisma } from '@/lib/db';
import { Encabezado, Kpi, Card, Chip } from '@/components/ui';
import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

export default async function PaginaIndicadores() {
  await exigirAdmin();

  const [ms, ventas, movimientos, nOrdenes] = await Promise.all([
    metricas(),
    prisma.venta.count({ where: { demo: false } }),
    prisma.movimiento.count(),
    prisma.ordenCompra.count(),
  ]);

  const enMeta = ms.filter((m) => m.enMeta).length;
  const medidas = ms.filter((m) => m.valor != null).length;

  return (
    <>
      <Encabezado
        titulo="Indicadores"
        sub="Cómo va la operación frente a las metas del local, medido sobre las ventas, conteos y compras registradas."
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Indicadores en meta" v={`${enMeta} / ${ms.length}`} f={`${medidas} con datos suficientes`} acento />
        <Kpi k="Ventas registradas" v={ventas.toLocaleString('es-CO')} f="desde que se usa el sistema" />
        <Kpi k="Movimientos de inventario" v={movimientos.toLocaleString('es-CO')} f="entradas, mermas, ajustes y conteos" />
        <Kpi k="Órdenes de compra" v={nOrdenes.toLocaleString('es-CO')} f="con su origen registrado" />
      </div>

      <Card titulo="Metas de operación">
        {ms.map((m) => (
          <div className="mt-r" key={m.indicador}>
            <div>
              <span className="lab">{m.indicador}</span>
              <div className="tiny muted" style={{ marginTop: 2 }}>{m.nota}</div>
            </div>
            <div
              className="num"
              style={{
                fontSize: 16, fontWeight: 500,
                color: m.valor == null ? 'var(--ink-3)' : m.enMeta ? 'var(--good)' : 'var(--warn)',
              }}
            >
              {m.valorTexto ?? '—'}
            </div>
            <div className="tiny muted">
              Meta <b className="num" style={{ color: 'var(--ink)' }}>{m.meta}</b>
            </div>
            <div>
              {m.valor == null ? (
                <Chip>Sin medir</Chip>
              ) : m.enMeta ? (
                <Chip tono="ok">En meta</Chip>
              ) : (
                <Chip tono="warn">Fuera de meta</Chip>
              )}
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
