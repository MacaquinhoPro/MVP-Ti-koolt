import { sugerenciasDeCompra, ordenes } from '@/dominio/compras';
import { prisma } from '@/lib/db';
import { Encabezado, Kpi, Card, Seccion, Tabla, Chip, Aviso } from '@/components/ui';
import { Sugerencias, OrdenManual, BotonRecepcion, type GrupoSugerencia } from '@/components/ComprasForms';
import { cop, copCorto, fechaCorta } from '@/lib/formato';
import { COBERTURA_OBJETIVO, COSTO_VIAJE_URGENTE, VENTANA_CONSUMO } from '@/dominio/constantes';

import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

export default async function PaginaCompras() {
  await exigirAdmin();

  const [grupos, lista, insumos, nOrdenes, nSugeridas] = await Promise.all([
    sugerenciasDeCompra(),
    ordenes(),
    prisma.insumo.findMany({ orderBy: { orden: 'asc' } }),
    prisma.ordenCompra.count(),
    prisma.ordenCompra.count({ where: { origen: 'sugerencia' } }),
  ]);

  const vista: GrupoSugerencia[] = grupos.map((g) => ({
    proveedor: g.proveedor,
    costo: g.costo,
    items: g.items.map((i) => ({
      insumoId: i.insumoId, nombre: i.nombre, empaque: i.empaque, unidad: i.unidad,
      cobertura: i.cobertura, estado: i.estado,
      empaques: i.sugerencia.empaques, cantidad: i.sugerencia.cantidad, costoItem: i.sugerencia.costo,
    })),
  }));

  const totalSugerido = grupos.reduce((a, g) => a + g.costo, 0);
  const nReferencias = grupos.reduce((a, g) => a + g.items.length, 0);

  return (
    <>
      <Encabezado
        eyebrow="Proceso 7 · reabastecimiento"
        titulo="Compras"
        sub={`La sugerencia se calcula con el consumo real de los últimos ${VENTANA_CONSUMO} días y se redondea a la unidad de empaque del proveedor.`}
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Sugerencias abiertas" v={String(nReferencias)} f="referencias bajo su punto de reorden" acento={nReferencias > 0} />
        <Kpi k="Compra sugerida" v={copCorto(totalSugerido)} f={`cubre ${COBERTURA_OBJETIVO} días de consumo`} />
        <Kpi
          k="Órdenes registradas"
          v={String(nOrdenes)}
          f={nOrdenes ? `${nSugeridas} nacieron de una sugerencia` : 'ninguna todavía'}
        />
        <Kpi k="Viaje de urgencia evitado" v={cop(COSTO_VIAJE_URGENTE)} f="costo del viaje adicional a Bogotá (diagnóstico 2.4)" />
      </div>

      <Sugerencias grupos={vista} />

      <Seccion>Orden manual</Seccion>
      <OrdenManual
        insumos={insumos.map((i) => ({
          id: i.id, nombre: i.nombre, empaque: i.empaque, unidad: i.unidad,
          contenido: i.contenido, costoEmpaque: i.costoEmpaque,
        }))}
      />

      <Seccion>Órdenes de compra</Seccion>
      <Card>
        <Tabla
          cols={[
            { t: 'Orden' }, { t: 'Proveedor' }, { t: 'Líneas', n: true }, { t: 'Costo', n: true },
            { t: 'Origen' }, { t: 'Estado' }, { t: '' },
          ]}
          filas={lista.map((o) => [
            <>
              <span className="num">{o.codigo}</span>
              <br />
              <span className="tiny muted">{fechaCorta(o.creada)}</span>
            </>,
            o.proveedor,
            String(o.lineas.length),
            cop(o.lineas.reduce((a, l) => a + l.costo, 0)),
            <Chip tono={o.origen === 'sugerencia' ? 'ac' : undefined}>
              {o.origen === 'sugerencia' ? 'Sugerida por el sistema' : 'Manual'}
            </Chip>,
            <Chip tono={o.estado === 'recibida' ? 'ok' : 'warn'}>
              {o.estado === 'recibida' ? 'Recibida' : 'Enviada'}
            </Chip>,
            o.estado === 'recibida' ? (
              <span className="tiny muted">{o.recibida ? fechaCorta(o.recibida) : '—'}</span>
            ) : (
              <BotonRecepcion ordenId={o.id} codigo={o.codigo} />
            ),
          ])}
          vacio="Sin órdenes. La recepción de una orden genera las entradas de inventario correspondientes."
        />
        <div style={{ marginTop: 14 }}>
          <Aviso>
            La orden no mueve el inventario: lo mueve la <b>recepción</b>. Es lo que permite que el stock refleje lo
            que hay en el local y no lo que se pidió.
          </Aviso>
        </div>
      </Card>
    </>
  );
}
