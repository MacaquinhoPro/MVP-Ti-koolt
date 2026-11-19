'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, enviar } from './Toast';
import { Chip } from './ui';

export type Miembro = {
  id: string;
  nombre: string;
  email: string | null;
  rol: 'admin' | 'mostrador';
  aprobado: boolean;
  activo: boolean;
  capacitado: boolean;
  creado: string;
  ventas: number;
  esUsted: boolean;
};

function useCambio() {
  const router = useRouter();
  const { avisar, toast } = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function cambiar(m: Miembro, datos: Record<string, unknown>) {
    setOcupado(m.id);
    try {
      const r = await enviar(`/api/usuarios/${m.id}`, datos, 'PATCH');
      avisar(r.mensaje);
      router.refresh();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setOcupado(null);
    }
  }
  return { cambiar, ocupado, toast };
}

function Persona({ m }: { m: Miembro }) {
  const inicial = m.nombre.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="pers">
      <span className="pers-av" aria-hidden>{inicial}</span>
      <div className="pers-tx">
        <strong>
          {m.nombre}
          {m.esUsted && <span className="pers-yo">usted</span>}
        </strong>
        <span>{m.email ?? 'sin correo'}</span>
      </div>
    </div>
  );
}

export function SolicitudesPendientes({ miembros }: { miembros: Miembro[] }) {
  const { cambiar, ocupado, toast } = useCambio();
  const [rolDe, setRolDe] = useState<Record<string, 'admin' | 'mostrador'>>({});

  if (!miembros.length) {
    return <div className="empty">No hay solicitudes. Cuando alguien cree su cuenta en la pantalla de registro aparecerá aquí.</div>;
  }
  return (
    <>
      {miembros.map((m) => {
        const rol = rolDe[m.id] ?? 'mostrador';
        return (
          <div className="eq-r" key={m.id}>
            <Persona m={m} />
            <span className="tiny muted">Solicitó acceso el {m.creado}</span>
            <div className="eq-acc">
              <select
                aria-label={`Rol para ${m.nombre}`}
                value={rol}
                onChange={(e) => setRolDe((r) => ({ ...r, [m.id]: e.target.value as 'admin' | 'mostrador' }))}
              >
                <option value="mostrador">Mostrador</option>
                <option value="admin">Administración</option>
              </select>
              <button className="btn btn-pri btn-sm" disabled={ocupado === m.id} onClick={() => cambiar(m, { aprobado: true, rol })}>
                Aprobar
              </button>
              <button className="btn btn-gh btn-sm" disabled={ocupado === m.id} onClick={() => cambiar(m, { activo: false })}>
                Rechazar
              </button>
            </div>
          </div>
        );
      })}
      {toast}
    </>
  );
}

export function MiembrosActivos({ miembros }: { miembros: Miembro[] }) {
  const { cambiar, ocupado, toast } = useCambio();
  return (
    <>
      {miembros.map((m) => (
        <div className="eq-r" key={m.id}>
          <Persona m={m} />
          <span className="tiny muted num">{m.ventas.toLocaleString('es-CO')} ventas</span>
          <div className="eq-acc">
            <label className="ck-in">
              <input
                type="checkbox"
                checked={m.capacitado}
                disabled={ocupado === m.id}
                onChange={() => cambiar(m, { capacitado: !m.capacitado })}
              />
              Capacitado
            </label>
            <select
              aria-label={`Rol de ${m.nombre}`}
              value={m.rol}
              disabled={ocupado === m.id || m.esUsted}
              onChange={(e) => cambiar(m, { rol: e.target.value })}
            >
              <option value="mostrador">Mostrador</option>
              <option value="admin">Administración</option>
            </select>
            <button
              className="btn btn-gh btn-sm"
              disabled={ocupado === m.id || m.esUsted}
              onClick={() => cambiar(m, { activo: false })}
            >
              Desactivar
            </button>
          </div>
        </div>
      ))}
      {toast}
    </>
  );
}

export function MiembrosInactivos({ miembros }: { miembros: Miembro[] }) {
  const { cambiar, ocupado, toast } = useCambio();
  return (
    <>
      {miembros.map((m) => (
        <div className="eq-r" key={m.id}>
          <Persona m={m} />
          <Chip>{m.aprobado ? 'Desactivada' : 'Solicitud rechazada'}</Chip>
          <div className="eq-acc">
            <button className="btn btn-sm" disabled={ocupado === m.id} onClick={() => cambiar(m, { activo: true })}>
              {m.aprobado ? 'Reactivar' : 'Volver a revisar'}
            </button>
          </div>
        </div>
      ))}
      {toast}
    </>
  );
}
