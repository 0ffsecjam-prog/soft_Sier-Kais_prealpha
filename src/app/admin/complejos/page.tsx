import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { ComplexRow } from './ComplexRow';

export const dynamic = 'force-dynamic';

export default async function AdminComplexesPage() {
  await requireRole(ROLES.ADMIN);
  const complexes = await prisma.complex.findMany({
    include: { owner: true, courts: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Complejos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Editá el porcentaje de revenue share por complejo.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Complejo</th>
                <th className="px-4 py-3">Dueño</th>
                <th className="px-4 py-3">Canchas</th>
                <th className="px-4 py-3">Share Cancha</th>
                <th className="px-4 py-3 w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {complexes.map((c) => (
                <ComplexRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  ownerName={c.owner.name}
                  ownerEmail={c.owner.email}
                  courtsCount={c.courts.length}
                  shareBp={c.revenueSharePct}
                />
              ))}
              {complexes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No hay complejos cargados aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
