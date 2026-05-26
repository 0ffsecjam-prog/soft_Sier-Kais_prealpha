import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { NearbyComplexes } from './NearbyComplexes';

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

      <NearbyComplexes
        complexes={complexes.map((c) => ({
          id: c.id,
          name: c.name,
          address: c.address,
          lat: c.lat,
          lng: c.lng,
          courts: c.courts.map((ct) => ({
            id: ct.id,
            name: ct.name,
            slotDurationMin: ct.slotDurationMin,
            pricePerSlotCents: ct.pricePerSlotCents,
            openingHour: ct.openingHour,
            closingHour: ct.closingHour,
            status: ct.status,
          })),
        }))}
      />
    </div>
  );
}
