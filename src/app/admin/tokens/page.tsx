import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { AdminTokenForm } from './AdminTokenForm';
import { formatCents, bpToPercent } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminTokensPage() {
  await requireRole(ROLES.ADMIN);

  const recordings = await prisma.recording.findMany({
    where: { deletedAt: null },
    include: { court: { include: { complex: true } } },
    orderBy: { recordedAt: 'desc' },
    take: 200,
  });

  const recentCashTokens = await prisma.accessToken.findMany({
    where: { kind: 'ADMIN_CASH' },
    include: { recording: { include: { court: { include: { complex: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tokens (cash sale)</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generá un código para un cliente que pagó en efectivo. El monto entrado se registra como Payment con método CASH.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold">Nuevo token cash-sale</h2>
          <AdminTokenForm recordings={recordings.map((r) => ({
            id: r.id,
            title: r.title,
            courtName: r.court.name,
            complexName: r.court.complex.name,
            defaultPriceCents: r.priceCents,
          }))} />
        </div>

        <div>
          <h2 className="font-semibold mb-2">Cash-sales recientes</h2>
          {recentCashTokens.length === 0 ? (
            <div className="card p-5 text-sm text-gray-500">Sin tokens cash-sale aún.</div>
          ) : (
            <div className="card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {recentCashTokens.map((t) => (
                <div key={t.id} className="p-4 flex items-center gap-3">
                  <code className="font-mono font-bold tracking-wider text-sm">{t.code}</code>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.recording.title}</div>
                    <div className="text-xs text-gray-500">{t.recording.court.complex.name} · {formatCents(t.priceOverrideCents ?? t.recording.priceCents)} · {t.usedCount}{t.maxUses ? `/${t.maxUses}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {void bpToPercent}
    </div>
  );
}
