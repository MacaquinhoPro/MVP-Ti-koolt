'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';

export function CierreForm({ yaCerrado }: { yaCerrado: boolean }) {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [contador, setContador] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function generar() {
    setEnviando(true);
    try {
      const r = await enviar('/api/cierre', { contadorMaquina: contador === '' ? null : contador });
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo generar el cierre');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 190 }}>
          <label className="fl" htmlFor="contador">Contador de la máquina de helados</label>
          <input
            id="contador"
            type="number"
            min={0}
            step={1}
            placeholder="unidades que marcó el equipo"
            value={contador}
            onChange={(e) => setContador(e.target.value)}
          />
        </div>
        <button className="btn btn-pri" onClick={generar} disabled={enviando}>
          {enviando ? 'Generando…' : yaCerrado ? 'Regenerar cierre' : 'Generar cierre del día'}
        </button>
      </div>
      {toast}
    </>
  );
}
