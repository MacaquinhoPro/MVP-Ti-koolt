/** Formato colombiano: punto de miles, coma decimal, pesos sin centavos. */

export function cop(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

export function copCorto(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(Math.abs(n) >= 10_000_000 ? 0 : 1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1000) return '$' + Math.round(n / 1000) + ' k';
  return '$' + Math.round(n);
}

export function cantidad(n: number, unidad: string): string {
  if (unidad === 'und') return Math.round(n).toLocaleString('es-CO') + ' und';
  if (unidad === 'g') return n >= 1000 ? (n / 1000).toFixed(2).replace('.', ',') + ' kg' : Math.round(n) + ' g';
  if (unidad === 'kg') return n.toFixed(1).replace('.', ',') + ' kg';
  return n.toFixed(1).replace('.', ',') + ' ' + unidad;
}

export function dec(n: number, d = 1): string {
  return n.toFixed(d).replace('.', ',');
}

/** Duración legible: un cierre que tarda 8 ms no debe leerse «0,00 s». */
export function duracion(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${dec(ms / 1000)} s`;
  return `${Math.floor(ms / 60_000)} min ${dec((ms % 60_000) / 1000, 0)} s`;
}

export function folio(n: number): string {
  return 'KOOLT-' + String(n).padStart(6, '0');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Zona horaria del negocio. No es un detalle de presentación: define cuándo
 * empieza y termina un día de operación.
 *
 * El servidor corre en UTC. Sin esto, entre las 19:00 y la medianoche en
 * Colombia —horas pico de una heladería— las ventas se atribuirían al día
 * siguiente y el cierre consolidaría el día equivocado. Colombia no aplica
 * horario de verano, así que el desfase es fijo en −05:00.
 */
export const ZONA = 'America/Bogota';
const DESFASE = '-05:00';

function partesEn(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return {
    anio: Number(v('year')),
    mes: Number(v('month')),
    dia: Number(v('day')),
    hora: Number(v('hour')) % 24,
    minuto: Number(v('minute')),
  };
}

/** Día de la semana (0 = domingo) en la zona del negocio. */
function diaSemana(d: Date): number {
  const { anio, mes, dia } = partesEn(d);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/** La hora del día en la zona del negocio — la que agrupa por franja horaria. */
export function horaDe(d: Date): number {
  return partesEn(d).hora;
}

export function fechaCorta(d: Date): string {
  const { dia, mes } = partesEn(d);
  return `${dia} ${MESES[mes - 1]}`;
}

export function fechaLarga(d: Date): string {
  const { dia, mes } = partesEn(d);
  return `${DIAS[diaSemana(d)]}, ${dia} de ${MESES_L[mes - 1]}`;
}

export function hora(d: Date): string {
  const { hora: h, minuto } = partesEn(d);
  return `${String(h).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

/** Medianoche del día de operación que contiene `d`, como instante absoluto. */
export function inicioDia(d = new Date()): Date {
  const { anio, mes, dia } = partesEn(d);
  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return new Date(`${anio}-${mm}-${dd}T00:00:00${DESFASE}`);
}
