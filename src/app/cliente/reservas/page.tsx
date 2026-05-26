import Link from 'next/link';
import { Calendar, Video, Play } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { formatCents } from '@/lib/money';
import { getConfigInt } from '@/lib/config';
import { BuyVideoButton } from './BuyVideoButton';
import { CancelReservationButton } from '@/components/CancelReservationButton';

export const dynamic = 'force-dynamic';

export default async function ClienteReservasPage() {
  const session = await requireRole(ROLES.CLIENTE);

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      court: { include: { complex: true } },
      recordings: { where: { deletedAt: null }, take: 1 },
    },
    orderBy: { startsAt: 'desc' },
  });

  const recordingIds = reservations
    .map((r) => r.recordings[0]?.id)
    .filter((x): x is string => !!x);

  const claims = recordingIds.length > 0
    ? await prisma.claim.findMany({
        where: { userId: session.user.id, recordingId: { in: recordingIds }, revokedAt: null },
        select: { recordingId: true },
      })
    : [];
  const claimedSet = new Set(claims.map((c) => c.recordingId));

  const cancelMinHours = await getConfigInt('reservation_cancel_min_hours');
  const cancelCutoffMs = cancelMinHours * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mis Reservas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tus turnos pasados y futuros.{cancelMinHours > 0 && ` Cancelación gratis hasta ${cancelMinHours} h antes del turno.`}
          </p>
        </div>
        <Link href="/cliente/reservar" className="btn btn-primary"><Calendar size={16} />Reservar cancha</Link>
      </div>

      {reservations.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 flex items-center justify-center"><Calendar /></div>
          <h2 className="mt-4 font-semibold">Sin reservas todavía</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Reservá tu primera cancha en pocos clicks.</p>
          <Link href="/cliente/reservar" className="mt-4 btn btn-primary inline-flex">Reservar cancha</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => {
            const rec = r.recordings[0];
            const claimed = rec && claimedSet.has(rec.id);
            const past = r.endsAt.getTime() < Date.now();
            return (
              <div key={r.id} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">{r.court.complex.name}</div>
                    <div className="font-semibold">{r.court.name}</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Calendar size={14} />
                      {r.startsAt.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Pagaste</div>
                    <div className="font-semibold">{formatCents(r.slotPriceCents + (r.videoPriceCents ?? 0))}</div>
                    <div className="text-xs">
                      {r.status === 'CANCELLED' ? <span className="badge badge-muted">Cancelada</span> :
                        past ? <span className="badge badge-info">Pasada</span> : <span className="badge badge-success">Confirmada</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
                  <div className="text-sm flex-1 min-w-0">
                    {!rec && !past && (
                      <div className="text-gray-500">El video aparecerá luego del partido.</div>
                    )}
                    {!rec && past && (
                      <div className="text-gray-500">Esperando que la cancha suba la grabación...</div>
                    )}
                    {rec && claimed && (
                      <div className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><Video size={14} />Video disponible en tu biblioteca.</div>
                    )}
                    {rec && !claimed && (
                      <div className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><Video size={14} />Video disponible — comprá el adicional para verlo.</div>
                    )}
                  </div>
                  <div className="flex gap-2 items-start">
                    {rec && claimed && (
                      <Link href={`/cliente/dashboard/${rec.id}`} className="btn btn-primary text-sm"><Play size={14} />Ver video</Link>
                    )}
                    {rec && !claimed && (
                      <BuyVideoButton reservationId={r.id} priceCents={rec.priceCents} />
                    )}
                    {r.status === 'CONFIRMED' && r.startsAt.getTime() - Date.now() > cancelCutoffMs && (
                      <CancelReservationButton reservationId={r.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
