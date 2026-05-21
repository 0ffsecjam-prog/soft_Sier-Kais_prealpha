import Link from 'next/link';
import { Calendar, Video } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId } from '@/lib/queries';
import { formatCents } from '@/lib/money';
import { parseLocalDate, toLocalDateString } from '@/lib/slots';

export const dynamic = 'force-dynamic';

export default async function CanchaReservasPage({ searchParams }: { searchParams: { date?: string } }) {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const today = new Date();
  const baseDate =
    (searchParams.date && parseLocalDate(searchParams.date)) ||
    new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      court: { complexId: complex.id },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    include: { user: true, court: true, recordings: { take: 1 } },
    orderBy: { startsAt: 'asc' },
  });

  const reservationsByCourt = new Map<string, typeof reservations>();
  for (const c of complex.courts) reservationsByCourt.set(c.id, []);
  for (const r of reservations) {
    const list = reservationsByCourt.get(r.courtId);
    if (list) list.push(r);
  }

  const days: Array<{ date: string; label: string }> = [];
  for (let i = -3; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    days.push({ date: toLocalDateString(d), label: d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }) });
  }
  const currentDate = toLocalDateString(baseDate);

  const totalDay = reservations.reduce((s, r) => s + r.slotPriceCents + (r.videoPriceCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{complex.name} · {baseDate.toLocaleDateString('es-AR', { dateStyle: 'full' })}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Ingresos del día</div>
          <div className="font-bold">{formatCents(totalDay)}</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/cancha/reservas?date=${d.date}`}
            className={`shrink-0 px-3 py-2 rounded-md border text-sm capitalize whitespace-nowrap ${currentDate === d.date ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700' : 'border-gray-200 dark:border-gray-800 hover:border-brand-300'}`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {complex.courts.map((court) => {
          const rs = reservationsByCourt.get(court.id) ?? [];
          return (
            <div key={court.id} className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{court.name}</div>
                  <div className="text-xs text-gray-500">{court.openingHour}:00 – {court.closingHour}:00 · turno {court.slotDurationMin} min · {formatCents(court.pricePerSlotCents)}</div>
                </div>
                <div className="text-xs text-gray-500">{rs.length} reservas</div>
              </div>
              {rs.length === 0 ? (
                <div className="px-5 py-6 text-sm text-gray-500 text-center">Sin reservas para este día.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rs.map((r) => (
                    <div key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                      <div className="text-sm font-mono shrink-0 w-28">
                        {r.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} –
                        {' '}{r.endsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{r.user.email}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div>{formatCents(r.slotPriceCents + (r.videoPriceCents ?? 0))}</div>
                        <div className="text-xs flex items-center gap-1 justify-end">
                          {r.includesVideo && <span className="badge badge-info"><Video size={10} />Video</span>}
                          {r.recordings.length > 0 && <span className="badge badge-success">Grabado</span>}
                          {r.status === 'CANCELLED' && <span className="badge badge-muted">Cancelada</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {void Calendar}
    </div>
  );
}
