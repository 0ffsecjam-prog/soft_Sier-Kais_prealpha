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
        <p className="text-sm text-gray-600 dark:text-gray-400">Configurá el revenue share y la ubicación geográfica de cada complejo.</p>
      </div>

      <div className="space-y-3">
        {complexes.map((c) => (
          <ComplexRow
            key={c.id}
            id={c.id}
            name={c.name}
            ownerName={c.owner.name}
            ownerEmail={c.owner.email}
            address={c.address}
            courtsCount={c.courts.length}
            shareBp={c.revenueSharePct}
            lat={c.lat}
            lng={c.lng}
          />
        ))}
        {complexes.length === 0 && (
          <div className="card p-6 text-sm text-gray-500 text-center">No hay complejos cargados aún.</div>
        )}
      </div>
    </div>
  );
}
