'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setMensaje(texto);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensaje(null), 4600);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toast = mensaje ? (
    <div className="toast" role="status" aria-live="polite">{mensaje}</div>
  ) : null;

  return { avisar, toast };
}

/** POST a una ruta de la API con el manejo de error ya resuelto. */
export async function enviar(url: string, cuerpo?: unknown, metodo = 'POST') {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const j = await r.json().catch(() => ({ ok: false, error: 'Respuesta ilegible del servidor' }));
  if (!j.ok) throw new Error(j.error ?? 'No se pudo completar la operación');
  return j.datos;
}
