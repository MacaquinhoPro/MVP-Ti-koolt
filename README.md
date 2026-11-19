# KOOLT · Operación

Sistema de **registro de ventas, control de inventario y gestión de compras** para
KOOLT — heladería de helado a base de yogurt y granizados en Cajicá, Cundinamarca.

El MVP mueve el punto de captura al instante de la venta: cada venta recibe un folio,
descuenta el inventario según la receta de cada producto y alimenta el cierre diario,
el punto de reorden, las sugerencias de compra y la analítica.

---

## Contenido del repositorio

| Ruta | Qué es |
|---|---|
| [`koolt-app/`](koolt-app/) | La aplicación: Next.js (App Router) + Prisma + PostgreSQL, con inicio de sesión por Clerk. Desplegada en Vercel. |
| [`DOCUMENTACION_TECNICA.md`](DOCUMENTACION_TECNICA.md) | Arquitectura, modelo de datos, endpoints de la API, instalación, pruebas y limitaciones. También en PDF. |
| [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) | Guía para el personal del local y la administración, pantalla por pantalla. También en PDF. |
| [`docs/capturas/`](docs/capturas/) | Capturas de pantalla usadas en el manual. |
| `koolt-mvp.html` | Prototipo navegable de una sola página (abrir directamente en el navegador). |
| `KOOLT-MVP-demo.mp4` / `.webm` | Video de demostración del MVP. |
| `KOOLT_Entrega1.docx` | Primera entrega del proyecto. |

---

## Inicio rápido

Requisitos: Node.js 20+ y una base PostgreSQL.

```bash
cd koolt-app
cp .env.example .env     # o: npx vercel env pull .env
npm install
npm run setup            # crea el esquema y siembra catálogo + 21 días de histórico
npm run dev              # http://localhost:3000
```

> El archivo de entorno debe llamarse `.env` (no `.env.local`): la CLI de Prisma y el
> script de siembra solo leen `.env`.

Variables necesarias: `DATABASE_URL`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y, opcionalmente, `KOOLT_ADMIN_EMAILS`. Ver
[`koolt-app/.env.example`](koolt-app/.env.example).

Para desplegar, ejecute `vercel` **desde `koolt-app/`**, no desde esta carpeta. Los
pasos completos están en [`koolt-app/README.md`](koolt-app/README.md#desplegar-en-vercel).

---

## Módulos

| Módulo | Quién | Qué hace |
|---|---|---|
| **Venta** | Mostrador | Pantalla de cobro con comprobante y folio. |
| **Cierre diario** | Mostrador | Consolidado del día con el contador de la máquina como control cruzado. |
| **Inventario** | Administración | Existencias, alertas de reorden, entradas, mermas y conteo físico. |
| **Compras** | Administración | Sugerencias por proveedor, órdenes y recepción. |
| **Analítica** | Administración | Venta por día, franja horaria, línea y topping; exportación CSV. |
| **Indicadores** | Administración | Metas del piloto medidas sobre el uso real. |
| **Catálogo y recetas** | Administración | Precios, mínimos y recetas. |
| **Equipo** | Administración | Aprobación de cuentas, roles y capacitación. |

---

## Equipo

Juan Pablo Aponte Veloza · Deivid Nicolás Urrea Lara · Andrés Mauricio Ricaurte López ·
Brandon Eduardo Merchán Sandoval

Docente: Mateo Barón Rojas · Patrocinador: Sebastián David Hernández Hernández (KOOLT)
