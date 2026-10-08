import { resumenDelDia, cierresRecientes } from '@/dominio/cierre';
import { prisma } from '@/lib/db';
import { Encabezado, Kpi, Card, Seccion, Tabla, Aviso, Chip } from '@/components/ui';
import { CierreForm } from '@/components/CierreForm';
import { cop, duracion, fechaLarga, inicioDia } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaCierre() {
  const hoy = inicioDia();
  const [r, cierres, existente] = await Promise.all([
    resumenDelDia(hoy),
    cierresRecientes(),
    prisma.cierreDiario.findUnique({ where: { fecha: hoy } }),
  ]);

  return (
    <>
      <Encabezado
        eyebrow="Proceso 2 · cierre de operación"
        titulo="Cierre diario"
        sub="El consolidado del día lo genera el sistema. El contador de la máquina de helados se ingresa a mano y sirve como control cruzado, no como fuente del dato."
        acciones={<Chip>{fechaLarga(hoy)}</Chip>}
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Venta del día" v={cop(r.total)} f={`${r.transacciones} transacciones registradas`} acento />
        <Kpi k="Unidades de helado" v={String(r.unidadesHelado)} f="se contrasta con el contador de la máquina" />
        <Kpi k="Unidades de granizado" v={String(r.unidadesGranizado)} f="línea sin contador físico — medida solo aquí" />
        <Kpi k="Adiciones vendidas" v={String(r.adiciones)} f="toppings servidos sobre los productos" />
      </div>

      <div className="grid g2">
        <Card
          titulo="Generar el cierre"
          derecha={existente && !existente.demo ? <Chip tono="ok">Día ya cerrado</Chip> : undefined}
        >
          <CierreForm yaCerrado={!!existente && !existente.demo} />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {r.transacciones === 0 && (
              <Aviso campana>
                El día todavía no tiene ventas registradas: KOOLT abre a las 11:00 y el consolidado se construye a
                medida que avanza el turno. Registre una venta en <b>Venta</b> y vuelva aquí — el cierre se puede
                generar en cualquier momento del día.
              </Aviso>
            )}
            <Aviso>
              El contraste contra el contador es la práctica que aporta Square for Restaurants: expone merma,
              calibración y consumo interno que de otro modo quedan invisibles. Es opcional —si no se ingresa, el
              cierre se genera igual— y nunca reemplaza el registro de ventas.
            </Aviso>
          </div>
        </Card>

        <Card titulo="Unidades por producto">
          <Tabla
            cols={[{ t: 'Producto' }, { t: 'Unidades', n: true }, { t: 'Venta', n: true }]}
            filas={r.porProducto.map((p) => [
              <>
                {p.nombre} <span className="muted">{p.tamano}</span>
              </>,
              String(p.unidades),
              cop(p.monto),
            ])}
          />
          <div className="eyebrow" style={{ marginTop: 16, marginBottom: 6 }}>Por medio de pago</div>
          <Tabla
            cols={[{ t: 'Medio' }, { t: 'Transacciones', n: true }, { t: 'Monto', n: true }]}
            filas={r.porMedioPago.map((p) => [p.medio, String(p.transacciones), cop(p.monto)])}
            vacio="Sin transacciones todavía hoy."
          />
        </Card>
      </div>

      <Seccion>Cierres generados</Seccion>
      <Card
        titulo="Histórico"
        derecha={
          <a className="btn btn-sm" href="/api/exportar/cierres.csv" download>Exportar CSV</a>
        }
        nota="La diferencia contra el contador expone lo que el total de ventas no puede explicar por sí solo. Una diferencia sostenida en el mismo sentido es la señal de que algo del proceso cambió."
      >
        <Tabla
          cols={[
            { t: 'Fecha' }, { t: 'Ventas', n: true }, { t: 'Total', n: true },
            { t: 'Und. helado', n: true }, { t: 'Contador', n: true },
            { t: 'Diferencia', n: true }, { t: 'Generado en', n: true },
          ]}
          filas={cierres.map((c) => [
            <>
              <span className="em">{fechaLarga(c.fecha)}</span>
              {c.demo && <> <span className="chip">histórico</span></>}
            </>,
            String(c.transacciones),
            cop(c.total),
            String(c.unidadesHelado),
            c.contadorMaquina == null ? <span className="muted">no ingresado</span> : String(c.contadorMaquina),
            c.diferencia == null ? '—' : `${c.diferencia > 0 ? '+' : ''}${c.diferencia}`,
            duracion(c.generadoEnMs),
          ])}
          vacio="Todavía no se ha generado ningún cierre. El tiempo de generación se mide aquí: es el indicador de OE2."
        />
      </Card>
    </>
  );
}
