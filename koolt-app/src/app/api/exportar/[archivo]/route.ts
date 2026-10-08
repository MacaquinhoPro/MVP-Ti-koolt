import { prisma } from '@/lib/db';
import { folio as fmtFolio, hora } from '@/lib/formato';

/**
 * Exportación para contaduría. Punto y coma como separador y BOM al inicio:
 * es lo que Excel en configuración regional colombiana abre sin preguntar
 * nada, que es la diferencia entre un archivo útil y uno que hay que arreglar
 * a mano antes de enviarlo.
 */
function csv(filas: (string | number | null)[][]): string {
  return filas
    .map((f) =>
      f
        .map((c) => {
          const s = String(c ?? '');
          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\r\n');
}

function respuesta(nombre: string, contenido: string) {
  return new Response('﻿' + contenido, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nombre}"`,
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;

  if (archivo === 'ventas.csv') {
    const ventas = await prisma.venta.findMany({
      orderBy: { fechaHora: 'asc' },
      include: {
        lineas: { include: { producto: true, insumo: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
      },
    });
    const filas: (string | number | null)[][] = [[
      'folio', 'fecha', 'hora', 'linea', 'tipo', 'descripcion', 'cantidad',
      'precio_unitario', 'total_linea', 'medio_pago', 'usuario', 'origen',
    ]];
    for (const v of ventas) {
      v.lineas.forEach((l, i) => {
        const nombre = l.producto ? `${l.producto.nombre} ${l.producto.tamano}` : (l.insumo?.nombre ?? '');
        filas.push([
          fmtFolio(v.folio), v.fechaHora.toISOString().slice(0, 10), hora(v.fechaHora), i + 1,
          l.tipo, nombre, l.cantidad, l.precioUnitario, l.precioUnitario * l.cantidad,
          v.medioPago, v.usuario.nombre, v.demo ? 'histórico reconstruido' : 'registrada en el sistema',
        ]);
      });
    }
    return respuesta('koolt-ventas.csv', csv(filas));
  }

  if (archivo === 'cierres.csv') {
    const cierres = await prisma.cierreDiario.findMany({ orderBy: { fecha: 'asc' } });
    const filas: (string | number | null)[][] = [[
      'fecha', 'transacciones', 'total', 'unidades_helado', 'unidades_granizado',
      'contador_maquina', 'diferencia', 'generado_en_ms', 'origen',
    ]];
    for (const c of cierres) {
      filas.push([
        c.fecha.toISOString().slice(0, 10), c.transacciones, c.total, c.unidadesHelado,
        c.unidadesGranizado, c.contadorMaquina, c.diferencia, c.generadoEnMs,
        c.demo ? 'histórico reconstruido' : 'generado en el sistema',
      ]);
    }
    return respuesta('koolt-cierres.csv', csv(filas));
  }

  if (archivo === 'inventario.csv') {
    const insumos = await prisma.insumo.findMany({ orderBy: { orden: 'asc' } });
    const filas: (string | number | null)[][] = [[
      'insumo', 'unidad', 'stock', 'minimo', 'empaque', 'contenido_empaque',
      'costo_empaque', 'dias_entrega', 'proveedor',
    ]];
    for (const i of insumos) {
      filas.push([i.nombre, i.unidad, i.stock, i.minimo, i.empaque, i.contenido, i.costoEmpaque, i.diasEntrega, i.proveedor]);
    }
    return respuesta('koolt-inventario.csv', csv(filas));
  }

  return new Response('Archivo no disponible', { status: 404 });
}
