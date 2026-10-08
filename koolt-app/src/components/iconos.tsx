type P = { className?: string };
const base = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconoVenta({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M7 20h10M12 16v4M7 8h4" />
    </svg>
  );
}
export function IconoCierre({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M8.5 14.5l2.5 2.5 4.5-4.5" />
    </svg>
  );
}
export function IconoInventario({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </svg>
  );
}
export function IconoCompras({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <path d="M3 4h2l2.2 10.5a2 2 0 002 1.5h7.6a2 2 0 002-1.5L20 7H6" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17.5" cy="20" r="1.3" />
    </svg>
  );
}
export function IconoAnalitica({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
export function IconoMetricas({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}
export function IconoCatalogo({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" />
      <circle cx="18.5" cy="18" r="2" />
    </svg>
  );
}
export function IconoInfo({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.2" />
    </svg>
  );
}
export function IconoCampana({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base} aria-hidden>
      <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}
export function LogoKoolt({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 34 34" role="img" aria-label="KOOLT">
      <rect width="34" height="34" rx="9" fill="var(--accent)" />
      <path d="M11 24.5c0-4.2 2.7-6.4 6-6.4s6 2.2 6 6.4" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M10.4 15.6c1.6-1.5 3.1.5 4.7-1s3.1.5 4.7-1 3.1.5 4.7-1" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="17" cy="10.2" r="1.7" fill="#fff" />
    </svg>
  );
}
