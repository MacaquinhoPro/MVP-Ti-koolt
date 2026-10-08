/**
 * Parámetros del negocio. Viven aquí y no esparcidos en el código porque son
 * los números que el propietario puede querer ajustar después del piloto.
 */

/** Ventana de consumo histórico con la que se calcula el consumo diario, en días. */
export const VENTANA_CONSUMO = 14;

/**
 * Días de anticipación que debe dar la alerta de reorden (objetivo OE4).
 * Los insumos de compra local y perecedera —leche, hielo, fruta de plaza—
 * definen el suyo en `Insumo.margenAlerta`: exigirles 10 días los dejaría en
 * alerta permanente, porque se compran cada dos o tres días por diseño.
 */
export const MARGEN_ALERTA = 10;

/** Días de consumo que debe cubrir una compra sugerida. */
export const COBERTURA_OBJETIVO = 30;

/** Líneas de producto que el sistema debe medir al 100 % (objetivo OE2b). */
export const LINEAS = ['Temporada', 'Vainilla', 'Mixto', 'Granizado'] as const;

export const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta'] as const;

/** Metas del piloto, capítulo 5.4 del acta de constitución. */
export const METAS = {
  segundosPorVenta: 30,
  segundosCierre: 120,
  desviacionConteoPct: 5,
  diasAnticipacion: 10,
  ordenesDesdeSugerenciaPct: 80,
  agotamientosPorMes: 3,
  ventasDigitalesPct: 95,
};

/** Costo de un viaje adicional de urgencia a Bogotá (diagnóstico 2.4). */
export const COSTO_VIAJE_URGENTE = 400_000;

export type EstadoInsumo = 'ok' | 'reordenar' | 'critico' | 'agotado';
