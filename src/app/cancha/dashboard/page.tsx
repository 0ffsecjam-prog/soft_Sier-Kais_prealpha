import Link from 'next/link';
import { Film, KeyRound, TrendingUp, Users } from 'lucide-react';
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

  const m = await getComplexMetrics(complex.id, complex.revenueSharePct);
  const recordingsCount = await prisma.recording.count({
    where: { court: { complexId: complex.id }, deletedAt: null },
  });
  const activeTokens = await prisma.accessToken.count({
    where: { recording: { court: { complexId: complex.id } }, isActive: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider">{complex.address}</div>
        <h1 className="mt-1 text-2xl font-bold">{complex.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tu split de ingresos: <b>{bpToPercent(complex.revenueSharePct).toFixed(2)}%</b>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Ingresos ${m.monthLabel}`} value={formatCents(m.totalRevenueCents)} hint={`Tu parte: ${formatCents(m.canchaShareCents)}`} icon={<TrendingUp size={18} />} />
        <MetricCard label="Videos vendidos (mes)" value={String(m.claimsCount)} icon={<Users size={18} />} />
        <MetricCard label="Grabaciones activas" value={String(recordingsCount)} icon={<Film size={18} />} />
        <MetricCard label="Tokens activos" value={String(activeTokens)} icon={<KeyRound size={18} />} />
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
