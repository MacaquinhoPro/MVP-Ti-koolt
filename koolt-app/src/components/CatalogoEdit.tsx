'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';

/**
 * Edición en línea de un maestro. Guarda al salir del campo y solo si el
 * valor cambió: evita una escritura por cada tecla pulsada.
 *
 * Recibe `campo` e `id` en lugar de una función constructora porque un Server
 * Component no puede pasar funciones a un Client Component: todo lo que cruza
 * esa frontera tiene que ser serializable.
 */
export function CampoNumero({
  valor, campo, id, ancho = 104, paso = 100,
}: {
  valor: number;
  campo: 'precio' | 'minimo';
  id: string;
  ancho?: number;
  paso?: number;
}) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [texto, setTexto] = useState(String(valor));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const n = Number(texto);
    if (!Number.isFinite(n) || n === valor) {
      setTexto(String(valor));
      return;
    }
    setGuardando(true);
    try {
      const cuerpo = campo === 'precio' ? { productoId: id, precio: n } : { insumoId: id, minimo: n };
      const r = await enviar('/api/catalogo', cuerpo, 'PATCH');
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      setTexto(String(valor));
      avisar(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <input
        type="number"
        step={paso}
        min={0}
        value={texto}
        disabled={guardando}
        aria-label={campo === 'precio' ? 'Precio de venta' : 'Stock mínimo'}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ width: ancho }}
      />
      {toast}
    </>
  );
}
