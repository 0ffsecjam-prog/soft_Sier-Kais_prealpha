import Link from 'next/link';
import { Film, KeyRound, TrendingUp, CalendarCheck } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId, getComplexMetrics } from '@/lib/queries';
import { formatCents, bpToPercent } from '@/lib/money';
import MetricCard from '@/components/MetricCard';

export const dynamic = 'force-dynamic';

export default async function CanchaDashboardPage() {
  const session = await requireRole(ROLES.CANCHA);

  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">Sin complejo asociado</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Tu cuenta no tiene un complejo asignado. Contactá al Admin para que te configure uno.
        </p>
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [m, recordingsCount, reservationsCount] = await Promise.all([
    getComplexMetrics(complex.id, complex.revenueSharePct),
    prisma.recording.count({ where: { court: { complexId: complex.id }, deletedAt: null } }),
    prisma.reservation.count({ where: { court: { complexId: complex.id }, status: 'CONFIRMED', startsAt: { gte: monthStart } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider">{complex.address}</div>
        <h1 className="mt-1 text-2xl font-bold">{complex.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Split sobre video/descargas: <b>{bpToPercent(complex.revenueSharePct).toFixed(2)}%</b> · el alquiler de cancha es 100% tuyo.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Tu parte ${m.monthLabel}`} value={formatCents(m.canchaShareCents)} hint={`Total operado: ${formatCents(m.totalRevenueCents)}`} icon={<TrendingUp size={18} />} />
        <MetricCard label="Alquileres (mes)" value={formatCents(m.reservationRevenueCents)} hint={`${reservationsCount} reservas`} icon={<CalendarCheck size={18} />} />
        <MetricCard label="Videos + descargas" value={formatCents(m.videoRevenueCents + m.downloadRevenueCents)} hint={`Tempel: ${formatCents(m.tempelShareCents)}`} icon={<Film size={18} />} />
        <MetricCard label="Grabaciones activas" value={String(recordingsCount)} icon={<KeyRound size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link href="/cancha/grabaciones" className="card p-5 hover:border-brand-500 transition-colors">
          <div className="flex items-center gap-2 text-brand-600"><Film size={18} /><span className="font-semibold">Nueva grabación</span></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Registrá un video del día y dejalo listo para vender.</p>
        </Link>
        <Link href="/cancha/accesos" className="card p-5 hover:border-brand-500 transition-colors">
          <div className="flex items-center gap-2 text-brand-600"><KeyRound size={18} /><span className="font-semibold">Generar acceso</span></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Creá el código que vas a darle al cliente.</p>
        </Link>
        <Link href="/cancha/metricas" className="card p-5 hover:border-brand-500 transition-colors">
          <div className="flex items-center gap-2 text-brand-600"><TrendingUp size={18} /><span className="font-semibold">Métricas</span></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Ver ingresos por mes y desglose por cancha.</p>
        </Link>
      </div>
    </div>
  );
}
