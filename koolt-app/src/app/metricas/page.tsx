import { metricas } from '@/dominio/metricas';
import { prisma } from '@/lib/db';
import { Encabezado, Kpi, Card, Chip } from '@/components/ui';
import { Capacitacion } from '@/components/Capacitacion';
import { DIAS_HISTORICO } from '@/dominio/historico';

import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

export default async function PaginaMetricas() {
  await exigirAdmin();

  const [ms, personas, ventasReales, movimientos, nOrdenes] = await Promise.all([
    metricas(),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.venta.count({ where: { demo: false } }),
    prisma.movimiento.count(),
    prisma.ordenCompra.count(),
  ]);

  const enMeta = ms.filter((m) => m.enMeta).length;
  const medidas = ms.filter((m) => m.valor != null).length;

  return (
    <>
      <Encabezado
        eyebrow="Capítulo 5.4 · métricas de éxito"
        titulo="Métricas del piloto"
        sub="Los diez indicadores del acta, medidos sobre el uso real de esta aplicación y contrastados contra la línea base del diagnóstico."
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Indicadores en meta" v={`${enMeta} / ${ms.length}`} f={`${medidas} con medición disponible`} acento />
        <Kpi k="Ventas registradas en el sistema" v={String(ventasReales)} f="sin pasar por papel" />
        <Kpi k="Movimientos de inventario" v={String(movimientos)} f="asientos auditables generados" />
        <Kpi k="Órdenes de compra" v={String(nOrdenes)} f="con su origen trazado" />
      </div>

      <Card titulo="Métricas de éxito del piloto" derecha={<Chip>capítulo 5.4 del acta</Chip>}>
        {ms.map((m, i) => (
          <div className="mt-r" key={`${m.objetivo}-${i}`}>
            <div>
              <span className="oe">{m.objetivo}</span> <span className="lab">{m.indicador}</span>
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
            <div className="tiny muted">Línea base: {m.lineaBase}</div>
            <div className="tiny">
              Meta del piloto: <b>{m.meta}</b>
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

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card
          titulo="Capacitación del equipo"
          derecha={<Chip>OE8</Chip>}
          nota="La meta es el 100 % del personal operando sin acompañamiento, con manual entregado. El despliegue formal y el manual son el proceso 10 del alcance y se cierran con la Entrega 2."
        >
          <Capacitacion
            personas={personas.map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol, capacitado: p.capacitado }))}
          />
        </Card>

        <Card titulo="Cómo leer estas cifras">
          <ol className="ol">
            <li>
              <span className="n">1</span>
              <span>
                Las metas de OE2 y OE5 se expresan contra una línea base que el acta deja abierta: hoy KOOLT no mide
                tiempos de registro ni eventos de agotamiento. Lo que la aplicación hace es empezar a medirlos.
              </span>
            </li>
            <li>
              <span className="n">2</span>
              <span>
                OE1 llega al 100 % por construcción: toda venta que entra por la pantalla queda registrada. El
                indicador real del piloto es el <b>denominador</b> —que las ventas del turno entren aquí y no en el
                papel— y eso lo valida el conteo físico y el contraste contra el contador de la máquina.
              </span>
            </li>
            <li>
              <span className="n">3</span>
              <span>
                OE7 se reporta en 80 %: los reportes por producto, topping, día y franja horaria están en línea; el de
                estacionalidad exige al menos un mes de operación piloto.
              </span>
            </li>
            <li>
              <span className="n">4</span>
              <span>
                Los {DIAS_HISTORICO} días previos son un histórico reconstruido para que la analítica y el cálculo del
                punto de reorden tengan sobre qué trabajar antes del primer día de piloto. Está marcado como tal en la
                base de datos y los indicadores de adopción (OE1 y OE2) no lo cuentan.
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </>
  );
}
