import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { formatCents } from '@/lib/money';
import { Play, Download, KeyRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClienteDashboardPage() {
  const session = await requireRole(ROLES.CLIENTE);

  const claims = await prisma.claim.findMany({
    where: { userId: session.user.id, revokedAt: null },
    include: {
      recording: { include: { court: { include: { complex: true } } } },
    },
    orderBy: { claimedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mis Partidos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Videos vinculados a tu cuenta.</p>
        </div>
        <Link href="/cliente/claim" className="btn btn-primary"><KeyRound size={16} />Canjear código</Link>
      </div>

      {claims.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center"><KeyRound /></div>
          <h2 className="mt-4 font-semibold">Todavía no tenés partidos</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Pedile a la cancha el código de acceso de tu partido.</p>
          <Link href="/cliente/claim" className="mt-4 btn btn-primary inline-flex">Canjear código</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {claims.map((c) => (
            <div key={c.id} className="card overflow-hidden flex flex-col">
              <div className="aspect-video bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center">
                <Play size={36} className="text-white/80" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-xs text-gray-500">{c.recording.court.complex.name} · {c.recording.court.name}</div>
                <h3 className="mt-1 font-semibold leading-snug">{c.recording.title}</h3>
                <div className="mt-1 text-xs text-gray-500">{new Date(c.recording.recordedAt).toLocaleString('es-AR')}</div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="badge badge-info">Pagado {formatCents(c.pricePaidCents)}</span>
                  {c.hasDownloadAccess
                    ? <span className="badge badge-success">Descarga ✓</span>
                    : <span className="badge badge-muted">Sin descarga</span>}
                </div>
                <div className="mt-auto pt-4 flex gap-2">
                  <Link href={`/cliente/dashboard/${c.recording.id}`} className="btn btn-primary flex-1"><Play size={16} />Ver</Link>
                  {c.hasDownloadAccess && (
                    <a href={`/api/recordings/${c.recording.id}/download`} className="btn btn-secondary" title="Descargar"><Download size={16} /></a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
