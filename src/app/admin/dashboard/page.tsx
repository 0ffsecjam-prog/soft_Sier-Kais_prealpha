import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { formatCents, bpToPercent } from '@/lib/money';
import MetricCard from '@/components/MetricCard';
import { Building2, Film, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireRole(ROLES.ADMIN);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [usersCount, complexes, claimsMonth, recordingsCount] = await Promise.all([
    prisma.user.count(),
    prisma.complex.findMany({
      include: {
        courts: {
          include: {
            recordings: {
              where: { deletedAt: null },
              select: {
                claims: {
                  where: { claimedAt: { gte: monthStart }, revokedAt: null },
                  select: { pricePaidCents: true, hasDownloadAccess: true, downloadFeeCents: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.claim.count({ where: { claimedAt: { gte: monthStart }, revokedAt: null } }),
    prisma.recording.count({ where: { deletedAt: null } }),
  ]);

  const perComplex = complexes.map((c) => {
    let total = 0;
    let dl = 0;
    for (const court of c.courts) {
      for (const rec of court.recordings) {
        for (const claim of rec.claims) {
          total += claim.pricePaidCents;
          if (claim.hasDownloadAccess && claim.downloadFeeCents) dl += claim.downloadFeeCents;
        }
      }
    }
    const totalAll = total + dl;
    const cancha = Math.round((totalAll * c.revenueSharePct) / 10000);
    const tempel = totalAll - cancha;
    return { id: c.id, name: c.name, totalAll, cancha, tempel, share: c.revenueSharePct };
  }).sort((a, b) => b.totalAll - a.totalAll);

  const totalAll = perComplex.reduce((s, c) => s + c.totalAll, 0);
  const totalTempel = perComplex.reduce((s, c) => s + c.tempel, 0);
  const monthLabel = monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">Panel global</div>
        <h1 className="mt-1 text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos y actividad de toda la red.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Ingresos ${monthLabel}`} value={formatCents(totalAll)} hint={`Tempel: ${formatCents(totalTempel)}`} icon={<TrendingUp size={18} />} />
        <MetricCard label="Videos vendidos (mes)" value={String(claimsMonth)} icon={<Film size={18} />} />
        <MetricCard label="Complejos" value={String(complexes.length)} icon={<Building2 size={18} />} />
        <MetricCard label="Usuarios totales" value={String(usersCount)} hint={`${recordingsCount} grabaciones`} icon={<Users size={18} />} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold">Top complejos del mes</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Complejo</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Split</th>
                <th className="px-4 py-3">Cancha</th>
                <th className="px-4 py-3">Tempel</th>
              </tr>
            </thead>
            <tbody>
              {perComplex.map((c) => (
                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{formatCents(c.totalAll)}</td>
                  <td className="px-4 py-3">{bpToPercent(c.share).toFixed(2)}%</td>
                  <td className="px-4 py-3">{formatCents(c.cancha)}</td>
                  <td className="px-4 py-3">{formatCents(c.tempel)}</td>
                </tr>
              ))}
              {perComplex.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Sin actividad aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
