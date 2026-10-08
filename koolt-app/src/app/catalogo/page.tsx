import { prisma } from '@/lib/db';
import { Encabezado, Card, Seccion, Tabla, Aviso, Chip } from '@/components/ui';
import { CampoNumero } from '@/components/CatalogoEdit';
import { cantidad as fmtCantidad, cop, dec } from '@/lib/formato';

import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

export default async function PaginaCatalogo() {
  await exigirAdmin();

  const [productos, insumos] = await Promise.all([
    prisma.producto.findMany({ orderBy: { orden: 'asc' }, include: { receta: { include: { insumo: true } } } }),
    prisma.insumo.findMany({ orderBy: { orden: 'asc' } }),
  ]);

  return (
    <>
      <Encabezado
        eyebrow="Procesos 3 y 4 · maestros"
        titulo="Catálogo y recetas"
        sub="Productos, precios y la receta que define cuánto consume cada presentación. Sin receta no hay descuento automático de inventario."
      />

      <div style={{ marginBottom: 18 }}>
        <Aviso acento>
          La receta es la pieza que convierte una venta en un movimiento de inventario. Cambiar una cantidad aquí
          cambia el consumo proyectado, el punto de reorden y la sugerencia de compra de ese insumo: por eso es una
          entidad del modelo de datos y no una hoja de cálculo aparte.
        </Aviso>
      </div>

      <Card
        titulo="Productos, precio y receta"
        derecha={<span className="tiny muted">el margen descuenta ingredientes e insumos de servicio</span>}
      >
        <Tabla
          cols={[
            { t: 'Producto' }, { t: 'Precio', n: true }, { t: 'Costo de receta', n: true },
            { t: 'Margen', n: true }, { t: 'Consume por unidad' },
          ]}
          filas={productos.map((p) => {
            const costo = p.receta.reduce((a, r) => a + (r.cantidad / r.insumo.contenido) * r.insumo.costoEmpaque, 0);
            const margen = ((p.precio - costo) / p.precio) * 100;
            return [
              <>
                <span className="em">{p.nombre}</span>
                {p.temporada && <> <Chip tono="ac">temporada</Chip></>}
                <br />
                <span className="tiny muted">{p.tamano} · {p.linea}</span>
              </>,
              <CampoNumero valor={p.precio} campo="precio" id={p.id} />,
              cop(costo),
              <span style={{ color: margen >= 60 ? 'var(--good)' : 'var(--warn)' }}>{dec(margen)} %</span>,
              <span className="tiny">
                {p.receta.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ' · '}
                    {r.insumo.nombre} <span className="muted">{fmtCantidad(r.cantidad, r.insumo.unidad)}</span>
                  </span>
                ))}
              </span>,
            ];
          })}
        />
      </Card>

      <Seccion>Insumos</Seccion>
      <Card>
        <Tabla
          cols={[
            { t: 'Insumo' }, { t: 'Unidad' }, { t: 'Empaque' }, { t: 'Costo del empaque', n: true },
            { t: 'Entrega', n: true }, { t: 'Alerta', n: true }, { t: 'Mínimo', n: true }, { t: 'Precio de adición', n: true },
          ]}
          filas={insumos.map((i) => [
            <>
              <span className="em">{i.nombre}</span>
              <br />
              <span className="tiny muted">{i.proveedor}</span>
            </>,
            i.unidad,
            i.empaque,
            cop(i.costoEmpaque),
            `${i.diasEntrega} d`,
            `+${i.margenAlerta} d`,
            <CampoNumero valor={i.minimo} campo="minimo" id={i.id} paso={10} ancho={94} />,
            i.esTopping && i.precioAdicion != null ? (
              <>
                {cop(i.precioAdicion)} <span className="tiny muted">/ {i.porcion} {i.unidad}</span>
              </>
            ) : (
              <span className="muted">—</span>
            ),
          ])}
        />
        <div style={{ marginTop: 14 }}>
          <Aviso>
            La columna <b>Alerta</b> es el margen de anticipación que exige cada referencia. Los insumos de compra
            programada en Bogotá usan los 10 días del objetivo OE4; la leche, el hielo y la fruta de plaza usan un
            margen corto porque se compran cada dos o tres días por diseño — pedirles 10 días las dejaría en alerta
            permanente.
          </Aviso>
        </div>
      </Card>
    </>
  );
}
