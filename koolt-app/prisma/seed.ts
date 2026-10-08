/**
 * Siembra la base de datos del piloto.
 *
 * Carga el catálogo real de KOOLT y, además, reconstruye 21 días de histórico
 * para que la analítica y el cálculo de punto de reorden tengan sobre qué
 * trabajar antes del primer día de operación. Esas ventas quedan marcadas con
 * `demo: true`: los indicadores que miden la adopción del sistema (OE1, OE2)
 * solo cuentan las ventas reales, de modo que el histórico no las infla.
 *
 * Para empezar un piloto limpio: npm run db:reset y borrar el bloque demo, o
 * ejecutar `DEMO=0 npm run db:seed`.
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { INSUMOS, PRODUCTOS, USUARIOS, PESO_HORAS, PESO_TOPPINGS } from '../src/dominio/catalogo';

const prisma = new PrismaClient();
const DIAS_DEMO = 21;
const CON_DEMO = process.env.DEMO !== '0';

/** Generador determinista: el mismo histórico en cada siembra. */
function rng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function elegir<T>(rand: () => number, items: T[], pesos: number[]): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let x = rand() * total;
  for (let i = 0; i < items.length; i++) {
    x -= pesos[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function main() {
  console.log('Limpiando…');
  await prisma.$transaction([
    prisma.ventaLinea.deleteMany(),
    prisma.venta.deleteMany(),
    prisma.movimiento.deleteMany(),
    prisma.conteo.deleteMany(),
    prisma.eventoAgotamiento.deleteMany(),
    prisma.ordenLinea.deleteMany(),
    prisma.ordenCompra.deleteMany(),
    prisma.cierreDiario.deleteMany(),
    prisma.receta.deleteMany(),
    prisma.producto.deleteMany(),
    prisma.insumo.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);

  console.log('Usuarios, insumos y productos…');
  await prisma.usuario.createMany({
    data: USUARIOS.map((u) => ({ ...u, capacitado: false })),
  });
  await prisma.insumo.createMany({
    data: INSUMOS.map((i, orden) => ({
      id: i.id, nombre: i.nombre, unidad: i.unidad, stock: i.stock, minimo: i.minimo,
      empaque: i.empaque, contenido: i.contenido, costoEmpaque: i.costoEmpaque,
      diasEntrega: i.diasEntrega, margenAlerta: i.margenAlerta ?? 10, proveedor: i.proveedor,
      esTopping: i.esTopping ?? false, porcion: i.porcion ?? null,
      precioAdicion: i.precioAdicion ?? null, orden,
    })),
  });
  await prisma.producto.createMany({
    data: PRODUCTOS.map((p, orden) => ({
      id: p.id, nombre: p.nombre, tamano: p.tamano, linea: p.linea,
      precio: p.precio, temporada: p.temporada ?? false, orden,
    })),
  });
  await prisma.receta.createMany({
    data: PRODUCTOS.flatMap((p) => p.receta.map((r) => ({ productoId: p.id, insumoId: r.insumoId, cantidad: r.cantidad }))),
  });

  if (!CON_DEMO) {
    console.log('Listo (sin histórico de demostración).');
    return;
  }

  console.log(`Reconstruyendo ${DIAS_DEMO} días de histórico…`);
  const rand = rng(20_260_821);
  const horas = Object.keys(PESO_HORAS).map(Number);
  const pesoHoras = horas.map((h) => PESO_HORAS[h]);
  const toppingIds = Object.keys(PESO_TOPPINGS);
  const pesoToppings = toppingIds.map((t) => PESO_TOPPINGS[t]);
  const productoIds = PRODUCTOS.map((p) => p.id);
  const pesoProductos = PRODUCTOS.map((p) => p.peso);
  const precioProducto = new Map(PRODUCTOS.map((p) => [p.id, p.precio]));
  const lineaProducto = new Map(PRODUCTOS.map((p) => [p.id, p.linea]));
  const precioAdicion = new Map(INSUMOS.filter((i) => i.esTopping).map((i) => [i.id, i.precioAdicion!]));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ahora = new Date().getHours();

  type VentaPlana = {
    id: string; folio: number; fechaHora: Date; usuarioId: string; medioPago: string;
    total: number; duracionMs: number;
    lineas: { tipo: string; productoId: string | null; insumoId: string | null; cantidad: number; precioUnitario: number }[];
  };
  const ventas: VentaPlana[] = [];
  let folio = 0;

  for (let d = DIAS_DEMO; d >= 0; d--) {
    const dia = new Date(hoy.getTime() - d * 86_400_000);
    const dow = dia.getDay();
    const base = 96 + (dow === 0 ? 26 : dow === 6 ? 34 : dow === 5 ? 16 : dow === 1 ? -18 : 0);
    let n = Math.max(40, Math.round(base + (rand() - 0.5) * 22));
    if (d === 0) {
      const fraccion = horas.filter((h) => h < ahora).reduce((a, h) => a + PESO_HORAS[h], 0);
      n = Math.round(n * fraccion);
    }

    for (let k = 0; k < n; k++) {
      const h = elegir(rand, horas, pesoHoras);
      const fechaHora = new Date(dia);
      fechaHora.setHours(h, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      if (fechaHora.getTime() > Date.now()) continue;

      const pid = elegir(rand, productoIds, pesoProductos);
      const precio = precioProducto.get(pid)!;
      const lineas: VentaPlana['lineas'] = [
        { tipo: 'producto', productoId: pid, insumoId: null, cantidad: 1, precioUnitario: precio },
      ];
      let total = precio;

      const esGranizado = lineaProducto.get(pid) === 'Granizado';
      const cuantas = esGranizado
        ? (rand() < 0.35 ? 1 : 0)
        : (rand() < 0.17 ? 0 : rand() < 0.62 ? 1 : rand() < 0.9 ? 2 : 3);
      const usados = new Set<string>();
      for (let j = 0; j < cuantas; j++) {
        const tid = elegir(rand, toppingIds, pesoToppings);
        if (usados.has(tid)) continue;
        usados.add(tid);
        const pa = precioAdicion.get(tid)!;
        lineas.push({ tipo: 'adicion', productoId: null, insumoId: tid, cantidad: 1, precioUnitario: pa });
        total += pa;
      }

      ventas.push({
        id: randomUUID(),
        folio: ++folio,
        fechaHora,
        usuarioId: rand() < 0.5 ? 'u-cam' : 'u-and',
        medioPago: elegir(rand, ['Efectivo', 'Transferencia', 'Tarjeta'], [0.52, 0.33, 0.15]),
        total,
        duracionMs: Math.round(17_000 + rand() * 26_000),
        lineas,
      });
    }
  }

  ventas.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime());
  ventas.forEach((v, i) => { v.folio = i + 1; });

  // Las ventas del histórico NO descuentan inventario: los stocks sembrados ya
  // son el saldo actual. Lo que el histórico aporta es el ritmo de consumo.
  //
  // Dos inserciones masivas en lugar de ~2.200 escrituras anidadas: contra una
  // base remota, la diferencia es entre unos segundos y varios minutos.
  const LOTE = 500;
  for (let i = 0; i < ventas.length; i += LOTE) {
    const trozo = ventas.slice(i, i + LOTE);
    await prisma.venta.createMany({
      data: trozo.map((v) => ({
        id: v.id, folio: v.folio, fechaHora: v.fechaHora, usuarioId: v.usuarioId,
        medioPago: v.medioPago, total: v.total, duracionMs: v.duracionMs, demo: true,
      })),
    });
    await prisma.ventaLinea.createMany({
      data: trozo.flatMap((v) => v.lineas.map((l) => ({ id: randomUUID(), ventaId: v.id, ...l }))),
    });
    process.stdout.write(`  ${Math.min(i + LOTE, ventas.length)}/${ventas.length}\r`);
  }
  console.log(`\n  ${ventas.length} ventas sembradas`);

  // Cierres de los cinco días anteriores, con su contraste contra el contador.
  console.log('Cierres históricos…');
  for (let d = 5; d >= 1; d--) {
    const fecha = new Date(hoy.getTime() - d * 86_400_000);
    const hasta = new Date(fecha.getTime() + 86_400_000);
    const delDia = ventas.filter((v) => v.fechaHora >= fecha && v.fechaHora < hasta);
    if (!delDia.length) continue;
    let helado = 0, granizado = 0;
    for (const v of delDia) {
      for (const l of v.lineas) {
        if (l.tipo !== 'producto' || !l.productoId) continue;
        if (lineaProducto.get(l.productoId) === 'Granizado') granizado += l.cantidad;
        else helado += l.cantidad;
      }
    }
    const contador = helado + (d % 2 ? 1 : -1) * (1 + (d % 3));
    await prisma.cierreDiario.create({
      data: {
        fecha, transacciones: delDia.length, total: delDia.reduce((a, v) => a + v.total, 0),
        unidadesHelado: helado, unidadesGranizado: granizado,
        contadorMaquina: contador, diferencia: helado - contador,
        generadoEnMs: 780 + d * 140, demo: true,
      },
    });
  }

  console.log('Listo.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
