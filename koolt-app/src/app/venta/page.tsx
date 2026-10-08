import { prisma } from '@/lib/db';
import { rolActual } from '@/lib/sesion';
import { Encabezado, Chip } from '@/components/ui';
import { Pos, type ProductoVista, type ToppingVista } from '@/components/Pos';
import { folio as fmtFolio } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaVenta() {
  const [productos, insumos, ultimo, rol] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { orden: 'asc' }, include: { receta: true } }),
    prisma.insumo.findMany(),
    prisma.venta.aggregate({ _max: { folio: true } }),
    rolActual(),
  ]);

  const stockPor = new Map(insumos.map((i) => [i.id, i]));

  const vistaProductos: ProductoVista[] = productos.map((p) => {
    const faltante = p.receta.find((r) => (stockPor.get(r.insumoId)?.stock ?? 0) < r.cantidad);
    return {
      id: p.id, nombre: p.nombre, tamano: p.tamano, linea: p.linea, precio: p.precio,
      temporada: p.temporada,
      falta: faltante ? (stockPor.get(faltante.insumoId)?.nombre ?? null) : null,
    };
  });

  const vistaToppings: ToppingVista[] = insumos
    .filter((i) => i.esTopping && i.precioAdicion != null)
    .sort((a, b) => a.orden - b.orden)
    .map((i) => ({
      id: i.id, nombre: i.nombre, precioAdicion: i.precioAdicion!,
      disponible: i.stock >= (i.porcion ?? 0),
    }));

  const siguienteFolio = (ultimo._max.folio ?? 0) + 1;

  return (
    <>
      <Encabezado
        eyebrow="Proceso 1 · registro de ventas"
        titulo="Venta"
        sub="Toque el producto, agregue las adiciones y cobre. El registro queda con folio, hora y usuario: no hay papel intermedio ni transcripción posterior."
        acciones={
          <>
            <Chip tono="ac">{rol === 'admin' ? 'Sebastián' : 'Turno de mostrador'}</Chip>
            <Chip>Próximo folio {fmtFolio(siguienteFolio)}</Chip>
          </>
        }
      />
      <Pos productos={vistaProductos} toppings={vistaToppings} siguienteFolio={siguienteFolio} rol={rol} />
    </>
  );
}
