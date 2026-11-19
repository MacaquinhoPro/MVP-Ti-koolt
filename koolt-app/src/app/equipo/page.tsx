import { prisma } from '@/lib/db';
import { exigirAdmin } from '@/lib/guardia';
import { Encabezado, Kpi, Card, Seccion, Chip } from '@/components/ui';
import { SolicitudesPendientes, MiembrosActivos, MiembrosInactivos, type Miembro } from '@/components/Equipo';
import { fechaCorta } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaEquipo() {
  const sesion = await exigirAdmin();

  const cuentas = await prisma.usuario.findMany({
    where: { clerkId: { not: null } },
    orderBy: [{ creado: 'asc' }],
    include: { _count: { select: { ventas: true } } },
  });

  const vista: Miembro[] = cuentas.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol === 'admin' ? 'admin' : 'mostrador',
    aprobado: u.aprobado,
    activo: u.activo,
    capacitado: u.capacitado,
    creado: fechaCorta(u.creado),
    ventas: u._count.ventas,
    esUsted: u.id === sesion.id,
  }));

  const pendientes = vista.filter((m) => m.activo && !m.aprobado);
  const activos = vista.filter((m) => m.activo && m.aprobado);
  const inactivos = vista.filter((m) => !m.activo);
  const admins = activos.filter((m) => m.rol === 'admin').length;
  const capacitados = activos.filter((m) => m.capacitado).length;

  return (
    <>
      <Encabezado
        titulo="Equipo"
        sub="Quién tiene acceso y con qué rol. Mostrador registra ventas y consulta el cierre; administración ve y configura todo lo demás."
      />

      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi k="Por aprobar" v={String(pendientes.length)} f="cuentas esperando acceso" acento={pendientes.length > 0} />
        <Kpi k="Con acceso" v={String(activos.length)} f={`${admins} en administración · ${activos.length - admins} en mostrador`} />
        <Kpi k="Capacitación" v={`${capacitados} / ${activos.length}`} f="operan sin acompañamiento" />
      </div>

      <Card titulo="Solicitudes de acceso" derecha={pendientes.length ? <Chip tono="ac">{pendientes.length} por revisar</Chip> : undefined}>
        <SolicitudesPendientes miembros={pendientes} />
      </Card>

      <Seccion>Personas con acceso</Seccion>
      <Card>
        <MiembrosActivos miembros={activos} />
      </Card>

      {inactivos.length > 0 && (
        <>
          <Seccion>Sin acceso</Seccion>
          <Card>
            <MiembrosInactivos miembros={inactivos} />
          </Card>
        </>
      )}
    </>
  );
}
