'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';

export type Persona = { id: string; nombre: string; rol: string; capacitado: boolean };

export function Capacitacion({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function alternar(p: Persona) {
    setOcupado(p.id);
    try {
      const r = await enviar(`/api/usuarios/${p.id}`, { capacitado: !p.capacitado }, 'PATCH');
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      {personas.map((p) => (
        <label className="ck" key={p.id}>
          <input
            type="checkbox"
            checked={p.capacitado}
            disabled={ocupado === p.id}
            onChange={() => alternar(p)}
          />
          <span>{p.nombre}</span>
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            {p.capacitado ? 'capacitado' : 'pendiente'}
          </span>
        </label>
      ))}
      {toast}
    </>
  );
}
