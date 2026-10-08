import { estadoInventario, alertas, sugerencia, valorInventario } from '@/dominio/inventario';
import { movimientosRecientes, conteosRecientes } from '@/dominio/movimientos';
import { prisma } from '@/lib/db';
import { Encabezado, Kpi, Card, Seccion, Tabla, ChipEstado, Chip, Medidor } from '@/components/ui';
import { InventarioForms } from '@/components/InventarioForms';
import { GraficoCobertura, ConTabla } from '@/components/Graficos';
import { cantidad as fmtCantidad, cop, copCorto, dec, fechaCorta, hora } from '@/lib/formato';
import { MARGEN_ALERTA } from '@/dominio/constantes';
import Link from 'next/link';

import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

const ETIQUETA_MOV: Record<string, string> = {
  venta: 'Venta', entrada: 'Entrada', merma: 'Merma', ajuste: 'Ajuste', conteo: 'Conteo físico',
};

export default async function PaginaInventario() {
  await exigirAdmin();

  const [estados, movimientos, conteos, nConteos] = await Promise.all([
    estadoInventario(),
    movimientosRecientes(15),
    conteosRecientes(6),
    prisma.conteo.count(),
  ]);

  const enAlerta = alertas(estados);
  const agotadas = estados.filter((e) => e.insumo.stock <= 0).length;
  const desviacion = conteos.length
    ? conteos.reduce((a, c) => a + Math.abs(c.desviacionPct), 0) / conteos.length
    : null;

  const cobertura = estados
    .filter((e) => Number.isFinite(e.cobertura))
    .sort((a, b) => a.cobertura - b.cobertura)
    .slice(0, 12)
    .map((e) => ({ nombre: e.insumo.nombre, cobertura: e.cobertura, disparo: e.disparoDias, estado: e.estado }));

  return (
    <>
      <Encabezado
        eyebrow="Procesos 5 y 6 · existencias y reorden"
        titulo="Inventario"
        sub={`Existencias en tiempo real: cada venta descuenta los ingredientes por receta. La alerta se dispara ${MARGEN_ALERTA} días antes del agotamiento proyectado.`}
        acciones={<a className="btn btn-sm" href="/api/exportar/inventario.csv" download>Exportar CSV</a>}
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Referencias en alerta" v={String(enAlerta.length)} f={`de ${estados.length} referencias controladas`} acento={enAlerta.length > 0} />
        <Kpi k="Agotadas ahora" v={String(agotadas)} f="stock en cero" />
        <Kpi k="Valor del inventario" v={copCorto(valorInventario(estados))} f="a costo de última compra" />
        <Kpi
          k="Conteos registrados"
          v={String(nConteos)}
          f={desviacion == null ? 'ninguno todavía' : `desviación promedio ${dec(desviacion)} %`}
        />
      </div>

      <Card titulo="Alertas de punto de reorden" derecha={<Chip tono="ac">margen exigido: {MARGEN_ALERTA} días</Chip>}>
        {enAlerta.length ? (
          enAlerta.map((e) => {
            const s = sugerencia(e);
            const margen = e.cobertura - e.insumo.diasEntrega;
            return (
              <div className="inv-r" key={e.insumo.id}>
                <div className="nm">
                  {e.insumo.nombre}
                  <em>{e.insumo.proveedor} · entrega en {e.insumo.diasEntrega} día{e.insumo.diasEntrega === 1 ? '' : 's'}</em>
                </div>
                <div><ChipEstado estado={e.estado} /></div>
                <div className="num tiny">
                  {Number.isFinite(e.cobertura) ? `${dec(e.cobertura)} días` : 'sin consumo'}
                  <br />
                  <span className="muted">{fmtCantidad(e.insumo.stock, e.insumo.unidad)}</span>
                </div>
                <div className="tiny muted">
                  {Number.isFinite(e.cobertura)
                    ? margen >= MARGEN_ALERTA
                      ? `Alerta con ${margen.toFixed(0)} días de margen`
                      : `Margen de solo ${dec(Math.max(margen, 0))} días: alcanza para ${dec(e.cobertura)} días y el proveedor tarda ${e.insumo.diasEntrega}`
                    : `Mínimo de ${fmtCantidad(e.insumo.minimo, e.insumo.unidad)} no alcanzado`}
                </div>
                <div>
                  {s ? (
                    <Link className="btn btn-sm" href="/compras">
                      Comprar {s.empaques} {s.empaques === 1 ? 'empaque' : 'empaques'}
                    </Link>
                  ) : (
                    <span className="tiny muted">—</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">Ninguna referencia por debajo de su punto de reorden.</div>
        )}
      </Card>

      <Seccion>Registrar un movimiento</Seccion>
      <InventarioForms
        insumos={estados.map((e) => ({ id: e.insumo.id, nombre: e.insumo.nombre, unidad: e.insumo.unidad, stock: e.insumo.stock }))}
        conteos={conteos.map((c) => ({
          id: c.id, nombre: c.insumo.nombre, unidad: c.insumo.unidad,
          sistema: c.segunSistema, fisico: c.conteoFisico, desviacion: c.desviacionPct,
        }))}
      />

      <Seccion>Existencias</Seccion>
      <Card>
        {estados.map((e) => {
          const tope = Math.max(e.insumo.minimo * 2.2, e.insumo.stock, e.puntoReorden * 1.1, 1);
          return (
            <div className="inv-r" key={e.insumo.id}>
              <div className="nm">
                {e.insumo.nombre}
                <em>{e.insumo.empaque} · {e.insumo.proveedor}</em>
              </div>
              <div><ChipEstado estado={e.estado} /></div>
              <div className="num tiny">
                {fmtCantidad(e.insumo.stock, e.insumo.unidad)}
                <br />
                <span className="muted">
                  {Number.isFinite(e.cobertura) ? `${dec(e.cobertura)} d` : '—'} de cobertura
                </span>
              </div>
              <div>
                <Medidor valor={e.insumo.stock} minimo={e.insumo.minimo} tope={tope} estado={e.estado} />
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  consumo {fmtCantidad(e.consumoDiario, e.insumo.unidad)}/día · reorden a {fmtCantidad(e.puntoReorden, e.insumo.unidad)}
                </div>
              </div>
              <div className="tiny muted">{cop(e.insumo.costoEmpaque)} / {e.insumo.empaque}</div>
            </div>
          );
        })}
      </Card>

      <Seccion>Cobertura por insumo</Seccion>
      <Card
        titulo="Días que alcanza el stock actual"
        derecha={<span className="tiny muted">la marca vertical es el punto de reorden de cada referencia</span>}
      >
        <ConTabla
          grafico={<GraficoCobertura items={cobertura} />}
          tabla={
            <Tabla
              cols={[{ t: 'Insumo' }, { t: 'Cobertura (días)', n: true }, { t: 'Se alerta a los (días)', n: true }, { t: 'Estado' }]}
              filas={cobertura.map((c) => [c.nombre, dec(c.cobertura), String(c.disparo), c.estado])}
            />
          }
        />
      </Card>

      <Seccion>Movimientos recientes</Seccion>
      <Card>
        <Tabla
          cols={[{ t: 'Hora' }, { t: 'Insumo' }, { t: 'Tipo' }, { t: 'Cantidad', n: true }, { t: 'Referencia' }]}
          filas={movimientos.map((m) => [
            <>
              {hora(m.fechaHora)} <span className="muted">{fechaCorta(m.fechaHora)}</span>
            </>,
            m.insumo.nombre,
            ETIQUETA_MOV[m.tipo] ?? m.tipo,
            `${m.cantidad < 0 ? '−' : '+'}${fmtCantidad(Math.abs(m.cantidad), m.insumo.unidad)}`,
            m.referencia,
          ])}
          vacio="Sin movimientos. Registre una venta o una entrada para ver el libro de asientos."
        />
      </Card>
    </>
  );
}
