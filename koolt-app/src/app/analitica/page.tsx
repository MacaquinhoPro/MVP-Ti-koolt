import { reportes } from '@/dominio/reportes';
import { Encabezado, Kpi, Tabla } from '@/components/ui';
import { GraficoDias, GraficoHoras, GraficoToppings, GraficoLineas, TarjetaGrafico } from '@/components/Graficos';
import { cantidad as fmtCantidad, cop, copCorto, dec } from '@/lib/formato';
import { VENTANA_CONSUMO } from '@/dominio/constantes';

import { exigirAdmin } from '@/lib/guardia';

export const dynamic = 'force-dynamic';

export default async function PaginaAnalitica() {
  await exigirAdmin();

  const r = await reportes();
  const pico = r.horas.find((h) => h.pico);
  const colores = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

  return (
    <>
      <Encabezado
        titulo="Analítica"
        sub="Qué productos y adiciones se venden, en qué días y en qué horas."
        acciones={<a className="btn btn-sm" href="/api/exportar/ventas.csv" download>Exportar ventas CSV</a>}
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k={`Venta de ${VENTANA_CONSUMO} días`} v={copCorto(r.resumen.total)} f={`${r.resumen.transacciones.toLocaleString('es-CO')} transacciones`} />
        <Kpi
          k="Ticket promedio"
          v={cop(r.resumen.ticketPromedio)}
          f={`${dec(r.resumen.adiciones / Math.max(r.resumen.unidades, 1), 2)} adiciones por producto`}
        />
        <Kpi
          k="Franja de mayor venta"
          v={pico ? `${pico.hora}:00` : '—'}
          f={pico ? `${copCorto(pico.monto)} acumulados en la franja` : 'sin ventas en la ventana'}
        />
        <Kpi k="Unidades vendidas" v={r.resumen.unidades.toLocaleString('es-CO')} f="helado y granizado, las cuatro líneas" />
      </div>

      <TarjetaGrafico
          titulo="Venta diaria"
          detalle={`últimos ${VENTANA_CONSUMO} días`}
          grafico={<GraficoDias dias={r.dias} />}
          tabla={
            <Tabla
              cols={[{ t: 'Día' }, { t: 'Venta', n: true }, { t: 'Unidades', n: true }]}
              filas={r.dias.map((d) => [d.etiquetaLarga, cop(d.monto), String(d.unidades)])}
            />
          }
        />

      <div className="grid g2" style={{ marginTop: 16 }}>
          <TarjetaGrafico
            titulo="Venta por franja horaria"
            nota="Sirve para decidir en qué horas conviene reforzar el mostrador."
            grafico={<GraficoHoras horas={r.horas} />}
            tabla={
              <Tabla
                cols={[{ t: 'Franja' }, { t: 'Venta', n: true }, { t: 'Transacciones', n: true }]}
                filas={r.horas.map((h) => [h.etiqueta, cop(h.monto), String(h.transacciones)])}
              />
            }
          />

          <TarjetaGrafico
            titulo="Mix por línea de producto"
            nota="El granizado tiene cifra propia aquí: la máquina de helados no lo cuenta."
            leyenda={
              <div className="lg" style={{ marginBottom: 12 }}>
                {r.lineas.map((l, i) => (
                  <span key={l.linea}>
                    <i style={{ background: colores[i % 4] }} />
                    {l.linea}
                  </span>
                ))}
              </div>
            }
            grafico={<GraficoLineas lineas={r.lineas} />}
            tabla={
              <Tabla
                cols={[{ t: 'Línea' }, { t: 'Venta', n: true }, { t: 'Unidades', n: true }, { t: 'Participación', n: true }]}
                filas={r.lineas.map((l) => [l.linea, cop(l.monto), String(l.unidades), `${dec(l.participacion)} %`])}
              />
            }
          />
      </div>

      <div style={{ marginTop: 16 }}>
          <TarjetaGrafico
            titulo="Adiciones más vendidas"
            detalle={`últimos ${VENTANA_CONSUMO} días`}
            nota="Sirve para decidir cuánto preparar de cada adición al abrir."
            grafico={<GraficoToppings toppings={r.toppings} />}
            tabla={
              <Tabla
                cols={[{ t: 'Topping' }, { t: 'Adiciones', n: true }, { t: 'Consumo', n: true }, { t: 'Costo del consumo', n: true }]}
                filas={r.toppings.map((t) => [
                  t.nombre,
                  t.adiciones.toLocaleString('es-CO'),
                  fmtCantidad(t.consumo, t.unidad),
                  cop(t.costo),
                ])}
              />
            }
          />
      </div>
    </>
  );
}
