import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { formatCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ClienteReservarPage() {
  await requireRole(ROLES.CLIENTE);

  const complexes = await prisma.complex.findMany({
    include: { courts: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservar cancha</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Elegí un complejo y una cancha para ver horarios disponibles.</p>
      </div>

      {complexes.length === 0 && (
        <div className="card p-6 text-sm text-gray-500">No hay canchas disponibles en este momento.</div>
      )}

      <div className="space-y-4">
        {complexes.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex items-center justify-center"><Building2 size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-500">{c.address}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {c.courts.map((court) => (
                <Link key={court.id} href={`/cliente/reservar/${court.id}`} className="card p-4 hover:border-brand-500 transition-colors block">
                  <div className="font-medium">{court.name}</div>
                  <div className="mt-1 text-xs text-gray-500">{court.slotDurationMin} min · {court.openingHour}:00 – {court.closingHour}:00</div>
                  <div className="mt-2 text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCents(court.pricePerSlotCents)} / turno</div>
                </Link>
              ))}
              {c.courts.length === 0 && <div className="text-sm text-gray-500 col-span-full">Aún no hay canchas en este complejo.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
