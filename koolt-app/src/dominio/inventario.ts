import { prisma } from '@/lib/db';
import { VENTANA_CONSUMO, MARGEN_ALERTA, COBERTURA_OBJETIVO, type EstadoInsumo } from './constantes';
import type { Insumo } from '@prisma/client';

export type InsumoEstado = {
  insumo: Insumo;
  /** Consumo promedio por día, en la unidad base del insumo. */
  consumoDiario: number;
  /** Días que alcanza el stock actual al ritmo de consumo observado. */
  cobertura: number;
  /** Nivel de stock en el que se dispara la alerta. */
  puntoReorden: number;
  /** Días de cobertura a los que se dispara la alerta: entrega + margen. */
  disparoDias: number;
  estado: EstadoInsumo;
};

/**
 * Consumo diario por insumo, calculado explotando la receta de cada producto
 * vendido y la porción de cada adición en la ventana de observación.
 *
 * No se lee de un contador acumulado: se recalcula sobre las ventas reales,
 * de modo que una referencia que se acelera dispara su alerta antes.
 */
export async function consumoDiario(ventanaDias = VENTANA_CONSUMO): Promise<Map<string, number>> {
  const corte = new Date(Date.now() - ventanaDias * 86_400_000);

  const [lineas, recetas, toppings] = await Promise.all([
    prisma.ventaLinea.findMany({
      where: { venta: { fechaHora: { gte: corte } } },
      select: { tipo: true, productoId: true, insumoId: true, cantidad: true },
    }),
    prisma.receta.findMany({ select: { productoId: true, insumoId: true, cantidad: true } }),
    prisma.insumo.findMany({ where: { esTopping: true }, select: { id: true, porcion: true } }),
  ]);

  const porProducto = new Map<string, { insumoId: string; cantidad: number }[]>();
  for (const r of recetas) {
    const lista = porProducto.get(r.productoId) ?? [];
    lista.push({ insumoId: r.insumoId, cantidad: r.cantidad });
    porProducto.set(r.productoId, lista);
  }
  const porcionDe = new Map(toppings.map((t) => [t.id, t.porcion ?? 0]));

  const acc = new Map<string, number>();
  const sumar = (id: string, v: number) => acc.set(id, (acc.get(id) ?? 0) + v);

  for (const l of lineas) {
    if (l.tipo === 'producto' && l.productoId) {
      for (const ing of porProducto.get(l.productoId) ?? []) sumar(ing.insumoId, ing.cantidad * l.cantidad);
    } else if (l.insumoId) {
      sumar(l.insumoId, (porcionDe.get(l.insumoId) ?? 0) * l.cantidad);
    }
  }

  const salida = new Map<string, number>();
  for (const [id, total] of acc) salida.set(id, total / ventanaDias);
  return salida;
}

export function evaluar(insumo: Insumo, consumo: number): InsumoEstado {
  const margen = insumo.margenAlerta ?? MARGEN_ALERTA;
  const cobertura = consumo > 0 ? insumo.stock / consumo : Infinity;
  const puntoReorden = consumo * (insumo.diasEntrega + margen);

  let estado: EstadoInsumo = 'ok';
  if (insumo.stock <= 0) estado = 'agotado';
  else if (cobertura <= insumo.diasEntrega) estado = 'critico';
  else if (insumo.stock <= puntoReorden || insumo.stock <= insumo.minimo) estado = 'reordenar';

  return { insumo, consumoDiario: consumo, cobertura, puntoReorden, disparoDias: insumo.diasEntrega + margen, estado };
}

/** Estado de todas las referencias, en el orden de presentación del catálogo. */
export async function estadoInventario(): Promise<InsumoEstado[]> {
  const [insumos, consumo] = await Promise.all([
    prisma.insumo.findMany({ orderBy: [{ orden: 'asc' }] }),
    consumoDiario(),
  ]);
  return insumos.map((i) => evaluar(i, consumo.get(i.id) ?? 0));
}

/** Lo que el cron horario convierte en notificación: las referencias en alerta. */
export function alertas(estados: InsumoEstado[]): InsumoEstado[] {
  return estados.filter((e) => e.estado !== 'ok').sort((a, b) => a.cobertura - b.cobertura);
}

export type Sugerencia = { insumoId: string; empaques: number; cantidad: number; costo: number };

/**
 * Cuánto comprar: lo que falta para cubrir el objetivo de días, redondeado
 * hacia arriba a la unidad de empaque del proveedor. No existe media bolsa.
 */
export function sugerencia(e: InsumoEstado, coberturaObjetivo = COBERTURA_OBJETIVO): Sugerencia | null {
  const falta = e.consumoDiario * coberturaObjetivo - e.insumo.stock;
  if (falta <= 0) return null;
  const empaques = Math.ceil(falta / e.insumo.contenido);
  return {
    insumoId: e.insumo.id,
    empaques,
    cantidad: empaques * e.insumo.contenido,
    costo: empaques * e.insumo.costoEmpaque,
  };
}

export function valorInventario(estados: InsumoEstado[]): number {
  return estados.reduce((a, e) => a + (e.insumo.stock / e.insumo.contenido) * e.insumo.costoEmpaque, 0);
}
