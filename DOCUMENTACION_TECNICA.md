# Documentación técnica · KOOLT Operación

Sistema de registro de ventas, control de inventario y gestión de compras de KOOLT.
Aplicación en `koolt-app/` (paquete npm `koolt-operacion`, versión `0.1.0`).

Este documento describe la aplicación **tal como está en el código**. Está pensado para
un desarrollador que nunca participó en el proyecto: con él debe poder instalarla,
configurarla, ejecutarla y probarla sin ayuda adicional. Cuando algo no existe en el
código (pruebas automatizadas, autenticación real, migraciones versionadas, etc.), se
dice explícitamente.

---

## Contenido

1. [Descripción del sistema y propósito](#1-descripción-del-sistema-y-propósito)
2. [Arquitectura y componentes](#2-arquitectura-y-componentes)
3. [Lenguajes, frameworks y dependencias](#3-lenguajes-frameworks-y-dependencias)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Modelo de base de datos](#5-modelo-de-base-de-datos)
6. [Instalación y configuración](#6-instalación-y-configuración)
7. [Endpoints de la API](#7-endpoints-de-la-api)
8. [Integraciones y APIs externas](#8-integraciones-y-apis-externas)
9. [Cómo ejecutar y probar](#9-cómo-ejecutar-y-probar)
10. [Limitaciones técnicas y recomendaciones de mantenimiento](#10-limitaciones-técnicas-y-recomendaciones-de-mantenimiento)

---

## 1. Descripción del sistema y propósito

KOOLT es una heladería de helado a base de yogurt y granizados con sede única en
Cajicá (Cundinamarca). Antes de este sistema la venta se anotaba en papel durante el
turno, se transcribía a Excel y se conciliaba una vez al mes; no había descuento de
inventario, ni punto de reorden, ni analítica.

La aplicación es el MVP que **mueve el punto de captura al instante de la venta**. Cada
venta registrada:

- recibe un folio consecutivo (`KOOLT-000123`);
- descuenta automáticamente el inventario explotando la **receta** de cada producto y
  la **porción** de cada adición (topping);
- deja un asiento en el libro de movimientos de inventario;
- alimenta el cierre diario, el cálculo de punto de reorden, las sugerencias de compra,
  la analítica y las métricas del piloto.

### Módulos

| Módulo | Ruta | Rol que lo ve | Qué hace |
|---|---|---|---|
| Venta | `/venta` | mostrador y admin | Pantalla de cobro (POS). Cronometra el tiempo de registro y muestra un comprobante con folio. |
| Cierre diario | `/cierre` | mostrador y admin | Consolida el día; el contador de la máquina de helados se ingresa a mano como control cruzado. |
| Inventario | `/inventario` | admin | Existencias, estado de cada insumo (ok / reordenar / crítico / agotado), entradas, mermas, ajustes y conteo físico. |
| Compras | `/compras` | admin | Sugerencias de compra agrupadas por proveedor, órdenes de compra y recepción. |
| Analítica | `/analitica` | admin | Venta de los últimos 14 días por día, franja horaria, línea y topping; exportación CSV. |
| Métricas del piloto | `/metricas` | admin | Diez indicadores (OE1 a OE8) medidos sobre el uso real; registro de capacitación del personal. |
| Catálogo y recetas | `/catalogo` | admin | Precios de productos, mínimos de insumos y recetas (estas últimas solo lectura). |

La raíz `/` redirige a `/venta`.

**Fuera del alcance del MVP** (no existe en el código): facturación electrónica DIAN,
integración con datáfono, delivery, CRM, multi‑sede, nómina, modo sin conexión y
autenticación con usuario y contraseña.

---

## 2. Arquitectura y componentes

Es una única aplicación **Next.js (App Router)** que contiene tanto la interfaz como la
API. No hay un backend separado.

```mermaid
flowchart TB
    subgraph Cliente["Navegador"]
        UI["Componentes cliente<br/>src/components/*.tsx ('use client')<br/>Pos, CierreForm, InventarioForms, ComprasForms…"]
    end

    subgraph Vercel["Vercel · Node.js · iad1"]
        direction TB
        Paginas["Server Components<br/>src/app/[modulo]/page.tsx<br/>+ layout.tsx (guardia de rol)"]
        API["Route handlers<br/>src/app/api/**/route.ts<br/>validan entrada · responden JSON/CSV"]
        Lib["src/lib<br/>db.ts · sesion.ts · guardia.ts · api.ts · formato.ts"]
        Dominio["Capa de dominio<br/>src/dominio/*.ts<br/>ventas · inventario · compras · cierre · reportes · métricas"]
        Prisma["Prisma Client 6.19<br/>prisma/schema.prisma"]
    end

    DB[("PostgreSQL<br/>Neon (producción)<br/>o local")]

    UI -- "HTML renderizado en servidor" --> Paginas
    UI -- "fetch JSON (POST / PATCH)" --> API
    UI -- "GET /api/exportar/*.csv" --> API
    Paginas --> Dominio
    Paginas --> Lib
    API --> Dominio
    API --> Lib
    Dominio --> Prisma
    Lib --> Prisma
    Prisma -- "DATABASE_URL" --> DB
```

### Capas

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **UI – Server Components** | `src/app/<modulo>/page.tsx`, `src/app/layout.tsx` | Leen datos llamando directamente al dominio o a Prisma y renderizan HTML en el servidor. Todas las páginas son dinámicas (`export const dynamic = 'force-dynamic'` o uso de `cookies()`), por lo que el build no consulta la base. Las páginas de admin llaman a `exigirAdmin()` antes de leer datos. |
| **UI – Componentes cliente** | `src/components/*.tsx` con `'use client'` | Formularios e interacción (POS, formularios de inventario y compras, edición de catálogo, gráficos). Envían cambios a la API con `enviar()` (`src/components/Toast.tsx`) y luego refrescan la ruta. |
| **Route handlers** | `src/app/api/**/route.ts` | Reciben JSON, hacen validaciones básicas, delegan al dominio y responden con un sobre JSON común (`manejar()` en `src/lib/api.ts`). Tras escribir, invalidan las páginas afectadas con `revalidatePath()`. |
| **Dominio** | `src/dominio/*.ts` | Reglas de negocio sin React ni HTTP: registrar venta y explotar receta, consumo diario, punto de reorden, sugerencia de compra, cierre, reportes y métricas. Es el único lugar donde se cambia una regla. |
| **Soporte** | `src/lib/*.ts` | Instancia única de Prisma (`db.ts`), sesión por cookie (`sesion.ts`), guardia de rol (`guardia.ts`), envoltorio de respuestas (`api.ts`), formato colombiano y zona horaria (`formato.ts`). |
| **Acceso a datos** | `prisma/schema.prisma` + `@prisma/client` | ORM. El esquema se aplica con `prisma db push` (no hay carpeta de migraciones). |
| **Base de datos** | PostgreSQL | En producción, Neon aprovisionado desde el Marketplace de Vercel. En local, cualquier PostgreSQL accesible por cadena de conexión. |
| **Hosting** | Vercel | Proyecto `mvp-ti` (ver `koolt-app/.vercel/project.json`). `vercel.json` fija `framework: nextjs`, `buildCommand: prisma generate && next build` y `regions: ["iad1"]`. |

### Flujo de una venta (ejemplo de punta a punta)

```mermaid
sequenceDiagram
    participant P as Pos.tsx (navegador)
    participant R as POST /api/ventas
    participant D as dominio/ventas.ts
    participant DB as PostgreSQL
    P->>R: { lineas, medioPago, duracionMs }
    R->>R: valida líneas · medio de pago · rol → usuarioId
    R->>D: registrarVenta()
    D->>DB: lee productos, insumos, recetas
    D->>D: resuelve precios en servidor · calcula consumo por insumo
    D->>DB: $transaction: folio = max+1 · crea Venta + VentaLinea ·<br/>actualiza Insumo.stock · crea Movimiento · EventoAgotamiento si llega a 0
    D-->>R: { folio, total, agotados… }
    R->>R: revalidatePath('/venta', '/cierre', '/inventario')
    R-->>P: { ok: true, datos }
```

### Reglas de cálculo clave (en `src/dominio/inventario.ts`)

```
consumo diario   = Σ (cantidad de receta × unidades vendidas en 14 días) ÷ 14
                   (+ porción × adiciones vendidas, para toppings)
cobertura (días) = stock ÷ consumo diario
punto de reorden = consumo diario × (diasEntrega + margenAlerta)
estado           = agotado    si stock ≤ 0
                   crítico    si cobertura ≤ diasEntrega
                   reordenar  si stock ≤ punto de reorden  o  stock ≤ mínimo
                   ok         en otro caso
compra sugerida  = ⌈(consumo diario × 30 − stock) ÷ contenido del empaque⌉ empaques
```

Parámetros en `src/dominio/constantes.ts`: `VENTANA_CONSUMO = 14`, `MARGEN_ALERTA = 10`,
`COBERTURA_OBJETIVO = 30`, medios de pago `Efectivo | Transferencia | Tarjeta`, metas del
piloto (`METAS`) y `COSTO_VIAJE_URGENTE = 400000`.

### Sesión y roles

- Hay dos roles: `admin` y `mostrador`. Se guardan en la cookie `koolt_rol`
  (`httpOnly`, `sameSite=lax`, 30 días), que se cambia con el selector «Sesión» de la
  barra lateral (llama a `POST /api/sesion`).
- **Sin cookie, el rol es `admin`** (`rolActual()` en `src/lib/sesion.ts`).
- Cada rol se asocia a un usuario fijo para atribuir las ventas: `admin → u-seb`
  (Sebastián Hernández), `mostrador → u-cam` (Camila).
- La restricción se aplica **solo en las páginas**: `exigirAdmin()` redirige a `/venta`
  si el rol no es admin en `/inventario`, `/compras`, `/analitica`, `/metricas` y
  `/catalogo`. Las rutas `/api/*` **no** verifican el rol (ver sección 10).

### Zona horaria

El «día de operación» se calcula en `America/Bogota` (UTC−05:00, sin horario de verano)
mediante `src/lib/formato.ts` (`inicioDia()`, `horaDe()`, `fechaLarga()`…). Vercel
ejecuta en UTC; sin esta conversión, las ventas entre las 19:00 y la medianoche se
atribuirían al día siguiente. El script de siembra fija `process.env.TZ = 'America/Bogota'`
por la misma razón.

---

## 3. Lenguajes, frameworks y dependencias

**Lenguajes:** TypeScript (modo `strict`, `target ES2022`), TSX/React, CSS plano
(`src/app/globals.css`, sin Tailwind ni preprocesador), SQL generado por Prisma
(dialecto PostgreSQL).

**Entorno de ejecución:** Node.js. Requisito mínimo según las dependencias:
`^18.18.0 || ^19.8.0 || >= 20.0.0` (Next.js) y `>=18.18` (Prisma). La instalación de
este documento se verificó con **Node.js 24.11.1 y npm 11.6.2**. Se recomienda Node 22 o
24 LTS (Vercel usa Node 24 por defecto).

### Dependencias declaradas en `koolt-app/package.json`

La columna «Versión en `package.json`» es el rango exacto declarado; la columna
«Resuelta en `package-lock.json`» es la versión que instala `npm install` (o `npm ci`)
hoy.

| Paquete | Tipo | Versión en `package.json` | Resuelta en `package-lock.json` | Uso |
|---|---|---|---|---|
| `next` | dependencia | `^15.5.4` | 15.5.27 | Framework (App Router, route handlers, `next/font`) |
| `react` | dependencia | `^19.1.1` | 19.3.0 | UI |
| `react-dom` | dependencia | `^19.1.1` | 19.3.0 | UI |
| `@prisma/client` | dependencia | `^6.16.1` | 6.19.3 | Cliente ORM en tiempo de ejecución |
| `prisma` | desarrollo | `^6.16.1` | 6.19.3 | CLI: `generate`, `db push` |
| `tsx` | desarrollo | `^4.20.4` | 4.23.15 | Ejecuta `prisma/seed.ts` |
| `typescript` | desarrollo | `^5.9.2` | 5.9.3 | Compilador / verificación de tipos |
| `@types/node` | desarrollo | `^24.3.0` | 24.19.1 | Tipos |
| `@types/react` | desarrollo | `^19.1.9` | 19.3.0 | Tipos |
| `@types/react-dom` | desarrollo | `^19.1.7` | 19.3.0 | Tipos |

No hay más dependencias directas: ni librería de gráficos (los gráficos son SVG/HTML
propios en `src/components/Graficos.tsx`), ni librería de UI, ni de validación, ni de
autenticación, ni de pruebas, ni ESLint.

### Scripts de `package.json`

| Script | Comando | Para qué |
|---|---|---|
| `dev` | `next dev` | Servidor de desarrollo en `http://localhost:3000` |
| `build` | `prisma generate && next build` | Compilación de producción |
| `start` | `next start` | Sirve la compilación de producción |
| `lint` | `next lint` | **No funciona tal cual**: no hay ESLint configurado y Next 15.5 abre un asistente interactivo |
| `db:push` | `prisma db push --skip-generate` | Crea/actualiza las tablas según `schema.prisma` |
| `db:seed` | `tsx prisma/seed.ts` | Borra todos los datos y vuelve a sembrar |
| `db:reset` | `prisma db push --skip-generate --force-reset && tsx prisma/seed.ts` | Borra el esquema completo, lo recrea y siembra |
| `setup` | `prisma generate && prisma db push --skip-generate && tsx prisma/seed.ts` | Primera puesta en marcha |
| `postinstall` | `prisma generate` | Se ejecuta solo tras `npm install` |

---

## 4. Estructura de carpetas

```
MVP Ti/                         ← raíz del repositorio git
├── DOCUMENTACION_TECNICA.md    este documento (y su versión .pdf)
├── KOOLT_Entrega1.docx         entregable académico (no es código)
├── koolt-mvp.html              prototipo HTML estático previo a la app (no se usa en ella)
├── KOOLT-MVP-demo.mp4 / .webm  video de demostración (no versionado)
├── .vercel/                    enlace de Vercel a nivel raíz (ignorado por git; NO desplegar desde aquí)
└── koolt-app/                  ← la aplicación
    ├── package.json            dependencias y scripts
    ├── package-lock.json       versiones exactas resueltas
    ├── next.config.ts          serverExternalPackages: ['@prisma/client']
    ├── vercel.json             framework, buildCommand, installCommand, región iad1
    ├── tsconfig.json           TypeScript estricto; alias @/* → ./src/*
    ├── .env.example            plantilla de variables de entorno
    ├── .gitignore              ignora node_modules, .next, .vercel, .env, .env*.local…
    ├── README.md               resumen funcional y decisiones de arquitectura (AD‑01…AD‑07)
    ├── .vercel/project.json    enlace al proyecto Vercel «mvp-ti» (ignorado por git)
    ├── prisma/
    │   ├── schema.prisma       modelo de datos: 12 entidades
    │   └── seed.ts             siembra: catálogo + histórico reconstruido (opcional)
    └── src/
        ├── app/                rutas de Next.js (App Router)
        │   ├── layout.tsx      layout raíz: fuentes, rol actual, contador de alertas, Shell
        │   ├── page.tsx        redirige / → /venta
        │   ├── globals.css     sistema de diseño (tema claro único)
        │   ├── venta/          POS
        │   ├── cierre/         cierre diario
        │   ├── inventario/     inventario (admin)
        │   ├── compras/        compras (admin)
        │   ├── analitica/      analítica (admin)
        │   ├── metricas/       métricas del piloto (admin)
        │   ├── catalogo/       catálogo y recetas (admin)
        │   └── api/            route handlers (ver sección 7)
        │       ├── ventas/route.ts
        │       ├── cierre/route.ts
        │       ├── movimientos/route.ts
        │       ├── conteos/route.ts
        │       ├── ordenes/route.ts
        │       ├── ordenes/[id]/recepcion/route.ts
        │       ├── catalogo/route.ts
        │       ├── usuarios/[id]/route.ts
        │       ├── sesion/route.ts
        │       └── exportar/[archivo]/route.ts
        ├── dominio/            reglas de negocio (sin React, sin HTTP)
        ├── components/         componentes de interfaz
        └── lib/                utilidades transversales
```

### `koolt-app/prisma/`

- `schema.prisma`: define el datasource PostgreSQL (`url = env("DATABASE_URL")`), el
  generador `prisma-client-js` y las 12 entidades de la sección 5.
- `seed.ts`: vacía las 12 tablas y siembra 3 usuarios, 22 insumos, 7 productos y 38
  líneas de receta (desde `src/dominio/catalogo.ts`). Si `DEMO` es distinto de `0`,
  además genera con un generador pseudoaleatorio determinista 21 días de histórico más
  el día en curso hasta la hora actual (~2.200–2.300 ventas marcadas `demo: true`) y los
  cierres de los 5 días anteriores. **Las ventas del histórico no descuentan
  inventario**: los stocks sembrados ya son el saldo actual; el histórico solo aporta el
  ritmo de consumo.

### `koolt-app/src/app/`

Cada carpeta de módulo contiene un `page.tsx` que es un Server Component: consulta el
dominio y pinta. `layout.tsx` carga las fuentes con `next/font/google` (Bricolage
Grotesque, Chivo, IBM Plex Mono), lee el rol y, si es admin, cuenta los insumos en alerta
para el distintivo del menú.

### `koolt-app/src/app/api/`

Route handlers HTTP (sección 7). Solo validan la entrada, llaman al dominio y responden.

### `koolt-app/src/dominio/`

| Archivo | Contenido |
|---|---|
| `constantes.ts` | Parámetros del negocio (ventana de consumo, márgenes, metas, medios de pago, líneas). |
| `catalogo.ts` | Datos semilla: `INSUMOS`, `PRODUCTOS` (con receta), `USUARIOS`, pesos para el histórico demo. Solo lo usa la siembra. |
| `historico.ts` | `DIAS_HISTORICO = 21` (para textos de la UI). |
| `ventas.ts` | `registrarVenta()`: la transacción de venta. |
| `inventario.ts` | `consumoDiario()`, `evaluar()`, `estadoInventario()`, `alertas()`, `sugerencia()`, `valorInventario()`. |
| `movimientos.ts` | `registrarMovimiento()` (entrada/merma/ajuste), `registrarConteo()`, listados recientes. |
| `cierre.ts` | `resumenDelDia()`, `generarCierre()` (upsert por fecha), `cierresRecientes()`. |
| `compras.ts` | `sugerenciasDeCompra()` agrupadas por proveedor, `crearOrden()`, `recibirOrden()`, `ordenes()`. |
| `reportes.ts` | Series de analítica: por día, por hora (11:00–21:00), por topping y por línea. |
| `metricas.ts` | Los 10 indicadores del piloto (OE1, OE2 ×2, OE2b, OE3, OE4, OE5, OE6, OE7, OE8). |

### `koolt-app/src/components/`

| Archivo | Tipo | Función |
|---|---|---|
| `Shell.tsx` | cliente | Barra lateral / menú móvil, selector de rol, lista `MODULOS` con la marca `soloAdmin`. |
| `Pos.tsx` | cliente | Pantalla de venta: carrito, cronómetro, comprobante. Llama a `POST /api/ventas`. |
| `CierreForm.tsx` | cliente | Formulario de cierre → `POST /api/cierre`. |
| `InventarioForms.tsx` | cliente | Movimientos y conteos → `POST /api/movimientos`, `POST /api/conteos`. |
| `ComprasForms.tsx` | cliente | Sugerencias, orden manual y recepción → `/api/ordenes`, `/api/ordenes/[id]/recepcion`. |
| `CatalogoEdit.tsx` | cliente | Campo editable de precio/mínimo → `PATCH /api/catalogo`. |
| `Capacitacion.tsx` | cliente | Marca de capacitación → `PATCH /api/usuarios/[id]`. |
| `Graficos.tsx` | cliente | Gráficos propios con su tabla equivalente (`TarjetaGrafico`). |
| `Toast.tsx` | cliente | Avisos y la función `enviar()` usada por todos los formularios. |
| `ui.tsx` | servidor | Piezas de presentación: `Encabezado`, `Kpi`, `Card`, `Tabla`, `Chip`, `Medidor`… |
| `iconos.tsx` | — | Iconos SVG y logotipo. |

### `koolt-app/src/lib/`

| Archivo | Función |
|---|---|
| `db.ts` | Instancia única de `PrismaClient` (reutilizada en desarrollo para no agotar conexiones). |
| `sesion.ts` | `rolActual()`, nombre de la cookie, mapa rol → usuario. |
| `guardia.ts` | `exigirAdmin()`: redirige a `/venta` si el rol no es admin. |
| `api.ts` | `manejar()`: envuelve cada handler y devuelve `{ ok, datos }` o `{ ok:false, error }` con 400. |
| `formato.ts` | Formato colombiano (`cop`, `cantidad`, `folio`…) y funciones de fecha en `America/Bogota`. |

---

## 5. Modelo de base de datos

Doce entidades en `koolt-app/prisma/schema.prisma`. Convenciones:

- Montos en **pesos colombianos enteros** (`Int`).
- Cantidades de inventario en `Float`, en la unidad base del insumo (`L`, `kg`, `g`, `und`).
- Los campos «enumerados» son `String` (no hay `enum` de Prisma); los valores válidos se
  indican en comentarios del esquema y los aplica el código.
- Los nombres de tabla en PostgreSQL son los mismos del modelo, entre comillas
  (`"Venta"`, `"Insumo"`…).

### Diagrama entidad‑relación

```mermaid
erDiagram
    Usuario ||--o{ Venta : "registra"
    Venta ||--|{ VentaLinea : "contiene"
    Producto ||--o{ VentaLinea : "vendido en (tipo=producto)"
    Insumo ||--o{ VentaLinea : "vendido como adición (tipo=adicion)"
    Producto ||--o{ Receta : "se prepara con"
    Insumo ||--o{ Receta : "es ingrediente de"
    Insumo ||--o{ Movimiento : "tiene asientos"
    Insumo ||--o{ Conteo : "se cuenta en"
    Insumo ||--o{ EventoAgotamiento : "se agota en"
    OrdenCompra ||--|{ OrdenLinea : "contiene"
    Insumo ||--o{ OrdenLinea : "se pide en"

    Usuario {
        String id PK
        String nombre
        String rol
        Boolean activo
        Boolean capacitado
    }
    Producto {
        String id PK
        String nombre
        String tamano
        String linea
        Int precio
        Boolean temporada
        Boolean activo
        Int orden
    }
    Insumo {
        String id PK
        String nombre
        String unidad
        Float stock
        Float minimo
        String empaque
        Float contenido
        Int costoEmpaque
        Int diasEntrega
        Int margenAlerta
        String proveedor
        Boolean esTopping
        Float porcion "nullable"
        Int precioAdicion "nullable"
        Int orden
    }
    Receta {
        String id PK
        String productoId FK
        String insumoId FK
        Float cantidad
    }
    Venta {
        String id PK
        Int folio UK
        DateTime fechaHora
        String usuarioId FK
        String medioPago
        Int total
        Int duracionMs
        Boolean demo
    }
    VentaLinea {
        String id PK
        String ventaId FK
        String tipo
        String productoId FK "nullable"
        String insumoId FK "nullable"
        Int cantidad
        Int precioUnitario
    }
    Movimiento {
        String id PK
        String insumoId FK
        String tipo
        Float cantidad
        String referencia
        DateTime fechaHora
    }
    OrdenCompra {
        String id PK
        String codigo UK
        String proveedor
        String origen
        String estado
        DateTime creada
        DateTime recibida "nullable"
    }
    OrdenLinea {
        String id PK
        String ordenId FK
        String insumoId FK
        Int empaques
        Float cantidad
        Int costo
    }
    CierreDiario {
        String id PK
        DateTime fecha UK
        Int transacciones
        Int total
        Int unidadesHelado
        Int unidadesGranizado
        Int contadorMaquina "nullable"
        Int diferencia "nullable"
        Int generadoEnMs
        Boolean demo
        DateTime creado
    }
    Conteo {
        String id PK
        String insumoId FK
        DateTime fechaHora
        Float segunSistema
        Float conteoFisico
        Float desviacionPct
    }
    EventoAgotamiento {
        String id PK
        String insumoId FK
        DateTime fechaHora
        String referencia
    }
```

`CierreDiario` no tiene relaciones: es una fotografía consolidada del día.

### Entidades

**Usuario** — personas que operan el sistema.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK | Asignado a mano (`u-seb`, `u-cam`, `u-and`). |
| `nombre` | String | |
| `rol` | String | `"mostrador"` \| `"admin"`. |
| `activo` | Boolean, por defecto `true` | |
| `capacitado` | Boolean, por defecto `false` | Base del indicador OE8. |
| Relaciones | `ventas: Venta[]` | |

**Producto** — presentaciones que se venden.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK | `p-t12`, `p-t8`, `p-v12`, `p-v8`, `p-m12`, `p-g12`, `p-g16`. |
| `nombre`, `tamano` | String | p. ej. «Granizado», «16 oz». |
| `linea` | String | `Temporada` \| `Vainilla` \| `Mixto` \| `Granizado`. |
| `precio` | Int | COP. Editable desde `/catalogo`. |
| `temporada` | Boolean, por defecto `false` | |
| `activo` | Boolean, por defecto `true` | Solo los activos aparecen en `/venta`. No hay pantalla para cambiarlo. |
| `orden` | Int, por defecto `0` | Orden de presentación. |
| Relaciones | `receta: Receta[]`, `lineas: VentaLinea[]` | |

**Insumo** — referencias de inventario; los toppings también son insumos.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK | p. ej. `leche`, `base-tmp`, `t-mora`, `vaso-12`. |
| `nombre` | String | |
| `unidad` | String | `L` \| `kg` \| `g` \| `und`. |
| `stock` | Float, por defecto `0` | Saldo acumulado (se actualiza en cada venta, movimiento, conteo y recepción). |
| `minimo` | Float, por defecto `0` | Editable desde `/catalogo`. |
| `empaque` | String | Descripción, p. ej. «bolsa de 1 kg». |
| `contenido` | Float | Unidades base por empaque. |
| `costoEmpaque` | Int | COP por empaque. |
| `diasEntrega` | Int | Plazo del proveedor. |
| `margenAlerta` | Int, por defecto `10` | Días de anticipación de la alerta (2–3 en insumos locales). |
| `proveedor` | String | Texto libre; agrupa las sugerencias de compra. |
| `esTopping` | Boolean, por defecto `false` | |
| `porcion` | Float? | Gramos que consume una adición. |
| `precioAdicion` | Int? | Precio de venta como adición. |
| `orden` | Int, por defecto `0` | |
| Relaciones | `receta`, `movimientos`, `lineasVenta`, `lineasOrden`, `conteos`, `agotamientos` | |

**Receta** — cuánto de cada insumo consume una unidad de producto.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `productoId` | String, FK → `Producto.id` | `onDelete: Cascade`. |
| `insumoId` | String, FK → `Insumo.id` | `onDelete: Cascade`. |
| `cantidad` | Float | En la unidad base del insumo. |
| Restricción | `@@unique([productoId, insumoId])` | |

**Venta** — cabecera de una venta.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | (La siembra usa UUID.) |
| `folio` | Int, único | Consecutivo; se muestra como `KOOLT-000123`. |
| `fechaHora` | DateTime, por defecto `now()` | Índice `@@index([fechaHora])`. |
| `usuarioId` | String, FK → `Usuario.id` | |
| `medioPago` | String | `Efectivo` \| `Transferencia` \| `Tarjeta`. |
| `total` | Int | Calculado en el servidor. |
| `duracionMs` | Int, por defecto `0` | Tiempo de registro medido en el POS (OE2). |
| `demo` | Boolean, por defecto `false` | `true` = histórico reconstruido por la siembra. |
| Relaciones | `usuario`, `lineas: VentaLinea[]` | |

**VentaLinea** — renglón de una venta; apunta a un producto **o** a un insumo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `ventaId` | String, FK → `Venta.id` | `onDelete: Cascade`; índice. |
| `tipo` | String | `"producto"` \| `"adicion"`. |
| `productoId` | String?, FK → `Producto.id` | Si `tipo = producto`. |
| `insumoId` | String?, FK → `Insumo.id` | Si `tipo = adicion`. |
| `cantidad` | Int | |
| `precioUnitario` | Int | Precio vigente al momento de la venta. |

**Movimiento** — libro de asientos de inventario (auditoría del stock).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `insumoId` | String, FK → `Insumo.id` | `onDelete: Cascade`; índice. |
| `tipo` | String | `venta` \| `entrada` \| `merma` \| `ajuste` \| `conteo`. |
| `cantidad` | Float | Con signo: negativo descuenta. |
| `referencia` | String | Folio, código de orden, nota o desviación. |
| `fechaHora` | DateTime, por defecto `now()` | Índice. |

**OrdenCompra** — orden a proveedor.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `codigo` | String, único | `OC-001`, `OC-002`… |
| `proveedor` | String | Nombre o «Varios proveedores». |
| `origen` | String | `"sugerencia"` \| `"manual"` (base de OE6). |
| `estado` | String | `"enviada"` \| `"recibida"`. |
| `creada` | DateTime, por defecto `now()` | |
| `recibida` | DateTime? | Se llena en la recepción. |
| Relaciones | `lineas: OrdenLinea[]` | |

**OrdenLinea** — renglón de una orden.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `ordenId` | String, FK → `OrdenCompra.id` | `onDelete: Cascade`. |
| `insumoId` | String, FK → `Insumo.id` | |
| `empaques` | Int | ≥ 1. |
| `cantidad` | Float | `empaques × contenido`. |
| `costo` | Int | `empaques × costoEmpaque`. |

**CierreDiario** — consolidado de un día de operación.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `fecha` | DateTime, único | Medianoche de Bogotá del día cerrado. Volver a cerrar el mismo día **sobrescribe** (upsert). |
| `transacciones`, `total` | Int | |
| `unidadesHelado`, `unidadesGranizado` | Int | |
| `contadorMaquina` | Int? | Ingresado a mano. |
| `diferencia` | Int? | `unidadesHelado − contadorMaquina`. |
| `generadoEnMs` | Int | Tiempo de cálculo (OE2). |
| `demo` | Boolean, por defecto `false` | |
| `creado` | DateTime, por defecto `now()` | |

**Conteo** — conteo físico de un insumo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `insumoId` | String, FK → `Insumo.id` | `onDelete: Cascade`. |
| `fechaHora` | DateTime, por defecto `now()` | |
| `segunSistema` | Float | Stock antes del conteo. |
| `conteoFisico` | Float | Nuevo stock. |
| `desviacionPct` | Float | `(físico − sistema) / sistema × 100` (base de OE3). |

**EventoAgotamiento** — se crea cuando una venta deja un insumo en 0.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String, PK, `cuid()` | |
| `insumoId` | String, FK → `Insumo.id` | `onDelete: Cascade`. |
| `fechaHora` | DateTime, por defecto `now()` | |
| `referencia` | String | Folio de la venta que lo agotó (base de OE5). |

---

## 6. Instalación y configuración

### 6.1 Requisitos previos

- **Node.js** ≥ 18.18 (recomendado 22 o 24 LTS) y **npm** (incluido con Node).
  Verifique con `node -v` y `npm -v`.
- **Git**, para clonar el repositorio.
- **Una base PostgreSQL** accesible por cadena de conexión. Cualquiera de estas sirve:
  - la base Neon del proyecto en Vercel (requiere acceso al proyecto);
  - una base Neon propia (capa gratuita en neon.tech);
  - un PostgreSQL local (instalado o en Docker, ver 6.3).
- Opcional: **Vercel CLI** (`npx vercel` funciona sin instalarla globalmente).

### 6.2 Variables de entorno

La aplicación usa **una sola variable**:

| Variable | Obligatoria | Ejemplo | La usan |
|---|---|---|---|
| `DATABASE_URL` | Sí (en tiempo de ejecución y para `db:push`/`db:seed`/`setup`) | `postgres://usuario:clave@host/basedatos?sslmode=require` | Prisma CLI, Prisma Client (app y siembra) |
| `DEMO` | No (solo al sembrar) | `0` | `prisma/seed.ts`: con `DEMO=0` no se genera histórico |

> **Importante: el archivo debe llamarse `.env`, no `.env.local`.** Next.js lee ambos,
> pero la CLI de Prisma y el script de siembra solo leen `.env`. Con `.env.local`,
> `npm run setup` falla con
> `P1012 … Environment variable not found: DATABASE_URL`.
>
> **Créelo antes de `npm install`.** El `postinstall` ejecuta `prisma generate`, y un
> cliente de Prisma generado cuando aún no existía `.env` no lo carga después: en ese
> caso `npm run db:seed` falla con el mismo error aunque el archivo ya exista. Si le
> ocurre, ejecute `npx prisma generate` y repita.

`.env` está en `.gitignore`: nunca lo suba al repositorio.

Si baja las variables desde Vercel (`vercel env pull`), el archivo trae además
`DATABASE_URL_UNPOOLED`, `PGHOST`, `POSTGRES_*`, `NEON_*`, `VERCEL_OIDC_TOKEN`, etc. La
aplicación **no** usa ninguna de ellas; solo `DATABASE_URL`.

### 6.3 Instalación en local (paso a paso)

```bash
# 1. Clonar y entrar a la carpeta de la aplicación
git clone <url-del-repositorio> "MVP Ti"
cd "MVP Ti/koolt-app"

# 2. Crear .env con DATABASE_URL (elija UNA opción)
#    a) Base del proyecto en Vercel (requiere acceso al equipo):
npx vercel link                     # si .vercel/project.json no existe; elegir el proyecto «mvp-ti»
npx vercel env pull .env
#    b) Base propia:
cp .env.example .env                # y edite DATABASE_URL

# 3. Instalar dependencias (genera el cliente de Prisma)
npm install                         # o «npm ci» para respetar exactamente package-lock.json

# 4. Crear el esquema y sembrar la base
npm run setup

# 5. Arrancar
npm run dev                         # http://localhost:3000
```

Salida esperada de `npm run setup` (con histórico demo):

```
✔ Generated Prisma Client (v6.19.3) …
Environment variables loaded from .env
🚀  Your database is now in sync with your Prisma schema.
Limpiando…
Usuarios, insumos y productos…
Reconstruyendo 21 días de histórico…
  2277 ventas sembradas          (el número varía según la hora del día)
Cierres históricos…
Listo.
```

> ⚠️ `npm run setup`, `npm run db:seed` y `npm run db:reset` **borran todos los datos**
> de la base a la que apunte `DATABASE_URL`. Si bajó las variables de Vercel, esa es la
> base de **producción**. Para desarrollar sin riesgo use una base propia.

**PostgreSQL local con Docker (opcional).** Si no tiene una base a mano:

```bash
docker run -d --name koolt-pg -e POSTGRES_PASSWORD=koolt -e POSTGRES_DB=koolt \
  -p 5432:5432 postgres:16
# .env:
DATABASE_URL="postgresql://postgres:koolt@localhost:5432/koolt"
```

(Si el puerto 5432 está ocupado, use otro, p. ej. `-p 55499:5432`, y ajuste la cadena.)

### 6.4 Despliegue en Vercel + Neon

> **Despliegue siempre desde `koolt-app/`, no desde la raíz del repositorio.** Si se
> ejecuta `vercel` un nivel arriba, Vercel sube esa carpeta como sitio estático, el build
> dura segundos y la raíz responde `404 NOT_FOUND`. El archivo `.vercel/project.json`
> correcto es `koolt-app/.vercel/project.json`.
>
> Si conecta el repositorio desde el panel de Vercel (Git), configure
> **Root Directory = `koolt-app`**.

**Proyecto nuevo:**

```bash
cd koolt-app
npx vercel link                          # crear/elegir el proyecto
npx vercel integration add neon          # aprovisiona Postgres en Neon y crea DATABASE_URL en el proyecto
npx vercel env pull .env                 # baja DATABASE_URL a local
npm install
npm run db:push && npm run db:seed       # crea el esquema y siembra la base REMOTA desde su máquina
npx vercel --prod                        # build y despliegue de producción
```

**Proyecto existente (`mvp-ti`):** basta con `npx vercel --prod` desde `koolt-app/`. Si
cambió `schema.prisma`, ejecute antes `npm run db:push` contra la base remota.

Detalles relevantes del despliegue (ya resueltos en el código):

- El esquema y la siembra se aplican **desde la máquina local** contra la base remota;
  no hay ningún paso que los ejecute dentro de Vercel.
- `vercel.json` define `buildCommand: prisma generate && next build` y el
  `postinstall` también genera el cliente, porque Vercel cachea `node_modules`.
- Todas las rutas son dinámicas, así que **el build no necesita `DATABASE_URL`**
  (verificado: `next build` compila sin `.env`). La variable sí es obligatoria en tiempo
  de ejecución: la integración de Neon la deja configurada en el proyecto.
- La función corre en la región `iad1` (Washington D. C.).
- `next/font/google` descarga las fuentes **durante el build**; el build necesita salida
  a internet (Vercel la tiene).

---

## 7. Endpoints de la API

Todas las rutas están en `koolt-app/src/app/api/`, aceptan y devuelven JSON (salvo la
exportación) y se ejecutan en el runtime Node.js.

**Formato de respuesta común** (todas excepto `/api/sesion` y `/api/exportar`):

```jsonc
// éxito → HTTP 200
{ "ok": true, "datos": { … } }
// error de validación o de negocio → HTTP 400
{ "ok": false, "error": "La venta no tiene líneas" }
```

Un método no implementado en una ruta responde **405**.

**Sobre los roles.** La columna «Rol» indica qué perfil usa el endpoint desde la
interfaz. **Ningún endpoint verifica el rol en el servidor**: cualquiera que alcance la
URL puede invocarlo (ver sección 10). El rol solo se lee en `POST /api/ventas`, para
decidir a qué usuario se atribuye la venta.

| # | Método | Ruta | Rol (desde la UI) |
|---|---|---|---|
| 1 | POST | `/api/ventas` | mostrador, admin |
| 2 | POST | `/api/cierre` | mostrador, admin |
| 3 | POST | `/api/movimientos` | admin |
| 4 | POST | `/api/conteos` | admin |
| 5 | POST | `/api/ordenes` | admin |
| 6 | POST | `/api/ordenes/{id}/recepcion` | admin |
| 7 | PATCH | `/api/catalogo` | admin |
| 8 | PATCH | `/api/usuarios/{id}` | admin |
| 9 | POST | `/api/sesion` | cualquiera |
| 10 | GET | `/api/exportar/{archivo}` | `ventas.csv` (analítica) e `inventario.csv` (inventario): admin · `cierres.csv` (cierre): mostrador y admin |

### 1. `POST /api/ventas` — registrar una venta

Recibe:

```json
{
  "lineas": [
    { "tipo": "producto", "productoId": "p-v12", "cantidad": 1 },
    { "tipo": "adicion",  "insumoId":   "t-mora", "cantidad": 1 }
  ],
  "medioPago": "Efectivo",
  "duracionMs": 12000
}
```

- `lineas`: obligatorio, no vacío. Precios y consumo se resuelven en el servidor; el
  cliente no envía precios.
- `medioPago`: `Efectivo` | `Transferencia` | `Tarjeta`; cualquier otro valor se
  reemplaza por `Efectivo`.
- `duracionMs`: opcional; tiempo de registro medido en el POS.
- El usuario se toma de la cookie de rol: `admin → u-seb`, `mostrador → u-cam`.

Hace, en una transacción: folio = máximo + 1, crea `Venta` y `VentaLinea`, descuenta
`Insumo.stock` (nunca por debajo de 0), crea un `Movimiento` tipo `venta` por insumo y un
`EventoAgotamiento` si algún insumo pasa de > 0 a 0.

Devuelve:

```json
{ "ok": true, "datos": { "id": "cm…", "folio": 2278, "folioTexto": "KOOLT-002278",
  "total": 11500, "duracionMs": 12000, "insumosDescontados": 6, "agotados": [] } }
```

Errores (400): `La venta no tiene líneas`, `Producto desconocido: <id>`,
`Adición desconocida: <id>`.

### 2. `POST /api/cierre` — generar el cierre del día

Recibe `{ "contadorMaquina": 140 }` o `{ "contadorMaquina": null }` (también acepta `""`).
Consolida las ventas del día de operación actual (Bogotá) y hace *upsert* en
`CierreDiario` por fecha.

Devuelve `{ ok: true, datos: { mensaje: "Cierre de martes, 17 de noviembre generado en 5 ms · diferencia de 3 unidades contra el contador" } }`.

Error (400): `El contador debe ser un número positivo`.

### 3. `POST /api/movimientos` — entrada, merma o ajuste

Recibe `{ "insumoId": "t-mora", "tipo": "entrada" | "merma" | "ajuste", "cantidad": 1000, "nota": "texto opcional" }`.
`entrada` suma; `merma` y `ajuste` restan (el stock nunca baja de 0). Crea un
`Movimiento` con la nota como referencia.

Devuelve `{ ok: true, datos: { mensaje: "Entrada de 1,00 kg en Mora en trozos · stock ahora 16,27 kg" } }`.

Errores (400): `Tipo de movimiento no válido`, `La cantidad debe ser mayor que cero`,
insumo inexistente (mensaje de Prisma).

### 4. `POST /api/conteos` — conteo físico

Recibe `{ "insumoId": "t-mora", "conteoFisico": 15000 }`. Fija el stock al valor
contado y registra `Movimiento` tipo `conteo` y `Conteo` con la desviación porcentual.

Devuelve `{ ok: true, datos: { mensaje: "Conteo de Mora en trozos registrado · desviación de -7,8 % frente al sistema" } }`.

Error (400): `El conteo no puede ser negativo`.

### 5. `POST /api/ordenes` — crear orden de compra

Recibe:

```json
{ "origen": "sugerencia", "lineas": [ { "insumoId": "t-fresa", "empaques": 3 } ] }
```

`origen` es `manual` o, por defecto, `sugerencia`. `empaques` se redondea y nunca es menor
que 1. El código es `OC-` + (número de órdenes existentes + 1). **No mueve inventario.**

Devuelve `{ ok: true, datos: { codigo: "OC-001", mensaje: "Orden OC-001 creada con 1 línea · registre la recepción cuando llegue" } }`.

Errores (400): `La orden no tiene líneas`, `Insumo desconocido: <id>`.

### 6. `POST /api/ordenes/{id}/recepcion` — recibir una orden

No requiere cuerpo; `{id}` es el `id` (cuid) de la orden, no su código. Suma cada línea al
stock, crea `Movimiento` tipo `entrada` con el código de la orden y marca la orden como
`recibida`.

Devuelve `{ ok: true, datos: { mensaje: "Recepción de OC-001 registrada · el inventario ya quedó actualizado" } }`.

Errores (400): `Orden no encontrada`, `La orden ya fue recibida`.

### 7. `PATCH /api/catalogo` — editar precio o mínimo

Recibe **uno** de:

- `{ "productoId": "p-v8", "precio": 7200 }` → precio > 0 (se redondea).
- `{ "insumoId": "leche", "minimo": 5 }` → mínimo ≥ 0.

Devuelve `{ ok: true, datos: { mensaje: "Precio actualizado" | "Mínimo actualizado" } }`.

Errores (400): `El precio debe ser mayor que cero`, `El mínimo no puede ser negativo`,
`Nada que actualizar`.

### 8. `PATCH /api/usuarios/{id}` — marcar capacitación

Recibe `{ "capacitado": true }`. Devuelve
`{ ok: true, datos: { mensaje: "Camila · mostrador: capacitado" } }`. Un `id` inexistente
devuelve 400 con el mensaje de error de Prisma.

### 9. `POST /api/sesion` — cambiar de rol

Recibe `{ "rol": "mostrador" }` (cualquier otro valor equivale a `admin`). Escribe la
cookie `koolt_rol` (`httpOnly`, `SameSite=Lax`, 30 días).

Devuelve `{ "ok": true, "rol": "mostrador" }` (sin sobre `datos`).

### 10. `GET /api/exportar/{archivo}` — exportación CSV

`{archivo}` ∈ `ventas.csv`, `cierres.csv`, `inventario.csv`. Responde
`text/csv; charset=utf-8` como descarga (`koolt-ventas.csv`, etc.), con BOM UTF‑8,
separador `;` y saltos `\r\n` (formato que Excel en configuración colombiana abre
directamente).

| Archivo | Columnas |
|---|---|
| `ventas.csv` (una fila por línea de venta) | folio; fecha; hora; linea; tipo; descripcion; cantidad; precio_unitario; total_linea; medio_pago; usuario; origen |
| `cierres.csv` | fecha; transacciones; total; unidades_helado; unidades_granizado; contador_maquina; diferencia; generado_en_ms; origen |
| `inventario.csv` | insumo; unidad; stock; minimo; empaque; contenido_empaque; costo_empaque; dias_entrega; proveedor |

Otro nombre → `404 Archivo no disponible` (texto plano).

---

## 8. Integraciones y APIs externas

**La aplicación no consume ninguna API externa en tiempo de ejecución.** No hay
pasarelas de pago, facturación electrónica, datáfono, correo, SMS, mapas, analítica de
terceros, IA ni autenticación externa. Los únicos servicios externos son
infraestructura:

| Servicio | Papel | Cómo se conecta |
|---|---|---|
| **Neon** (PostgreSQL gestionado) | Base de datos de producción | Prisma, mediante `DATABASE_URL`. Aprovisionado desde el Marketplace de Vercel. |
| **Vercel** | Build, hosting y funciones | Despliegue con la CLI o integración Git; inyecta `DATABASE_URL` en las funciones. |

Además, por completitud:

- **Google Fonts** vía `next/font/google`: las fuentes se descargan **en el momento del
  build** y se sirven desde la propia aplicación; el navegador del usuario no contacta a
  Google.
- El contador de la máquina de helados **no** está integrado: se digita a mano en el
  cierre.

---

## 9. Cómo ejecutar y probar

### 9.1 Comandos

Todos se ejecutan dentro de `koolt-app/`.

| Objetivo | Comando |
|---|---|
| Desarrollo con recarga en caliente | `npm run dev` → http://localhost:3000 |
| Compilación de producción | `npm run build` |
| Servir la compilación | `npm start` (puerto 3000; otro puerto: `PORT=4000 npm start`) |
| Verificación de tipos | `npx tsc --noEmit` |
| Aplicar cambios del esquema | `npm run db:push` |
| Resembrar con histórico demo | `npm run db:seed` |
| Resembrar como piloto limpio | `DEMO=0 npm run db:seed` |
| Borrar esquema, recrear y sembrar | `npm run db:reset` (o `DEMO=0 npm run db:reset`) |
| Explorar la base | `npx prisma studio` |

No hay pruebas automatizadas en el proyecto (ni unitarias ni de extremo a extremo), y
`npm run lint` no está configurado. La verificación es manual (9.3).

### 9.2 Datos demo frente a piloto limpio

| | `npm run db:seed` (por defecto) | `DEMO=0 npm run db:seed` |
|---|---|---|
| Usuarios, insumos, productos, recetas | 3 · 22 · 7 · 38 | 3 · 22 · 7 · 38 |
| Ventas | 21 días + hoy hasta la hora actual (~2.200–2.300), `demo = true` | 0 |
| Cierres | 5 días anteriores, `demo = true` | 0 |
| Stocks | Los del catálogo (`src/dominio/catalogo.ts`); el histórico **no** los descuenta | Iguales |
| Analítica y punto de reorden | Con datos desde el primer arranque | Vacíos hasta que haya ventas reales (consumo = 0) |
| Métricas del piloto | OE1/OE2 cuentan solo ventas reales (`demo = false`) | Mayoría «sin medir» hasta usar el sistema |

Use el histórico demo para presentaciones y desarrollo; use `DEMO=0` para iniciar el
piloto real en la tienda. Ambos comandos **borran** primero todos los datos.

La siembra es determinista (semilla fija), salvo el número de ventas del día en curso,
que depende de la hora a la que se ejecute.

### 9.3 Casos de prueba manuales

Precondición: base sembrada con `npm run db:seed` (con histórico) y aplicación corriendo.
Cada caso puede ejecutarse desde la interfaz o con `curl` (ejemplos con
`B=http://localhost:3000`). Todos estos casos se ejecutaron sobre una instalación desde
cero y dieron el resultado indicado.

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Redirección inicial | Abrir `/` | Redirige (307) a `/venta`. |
| 2 | Acceso admin | Sin cookie, abrir las 7 páginas | Todas responden 200; el menú muestra los 7 módulos. |
| 3 | Restricción de mostrador | Selector «Sesión» → «Mostrador · turno»; abrir `/inventario` y `/catalogo` por URL | Redirige a `/venta`. `/venta` y `/cierre` sí abren. El menú solo muestra Venta y Cierre diario. |
| 4 | Venta válida | En `/venta` (como mostrador) elegir «Helado de vainilla 12 oz» + adición «Mora en trozos», medio Efectivo, cobrar | Comprobante `KOOLT-00xxxx`, total **$11.500**. En la base: venta con `usuarioId = u-cam`, `demo = false`; stock: `base-van` −0,12 L, `leche` −0,06 L, `vaso-12`, `cuchara`, `servilleta` −1, `t-mora` −52 g; 6 movimientos tipo `venta` con el folio. |
| 5 | Venta vacía | `curl -X POST $B/api/ventas -H 'content-type: application/json' -d '{"lineas":[]}'` | 400 `{"ok":false,"error":"La venta no tiene líneas"}`. |
| 6 | Producto inexistente | Igual con `{"lineas":[{"tipo":"producto","productoId":"zzz","cantidad":1}]}` | 400 `Producto desconocido: zzz`. |
| 7 | Medio de pago inválido | Venta con `"medioPago":"Bitcoin"` | 200; la venta queda con `medioPago = Efectivo`. |
| 8 | Entrada de inventario | `/inventario` → movimiento «entrada» de 1000 g en Mora en trozos | Aviso «Entrada de 1,00 kg en Mora en trozos · stock ahora …»; el stock sube 1000. |
| 9 | Validaciones de movimiento | `tipo: "venta"` / `cantidad: 0` | 400 `Tipo de movimiento no válido` / `La cantidad debe ser mayor que cero`. |
| 10 | Conteo físico | `/inventario` → conteo de Mora en trozos = 15000 | Aviso con la desviación (p. ej. −7,8 %); stock = 15000; aparece en «conteos recientes» y alimenta OE3. |
| 11 | Conteo negativo | `conteoFisico: -1` | 400 `El conteo no puede ser negativo`. |
| 12 | Orden de compra | `/compras` → crear orden desde la sugerencia (o API con 3 empaques de `t-fresa`) | `OC-001` en estado «enviada»; el stock **no** cambia. |
| 13 | Recepción | Botón de recepción de `OC-001` | Estado «recibida»; stock de `t-fresa` +3000 g; movimiento `entrada` con referencia `OC-001`. |
| 14 | Recepción repetida | Repetir la recepción por API | 400 `La orden ya fue recibida`. |
| 15 | Cierre con contador | `/cierre` → contador = 5 → generar | Aviso «Cierre de <día> generado en N ms · diferencia de X unidades contra el contador» (X = unidades de helado del día − 5). Repetirlo sobrescribe el cierre del día. |
| 16 | Cierre sin contador / inválido | Contador vacío / `-3` | Cierre sin diferencia / 400 `El contador debe ser un número positivo`. |
| 17 | Edición de precio | `/catalogo` → precio de Vainilla 8 oz = 7200 | «Precio actualizado»; el POS muestra $7.200 y las ventas nuevas usan ese precio. Precio 0 → 400 `El precio debe ser mayor que cero`. |
| 18 | Edición de mínimo | `/catalogo` → mínimo de Leche entera = 5 | «Mínimo actualizado»; el estado del insumo se recalcula en `/inventario`. |
| 19 | Capacitación | `/metricas` → marcar a Camila | «Camila · mostrador: capacitado»; OE8 sube. |
| 20 | Exportación | Abrir `/api/exportar/ventas.csv`, `cierres.csv`, `inventario.csv` | Descarga CSV con BOM y `;`; Excel la abre con columnas correctas. `/api/exportar/otro.csv` → 404. |
| 21 | Agotamiento | «Maní tostado» (`t-mani`) arranca en 0 g y su porción es 28 g. Registrar un conteo de 28 g y vender un helado con adición de maní | La venta devuelve `agotados: ["Maní tostado"]` y el POS avisa «Maní tostado quedó en cero: se registró un evento de agotamiento»; se crea un `EventoAgotamiento`; el topping vuelve a mostrarse «agotado» en el POS; OE5 aumenta. |
| 22 | Piloto limpio | `DEMO=0 npm run db:seed` y recargar | 0 ventas y 0 cierres; catálogo completo; las páginas cargan (200) y las métricas aparecen «sin medir». |
| 23 | Build sin base | Quitar temporalmente `.env` y ejecutar `npm run build` | Compila sin errores (todas las rutas son dinámicas). |

---

## 10. Limitaciones técnicas y recomendaciones de mantenimiento

### 10.1 Limitaciones (comportamiento actual del código)

**Seguridad y acceso**

1. **No hay autenticación.** El rol es una cookie que el propio usuario elige en un
   selector; cualquiera puede ponerse `admin`. Sin cookie, el rol por defecto es `admin`.
2. **Las rutas `/api/*` no verifican el rol.** `exigirAdmin()` protege solo las páginas.
   Verificado: con la cookie de mostrador, `PATCH /api/catalogo` cambia precios (200).
3. Las rutas de exportación (`/api/exportar/*`) son públicas para quien conozca la URL.
4. No hay protección CSRF explícita más allá de `SameSite=Lax` en la cookie.

**Integridad de datos y concurrencia**

5. **El folio y el código de orden se calculan como máximo/conteo + 1.** Dos ventas
   simultáneas pueden obtener el mismo folio; la restricción `@unique` hace fallar una de
   ellas (el usuario ve un error y debe reintentar). Lo mismo con `OC-xxx`.
6. **El stock se escribe como valor absoluto calculado a partir de una lectura previa**
   (en `registrarVenta()` la lectura ocurre fuera de la transacción; en
   `registrarMovimiento()` también). Con escrituras concurrentes sobre el mismo insumo
   puede perderse una actualización. Para una sede con una caja el riesgo es bajo.
7. **El stock nunca baja de 0** (`Math.max(0, …)`): si se vende sin existencias, el
   faltante no queda registrado como saldo negativo (sí queda el movimiento).
8. La API **no valida `cantidad` en las líneas de venta** (podría enviarse 0 o un
   negativo por API; el POS siempre envía positivos).
9. Los errores de Prisma (p. ej. id inexistente en `/api/usuarios/{id}` o
   `/api/movimientos`) se devuelven tal cual al cliente con 400, en lugar de un mensaje
   de negocio o un 404.
10. Los «enumerados» (`rol`, `linea`, `tipo`, `estado`, `origen`, `medioPago`) son
    `String` sin restricción en la base.
11. No hay borrado ni anulación de ventas, ni edición de recetas desde la interfaz; las
    recetas solo se cambian en `src/dominio/catalogo.ts` + resiembra, o directamente en
    la base.

**Esquema y operación**

12. **No hay migraciones versionadas**: el esquema se aplica con `prisma db push`. Un
    cambio destructivo del esquema en producción puede perder datos sin aviso previo
    revisable.
13. **`npm run setup`, `db:seed` y `db:reset` borran todos los datos** de la base
    configurada. No existe separación automática entre base de desarrollo y producción.
14. **No hay pruebas automatizadas** ni linter configurado (`npm run lint` abre un
    asistente interactivo).
15. **Sin modo sin conexión**: si se cae internet, no se puede vender (respaldo previsto:
    papel).
16. Las alertas de reorden son solo visuales (distintivo en el menú y estados en
    `/inventario`); no hay notificaciones ni tareas programadas (cron).
17. En `ventas.csv` la columna `fecha` se toma en UTC (`toISOString()`), mientras que
    `hora` está en hora de Bogotá: una venta registrada entre las 19:00 y la medianoche
    aparece con la fecha del día siguiente.
18. Varias funciones cargan tablas completas en memoria (todas las ventas en
    `ventas.csv`; todas las líneas de 14 días para consumo y reportes). Es adecuado para
    el volumen de una sede (~100 ventas/día) pero no escala indefinidamente.
19. La función corre en `iad1` (EE. UU.); cada consulta paga la latencia hasta la región
    de la base Neon.
20. `npm audit` reporta vulnerabilidades en las versiones instaladas (incluida una
    crítica en `next` 15.5.27 al momento de esta verificación).
21. Prisma bloquea `db push --force-reset` (y por tanto `npm run db:reset`) cuando
    detecta que lo ejecuta un agente de IA, hasta tener confirmación explícita del
    usuario. Un desarrollador humano no se ve afectado.

### 10.2 Recomendaciones de mantenimiento

**Prioritarias**

- **Autenticación real** (p. ej. un proveedor del Marketplace de Vercel o Auth.js) y
  **verificación de rol en cada route handler**, no solo en las páginas. Agregar un
  `exigirAdminApi()` en `src/lib/guardia.ts` y llamarlo en las rutas de admin.
- **Bases separadas** para desarrollo y producción (Neon permite *branches*). Nunca
  ejecutar `setup`/`db:seed`/`db:reset` con la `DATABASE_URL` de producción.
- **Actualizar dependencias** (`npm audit`, `npm outdated`) y volver a ejecutar los
  casos de prueba de 9.3 tras cada actualización.
- **Respaldo de la base**: activar/verificar la restauración a un punto en el tiempo de
  Neon y exportar periódicamente los CSV.

**Robustez**

- Pasar a **migraciones** (`prisma migrate dev` / `prisma migrate deploy`) para tener
  historial y revisión de cambios del esquema; usar `directUrl = env("DATABASE_URL_UNPOOLED")`
  en el datasource para las migraciones con Neon.
- Hacer los decrementos de stock atómicos (`stock: { decrement: x }`) dentro de la
  transacción, y generar el folio con una secuencia de PostgreSQL (`autoincrement()`).
- Validar los cuerpos de la API con un esquema (cantidad entera > 0, ids existentes) y
  traducir errores de Prisma a mensajes de negocio (404 para «no encontrado»).
- Corregir la fecha de `ventas.csv` usando las funciones de `src/lib/formato.ts`.

**Calidad**

- Agregar pruebas unitarias del dominio (`evaluar()`, `sugerencia()`, `registrarVenta()`)
  y pruebas de extremo a extremo de los casos de 9.3.
- Configurar ESLint (`npx @next/codemod@canary next-lint-to-eslint-cli .`).
- Ubicar la función de Vercel en la misma región que la base Neon.

**Operación cotidiana**

- Los parámetros del negocio (ventana de consumo, margen de alerta, cobertura objetivo,
  metas) están en `src/dominio/constantes.ts`; el margen por insumo está en
  `Insumo.margenAlerta`. Cambiarlos requiere desplegar de nuevo (los primeros) o editar
  la base (el segundo).
- Para agregar un producto o insumo: editar `src/dominio/catalogo.ts` y resembrar (borra
  datos), o insertarlo directamente en la base con `npx prisma studio`, incluyendo su
  receta.
- Tras cambiar `schema.prisma`: `npm run db:push` contra cada base y desplegar.
