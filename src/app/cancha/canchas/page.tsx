import { Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId } from '@/lib/queries';
import { NewCourtForm } from './NewCourtForm';

export const dynamic = 'force-dynamic';

export default async function CanchaCanchasPage() {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const recordingsByCourt = await prisma.recording.groupBy({
    by: ['courtId'],
    where: { court: { complexId: complex.id }, deletedAt: null },
    _count: { _all: true },
  });
  const countMap = new Map(recordingsByCourt.map((r) => [r.courtId, r._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Canchas físicas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Subcampos dentro de {complex.name}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complex.courts.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500">Cancha</div>
            <div className="mt-1 font-semibold">{c.name}</div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{countMap.get(c.id) ?? 0} grabaciones</div>
          </div>
        ))}
        {complex.courts.length === 0 && (
          <div className="card p-5 text-sm text-gray-500">Aún no creaste canchas. Sumá la primera con el formulario de la derecha.</div>
        )}
      </div>

      <div className="card p-5 max-w-md">
        <div className="flex items-center gap-2 font-semibold"><Plus size={16} />Agregar cancha</div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ej: Cancha 1, Fútbol 5 B, Padel A.</p>
        <NewCourtForm />
      </div>
    </div>
  );
}
