/**
 * Catálogo inicial de KOOLT: insumos, productos y recetas.
 *
 * Es el punto de partida del piloto, no una tabla de constantes del código:
 * la base de datos es la fuente de verdad y el propietario puede editar
 * precios y mínimos desde la aplicación. Este archivo solo siembra.
 *
 * Los stocks iniciales están calibrados contra el diagnóstico del capítulo 2:
 * ~100 ventas diarias y entre $4 y $4,5 millones mensuales en toppings.
 */

export type InsumoSemilla = {
  id: string;
  nombre: string;
  unidad: 'L' | 'kg' | 'g' | 'und';
  empaque: string;
  contenido: number;
  costoEmpaque: number;
  diasEntrega: number;
  margenAlerta?: number;
  proveedor: string;
  minimo: number;
  stock: number;
  esTopping?: boolean;
  porcion?: number;
  precioAdicion?: number;
};

export const INSUMOS: InsumoSemilla[] = [
  { id: 'leche', nombre: 'Leche entera', unidad: 'L', empaque: 'caja de 16 L', contenido: 16, costoEmpaque: 78_000, diasEntrega: 1, margenAlerta: 2, proveedor: 'Lácteos Cajicá (local)', minimo: 4.3, stock: 18.3 },
  { id: 'base-tmp', nombre: 'Base de yogurt · temporada', unidad: 'L', empaque: 'garrafa de 10 L', contenido: 10, costoEmpaque: 132_000, diasEntrega: 5, proveedor: 'Yogurt Andino · Bogotá', minimo: 23.8, stock: 104.8 },
  { id: 'base-van', nombre: 'Base de yogurt · vainilla', unidad: 'L', empaque: 'garrafa de 10 L', contenido: 10, costoEmpaque: 126_000, diasEntrega: 5, proveedor: 'Yogurt Andino · Bogotá', minimo: 18.2, stock: 87.5 },
  { id: 'pulpa', nombre: 'Pulpa de fruta para granizado', unidad: 'L', empaque: 'bidón de 5 L', contenido: 5, costoEmpaque: 58_000, diasEntrega: 5, proveedor: 'Frutas del Valle · Bogotá', minimo: 15, stock: 77.9 },
  { id: 'hielo', nombre: 'Hielo en escamas', unidad: 'kg', empaque: 'bolsa de 10 kg', contenido: 10, costoEmpaque: 12_000, diasEntrega: 1, margenAlerta: 3, proveedor: 'Hielo Sabana (local)', minimo: 7.4, stock: 44.3 },

  { id: 't-mora', nombre: 'Mora en trozos', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 32_000, diasEntrega: 5, proveedor: 'Frutas del Valle · Bogotá', minimo: 4250, stock: 15_320, esTopping: true, porcion: 52, precioAdicion: 2500 },
  { id: 't-fresa', nombre: 'Fresa en trozos', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 30_000, diasEntrega: 5, proveedor: 'Frutas del Valle · Bogotá', minimo: 3500, stock: 9500, esTopping: true, porcion: 52, precioAdicion: 2500 },
  { id: 't-banano', nombre: 'Banano en rodajas', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 16_000, diasEntrega: 2, margenAlerta: 3, proveedor: 'Plaza de Cajicá (local)', minimo: 750, stock: 3340, esTopping: true, porcion: 48, precioAdicion: 1800 },
  { id: 't-areq', nombre: 'Arequipe', unidad: 'g', empaque: 'balde de 2 kg', contenido: 2000, costoEmpaque: 62_000, diasEntrega: 5, proveedor: 'Dulces El Trébol · Bogotá', minimo: 2850, stock: 13_640, esTopping: true, porcion: 46, precioAdicion: 2500 },
  { id: 't-salsa', nombre: 'Salsa de mora', unidad: 'g', empaque: 'frasco de 1,5 kg', contenido: 1500, costoEmpaque: 46_000, diasEntrega: 5, proveedor: 'Dulces El Trébol · Bogotá', minimo: 1000, stock: 5920, esTopping: true, porcion: 35, precioAdicion: 2000 },
  { id: 't-choco', nombre: 'Granillo de chocolate', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 42_000, diasEntrega: 5, proveedor: 'Insumos Repostería · Bogotá', minimo: 1850, stock: 4060, esTopping: true, porcion: 34, precioAdicion: 2200 },
  { id: 't-galleta', nombre: 'Galleta en trozos', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 38_000, diasEntrega: 5, proveedor: 'Insumos Repostería · Bogotá', minimo: 2200, stock: 9620, esTopping: true, porcion: 40, precioAdicion: 2200 },
  { id: 't-brownie', nombre: 'Brownie en cubos', unidad: 'g', empaque: 'bandeja de 1,2 kg', contenido: 1200, costoEmpaque: 54_000, diasEntrega: 5, proveedor: 'Insumos Repostería · Bogotá', minimo: 1700, stock: 1480, esTopping: true, porcion: 38, precioAdicion: 2800 },
  { id: 't-mani', nombre: 'Maní tostado', unidad: 'g', empaque: 'bolsa de 1 kg', contenido: 1000, costoEmpaque: 28_000, diasEntrega: 5, proveedor: 'Insumos Repostería · Bogotá', minimo: 500, stock: 0, esTopping: true, porcion: 28, precioAdicion: 1800 },
  { id: 't-chips', nombre: 'Chips de colores', unidad: 'g', empaque: 'bolsa de 800 g', contenido: 800, costoEmpaque: 26_000, diasEntrega: 5, proveedor: 'Insumos Repostería · Bogotá', minimo: 900, stock: 5060, esTopping: true, porcion: 25, precioAdicion: 1500 },

  { id: 'vaso-8', nombre: 'Vaso de 8 oz', unidad: 'und', empaque: 'paquete de 50', contenido: 50, costoEmpaque: 7800, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 110, stock: 660 },
  { id: 'vaso-12', nombre: 'Vaso de 12 oz', unidad: 'und', empaque: 'paquete de 50', contenido: 50, costoEmpaque: 9400, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 370, stock: 1860 },
  { id: 'vaso-16', nombre: 'Vaso de 16 oz', unidad: 'und', empaque: 'paquete de 50', contenido: 50, costoEmpaque: 11_200, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 50, stock: 350 },
  { id: 'cuchara', nombre: 'Cuchara plástica', unidad: 'und', empaque: 'paquete de 100', contenido: 100, costoEmpaque: 6200, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 380, stock: 2140 },
  { id: 'pitillo', nombre: 'Pitillo grueso', unidad: 'und', empaque: 'paquete de 100', contenido: 100, costoEmpaque: 5400, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 150, stock: 900 },
  { id: 'servilleta', nombre: 'Servilleta', unidad: 'und', empaque: 'paquete de 500', contenido: 500, costoEmpaque: 8600, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 530, stock: 2130 },
  { id: 'tapa', nombre: 'Tapa para vaso', unidad: 'und', empaque: 'paquete de 50', contenido: 50, costoEmpaque: 6800, diasEntrega: 5, proveedor: 'Desechables Norte · Bogotá', minimo: 150, stock: 780 },
];

export type ProductoSemilla = {
  id: string;
  nombre: string;
  tamano: string;
  linea: string;
  precio: number;
  temporada?: boolean;
  /** Peso en la generación del histórico de demostración. */
  peso: number;
  receta: { insumoId: string; cantidad: number }[];
};

export const PRODUCTOS: ProductoSemilla[] = [
  {
    id: 'p-t12', nombre: 'Helado de temporada · mora', tamano: '12 oz', linea: 'Temporada', precio: 9500, temporada: true, peso: 0.22,
    receta: [
      { insumoId: 'base-tmp', cantidad: 0.12 }, { insumoId: 'leche', cantidad: 0.06 },
      { insumoId: 'vaso-12', cantidad: 1 }, { insumoId: 'cuchara', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-t8', nombre: 'Helado de temporada · mora', tamano: '8 oz', linea: 'Temporada', precio: 7500, temporada: true, peso: 0.12,
    receta: [
      { insumoId: 'base-tmp', cantidad: 0.085 }, { insumoId: 'leche', cantidad: 0.045 },
      { insumoId: 'vaso-8', cantidad: 1 }, { insumoId: 'cuchara', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-v12', nombre: 'Helado de vainilla', tamano: '12 oz', linea: 'Vainilla', precio: 9000, peso: 0.16,
    receta: [
      { insumoId: 'base-van', cantidad: 0.12 }, { insumoId: 'leche', cantidad: 0.06 },
      { insumoId: 'vaso-12', cantidad: 1 }, { insumoId: 'cuchara', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-v8', nombre: 'Helado de vainilla', tamano: '8 oz', linea: 'Vainilla', precio: 7000, peso: 0.08,
    receta: [
      { insumoId: 'base-van', cantidad: 0.085 }, { insumoId: 'leche', cantidad: 0.045 },
      { insumoId: 'vaso-8', cantidad: 1 }, { insumoId: 'cuchara', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-m12', nombre: 'Helado mixto', tamano: '12 oz', linea: 'Mixto', precio: 9800, peso: 0.14,
    receta: [
      { insumoId: 'base-tmp', cantidad: 0.06 }, { insumoId: 'base-van', cantidad: 0.06 }, { insumoId: 'leche', cantidad: 0.06 },
      { insumoId: 'vaso-12', cantidad: 1 }, { insumoId: 'cuchara', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-g12', nombre: 'Granizado', tamano: '12 oz', linea: 'Granizado', precio: 8500, peso: 0.18,
    receta: [
      { insumoId: 'pulpa', cantidad: 0.09 }, { insumoId: 'hielo', cantidad: 0.22 },
      { insumoId: 'vaso-12', cantidad: 1 }, { insumoId: 'pitillo', cantidad: 1 }, { insumoId: 'tapa', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
  {
    id: 'p-g16', nombre: 'Granizado', tamano: '16 oz', linea: 'Granizado', precio: 10_500, peso: 0.10,
    receta: [
      { insumoId: 'pulpa', cantidad: 0.12 }, { insumoId: 'hielo', cantidad: 0.30 },
      { insumoId: 'vaso-16', cantidad: 1 }, { insumoId: 'pitillo', cantidad: 1 }, { insumoId: 'tapa', cantidad: 1 }, { insumoId: 'servilleta', cantidad: 1 },
    ],
  },
];

export const USUARIOS = [
  { id: 'u-seb', nombre: 'Sebastián Hernández', rol: 'admin' },
  { id: 'u-cam', nombre: 'Camila · mostrador', rol: 'mostrador' },
  { id: 'u-and', nombre: 'Andrés · mostrador', rol: 'mostrador' },
];

/** Probabilidad de cada topping en el histórico de demostración. */
export const PESO_TOPPINGS: Record<string, number> = {
  't-mora': 0.17, 't-fresa': 0.14, 't-areq': 0.13, 't-choco': 0.12, 't-galleta': 0.10,
  't-brownie': 0.09, 't-banano': 0.08, 't-salsa': 0.07, 't-chips': 0.06, 't-mani': 0.04,
};

/** Distribución de la venta por hora, de 11:00 a 21:00. */
export const PESO_HORAS: Record<number, number> = {
  11: 0.045, 12: 0.07, 13: 0.075, 14: 0.08, 15: 0.115, 16: 0.135,
  17: 0.145, 18: 0.13, 19: 0.10, 20: 0.065, 21: 0.04,
};
