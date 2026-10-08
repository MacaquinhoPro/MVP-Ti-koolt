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

export function fechaCorta(d: Date): string {
  return d.getDate() + ' ' + MESES[d.getMonth()];
}

export function fechaLarga(d: Date): string {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES_L[d.getMonth()]}`;
}

export function hora(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** Medianoche local del día que contiene `d`. */
export function inicioDia(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
