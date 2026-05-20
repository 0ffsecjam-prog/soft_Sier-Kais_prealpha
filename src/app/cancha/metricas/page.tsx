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
  const maxBar = Math.max(1, ...m.byMonth.map((b) => b.recordingCents + b.downloadCents));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métricas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tu split actual: <b>{bpToPercent(complex.revenueSharePct).toFixed(2)}%</b>
          {' · '}Ajustable por el Admin.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label={`Ingresos ${m.monthLabel}`} value={formatCents(m.totalRevenueCents)} />
        <MetricCard label="Tu parte" value={formatCents(m.canchaShareCents)} />
        <MetricCard label="Tempel" value={formatCents(m.tempelShareCents)} />
        <MetricCard label="Videos vendidos" value={String(m.claimsCount)} />
      </div>

      <div className="card p-5">
        <div className="font-semibold">Ingresos por mes (últimos 6)</div>
        <div className="mt-4 space-y-3">
          {m.byMonth.map((b) => {
            const total = b.recordingCents + b.downloadCents;
            const pct = (total / maxBar) * 100;
            const recPct = total > 0 ? (b.recordingCents / total) * pct : 0;
            const dlPct = total > 0 ? (b.downloadCents / total) * pct : 0;
            return (
              <div key={b.month}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{b.month}</span>
                  <span className="font-medium">{formatCents(total)}</span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                  <div className="h-full bg-brand-500" style={{ width: `${recPct}%` }} />
                  <div className="h-full bg-emerald-500" style={{ width: `${dlPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" />Videos</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Descargas</span>
        </div>
      </div>
    </div>
  );
}
