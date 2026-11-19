# KOOLT · Operación

Sistema de **registro de ventas, control de inventario y gestión de compras** de
KOOLT — heladería de helado a base de yogurt y granizados en Cajicá, Cundinamarca.

---

## Poner en marcha

Hace falta una base **PostgreSQL**. Si el proyecto está enlazado a Vercel con la
integración de Neon instalada, la cadena de conexión se baja sola:

```bash
npx vercel env pull .env         # trae DATABASE_URL del proyecto
npm install
npm run setup                    # crea el esquema y siembra la base
npm run dev                      # http://localhost:3000
```

Sin Vercel: copie `.env.example` a `.env` y ponga su propia cadena
`postgres://…` antes de `npm install`.

> **El archivo es `.env`, no `.env.local`.** Next lee los dos, pero la CLI de
> Prisma y el script de siembra solo leen `.env`: con `.env.local`, `npm run setup`
> falla con `P1012 Environment variable not found: DATABASE_URL`. Créelo antes de
> `npm install`: el `postinstall` genera el cliente de Prisma, y un cliente generado
> sin `.env` presente no lo carga después.

`npm run setup` deja la base con el catálogo real de KOOLT y 21 días de histórico
reconstruido, para que la analítica y el cálculo del punto de reorden tengan sobre
qué trabajar desde el primer arranque.

Para un piloto en limpio, sin histórico:

```bash
DEMO=0 npm run db:reset
```

Otros comandos: `npm run build` (compilación de producción), `npm run db:reset`
(borra y vuelve a sembrar), `npm run db:seed`.

---

## Cuentas y acceso

El inicio de sesión lo maneja **Clerk** (integración del Marketplace de Vercel:
`CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` llegan con
`vercel env pull`). Las pantallas son `/ingresar` y `/registro`.

- **La primera cuenta que se registra queda como administración.** Para fijar de
  antemano quién lo es, defina `KOOLT_ADMIN_EMAILS` (correos separados por coma):
  esos correos entran como administración y el resto queda pendiente.
- Toda cuenta nueva entra **pendiente**: no ve datos del negocio hasta que un
  administrador la aprueba en **Equipo** y le asigna rol.
- **Mostrador** registra ventas y consulta el cierre. **Administración** ve y
  configura todo lo demás. El rol se verifica en el servidor en cada página y en cada
  ruta de la API, no solo en el menú.
- Nadie puede quitarse a sí mismo el acceso, y el local siempre conserva al menos un
  administrador habilitado.

---

## Desplegar en Vercel

> **Despliegue desde `koolt-app/`, no desde la carpeta que la contiene.** Si se
> ejecuta `vercel` un nivel arriba, Vercel no encuentra la aplicación: sube esa
> carpeta como sitio estático, el build dura tres segundos y la raíz responde
> **404 NOT_FOUND**. El archivo `.vercel/project.json` tiene que estar aquí.

```bash
cd koolt-app
npx vercel integration add neon   # aprovisiona Postgres y escribe DATABASE_URL
npx vercel env pull .env
npm run db:push && npm run db:seed   # crea el esquema y siembra la base remota
npx vercel --prod
```

El esquema y la siembra se aplican **desde la máquina local contra la base remota**:
`prisma db push` y el script de siembra no corren dentro de una función de Vercel.

Dos detalles que el despliegue necesita y ya están resueltos:

- `postinstall: prisma generate` — Vercel cachea `node_modules`, así que el cliente
  de Prisma hay que regenerarlo en cada build.
- Todas las rutas son dinámicas (`force-dynamic` o uso de `cookies()`), así que el
  build no consulta la base. Compila sin `DATABASE_URL`.

---

## El problema que resuelve

Hoy la venta en KOOLT no deja rastro: se anota un consolidado en papel durante el
turno, se transcribe a Excel y se entrega a contaduría, que concilia una vez al mes.
De ahí salen cinco problemas concretos del diagnóstico (Capítulo 2 del acta):

1. **La venta no deja rastro.** Presentación, topping, hora y valor se pierden sin
   posibilidad de reconstrucción.
2. **Medición parcial.** El contador de la máquina de helados es la única cifra
   objetiva, y la máquina de granizados no tiene contador: esa línea queda fuera de
   toda medición.
3. **Doble digitación.** Papel y luego Excel, todos los días, con tiempo del personal
   que también atiende al cliente.
4. **Sin analítica.** El Excel es un archivo de totales: no responde qué se vende, en
   qué día ni en qué hora.
5. **Desabastecimientos no previstos.** Sin descuento automático ni punto de reorden,
   los toppings se agotan sin aviso y la reposición es reactiva — un viaje adicional a
   Bogotá de unos $400.000.

El cambio que introduce la solución no es «digitalizar el Excel»: es **mover el punto
de captura al instante de la venta**. Eso elimina las dos transcripciones, cierra el
desfase de un mes y habilita tres consumidores del dato que antes no podían existir —
inventario, cierre y analítica.

---

## Módulos

| Módulo | Quién | Qué hace |
|---|---|---|
| **Venta** | Equipo | Pantalla de cobro con pocos toques por venta. Mide el tiempo real de registro y emite un comprobante interno con folio. |
| **Cierre diario** | Equipo | Consolidado generado por el sistema, con el contador de la máquina como control cruzado opcional. |
| **Inventario** | Administración | Existencias en tiempo real, alertas de punto de reorden, entradas, mermas, ajustes y conteo físico con desviación. |
| **Compras** | Administración | Sugerencia calculada sobre el consumo real, agrupada por proveedor; órdenes con origen trazado y registro de recepción. |
| **Analítica** | Administración | Venta diaria, franja horaria, mix por línea y adiciones más vendidas, con tabla equivalente y exportación a CSV. |
| **Indicadores** | Administración | Metas de operación (tiempo de registro, desviación de conteo, anticipación de alertas, agotamientos, compras sugeridas, capacitación) medidas sobre el uso real. |
| **Catálogo y recetas** | Administración | Precios, mínimos y la receta que define el consumo de cada presentación. |
| **Equipo** | Administración | Solicitudes de acceso, roles, capacitación y desactivación de cuentas. |

No incluye facturación electrónica ante la DIAN, integración con datáfono, delivery,
CRM, multi-sede ni nómina.

---

## Arquitectura

```
Navegador  ──►  App Router (React, SSR)        src/app/**/page.tsx
                      │
                      ▼
                Route handlers (API)           src/app/api/**/route.ts
                      │
                      ▼
                Capa de dominio                src/dominio/*.ts
                      │
                      ▼
                Prisma  ──►  SQLite            prisma/schema.prisma
```

### Dónde vive cada cosa

```
prisma/
  schema.prisma          Modelo de datos (12 entidades)
  seed.ts                Catálogo + 21 días de histórico reconstruido
src/
  dominio/               Reglas del negocio — sin React, sin HTTP
    constantes.ts        Ventana de consumo, margen de alerta, metas del piloto
    catalogo.ts          Catálogo inicial de KOOLT
    ventas.ts            registrarVenta() — la transacción
    inventario.ts        consumoDiario(), evaluar(), alertas(), sugerencia()
    movimientos.ts       Entradas, mermas, ajustes y conteos
    cierre.ts            resumenDelDia(), generarCierre()
    compras.ts           sugerenciasDeCompra(), crearOrden(), recibirOrden()
    reportes.ts          Series de los gráficos
    metricas.ts          Los diez indicadores del Capítulo 5.4
  app/api/               Rutas HTTP: validan la entrada y delegan al dominio
  app/<modulo>/page.tsx  Server Components: leen del dominio y pintan
  components/            Interfaz; los que llevan 'use client' son los interactivos
  lib/                   Prisma, formato colombiano, sesión, guardia de rol
```

Toda la lógica que **decide** algo —explotar la receta, calcular el punto de reorden,
consolidar el cierre— vive en `src/dominio`. No hay reglas del negocio en las páginas
ni en la base de datos: es el único lugar donde se cambia una regla.

### Decisiones y su alternativa descartada

**AD-01 · Desarrollo propio en lugar de un POS de mercado.** Loyverse cubre la venta,
pero el descuento de inventario por receta en unidades exactas exige plan de pago, que
la restricción presupuestal del proyecto no permite. Odoo se descartó por exceso de
funcionalidad y curva de adopción para un equipo de tres personas.

**AD-02 · El stock es un acumulado; los movimientos son la verdad.**
`Insumo.stock` existe para que la pantalla de venta sea rápida; `Movimiento` es el
libro de asientos que permite auditar cualquier desviación. Se descartó recalcular el
stock sumando movimientos en cada lectura: correcto, pero lento donde más importa.

**AD-03 · Un topping es un insumo con precio de adición, no un producto.**
`VentaLinea` apunta a `Producto` o a `Insumo` según su `tipo`. Así la misma referencia
se vende con precio y se descuenta del inventario, sin mantener dos catálogos
sincronizados.

**AD-04 · El contador de la máquina se ingresa a mano.** Los equipos no exponen
interfaz de conexión. Se usa como control cruzado en el cierre, nunca como fuente.

**AD-05 · Aplicación en línea, sin modo sin conexión.** Un modo offline con
sincronización duplicaría el esfuerzo del MVP. Riesgo aceptado: durante el piloto el
papel sigue como respaldo.

**AD-06 · Un solo saldo por referencia, no dos ubicaciones.** El MVP lleva el saldo
total —las bolsas del local más el saldo en bodega—, que es el que gobierna la compra;
la entrada documenta la reposición. Separar ubicaciones no está bloqueado por el
modelo.

**AD-07 · El margen de alerta es por insumo, no global.** El objetivo OE4 pide 10 días
de anticipación, pero exigírselos a la leche —que se compra cada tres días en Cajicá—
la dejaría en alerta permanente. `Insumo.margenAlerta` guarda el margen de cada
referencia: 10 días para la compra programada en Bogotá, 2 o 3 para lo local y
perecedero.

### Cómo se calcula el punto de reorden

```
consumo diario  =  Σ (receta × unidades vendidas en 14 días) ÷ 14
punto de reorden =  consumo diario × (plazo de entrega + margen de alerta)
compra sugerida  =  ⌈(consumo diario × 30 − stock) ÷ contenido del empaque⌉
```

No es un mínimo fijo escrito a mano: se recalcula con el consumo real, así que una
referencia que se acelera dispara su alerta antes. El margen de 10 días no es holgura
arbitraria — es el tiempo que necesita el propietario para que la compra quepa en un
viaje ya previsto en lugar de uno de urgencia.

---

## Base de datos

**PostgreSQL** (Neon en capa gratuita, aprovisionado por el Marketplace de Vercel), en
local y en producción: un solo esquema y un solo comportamiento.

La primera versión usaba SQLite en archivo por comodidad, y no sobrevive a Vercel: el
sistema de archivos de una función serverless es de **solo lectura**, y aquí cada venta
escribe en la base. Un archivo SQLite solo funciona si el proceso es de larga duración
y dueño de su disco.

### Zona horaria

El día de operación se calcula en `America/Bogota`, no en la zona del servidor
(`src/lib/formato.ts`). Vercel corre en UTC: sin esto, entre las 19:00 y la
medianoche —horas pico de una heladería— las ventas se atribuirían al día
siguiente y el cierre diario consolidaría el día equivocado. Colombia no aplica
horario de verano, así que el desfase es fijo en −05:00.

### Calibración contra el diagnóstico

El histórico sembrado y los stocks iniciales están calibrados contra las cifras de la
entrevista del Capítulo 2: alrededor de **100 ventas diarias** y entre **$4 y $4,5
millones mensuales en toppings** (la siembra produce ≈ $4,0 M). Al arrancar hay cuatro
referencias en alerta —una agotada, una crítica y dos por reordenar— para que el
módulo de inventario se vea en operación y no vacío.

### Qué es real y qué es histórico reconstruido

Las ventas y los cierres sembrados llevan `demo: true`. Los indicadores que miden la
**adopción** del sistema (OE1 y OE2) cuentan solo los registros reales, de modo que el
histórico no los infla. Los que miden el **estado de la operación** (consumo, cobertura,
punto de reorden, analítica) sí lo usan: es justamente para eso que existe.

---

## Equipo

Juan Pablo Aponte Veloza · Deivid Nicolás Urrea Lara · Andrés Mauricio Ricaurte López ·
Brandon Eduardo Merchán Sandoval

Docente: Mateo Barón Rojas · Patrocinador: Sebastián David Hernández Hernández (KOOLT)
