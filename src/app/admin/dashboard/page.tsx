import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getAdminComplexMetrics } from '@/lib/queries';
import { formatCents, bpToPercent } from '@/lib/money';
import MetricCard from '@/components/MetricCard';
import { Building2, CalendarCheck, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireRole(ROLES.ADMIN);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [usersCount, recordingsCount, reservationsMonth, perComplex] = await Promise.all([
    prisma.user.count(),
    prisma.recording.count({ where: { deletedAt: null } }),
    prisma.reservation.count({ where: { status: 'CONFIRMED', startsAt: { gte: monthStart } } }),
    getAdminComplexMetrics(),
  ]);

  const totalAll = perComplex.reduce((s, c) => s + c.totalRevenueCents, 0);
  const totalTempel = perComplex.reduce((s, c) => s + c.tempelShareCents, 0);
  const totalReservations = perComplex.reduce((s, c) => s + c.reservationRevenueCents, 0);
  const monthLabel = monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">Panel global</div>
        <h1 className="mt-1 text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos y actividad de toda la red.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Comisión Tempel ${monthLabel}`} value={formatCents(totalTempel)} hint={`Total operado: ${formatCents(totalAll)}`} icon={<TrendingUp size={18} />} />
        <MetricCard label="Alquileres (mes)" value={formatCents(totalReservations)} hint={`${reservationsMonth} reservas`} icon={<CalendarCheck size={18} />} />
        <MetricCard label="Complejos" value={String(perComplex.length)} icon={<Building2 size={18} />} />
        <MetricCard label="Usuarios totales" value={String(usersCount)} hint={`${recordingsCount} grabaciones`} icon={<Users size={18} />} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold">Top complejos del mes</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Complejo</th>
                <th className="px-4 py-3">Alquileres</th>
                <th className="px-4 py-3">Video + desc.</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Split</th>
                <th className="px-4 py-3">Tempel</th>
              </tr>
            </thead>
            <tbody>
              {perComplex.map((c) => (
                <tr key={c.id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{formatCents(c.reservationRevenueCents)}</td>
                  <td className="px-4 py-3">{formatCents(c.videoRevenueCents + c.downloadRevenueCents)}</td>
                  <td className="px-4 py-3 font-medium">{formatCents(c.totalRevenueCents)}</td>
                  <td className="px-4 py-3">{bpToPercent(c.shareBp).toFixed(2)}%</td>
                  <td className="px-4 py-3">{formatCents(c.tempelShareCents)}</td>
                </tr>
              ))}
              {perComplex.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Sin actividad aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
          La comisión de Tempel aplica solo a video y descargas. El alquiler de cancha es 100% del complejo.
        </div>
      </div>
    </div>
  );
}
