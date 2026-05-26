import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { getComplexByOwnerId, getComplexMetrics } from '@/lib/queries';
import { formatCents, bpToPercent } from '@/lib/money';
import MetricCard from '@/components/MetricCard';

export const dynamic = 'force-dynamic';

export default async function CanchaMetricasPage() {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const m = await getComplexMetrics(complex.id, complex.revenueSharePct);
  const maxBar = Math.max(1, ...m.byMonth.map((b) => b.videoCents + b.downloadCents + b.reservationCents));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métricas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Split sobre video/descargas: <b>{bpToPercent(complex.revenueSharePct).toFixed(2)}%</b> (ajustable por Admin) · el alquiler de cancha es 100% tuyo.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Tu parte ${m.monthLabel}`} value={formatCents(m.canchaShareCents)} hint={`Total operado: ${formatCents(m.totalRevenueCents)}`} />
        <MetricCard label="Alquiler de canchas" value={formatCents(m.reservationRevenueCents)} hint="100% tuyo" />
        <MetricCard label="Video + descargas" value={formatCents(m.videoRevenueCents + m.downloadRevenueCents)} />
        <MetricCard label="Comisión Tempel" value={formatCents(m.tempelShareCents)} />
      </div>

      <div className="card p-5">
        <div className="font-semibold">Ingresos por mes (últimos 6)</div>
        <div className="mt-4 space-y-3">
          {m.byMonth.map((b) => {
            const total = b.videoCents + b.downloadCents + b.reservationCents;
            const pct = (total / maxBar) * 100;
            const resPct = total > 0 ? (b.reservationCents / total) * pct : 0;
            const vidPct = total > 0 ? (b.videoCents / total) * pct : 0;
            const dlPct = total > 0 ? (b.downloadCents / total) * pct : 0;
            return (
              <div key={b.month}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{b.month}</span>
                  <span className="font-medium">{formatCents(total)}</span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                  <div className="h-full bg-indigo-500" style={{ width: `${resPct}%` }} />
                  <div className="h-full bg-brand-500" style={{ width: `${vidPct}%` }} />
                  <div className="h-full bg-emerald-500" style={{ width: `${dlPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Alquileres</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" />Videos</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Descargas</span>
        </div>
      </div>
    </div>
  );
}
