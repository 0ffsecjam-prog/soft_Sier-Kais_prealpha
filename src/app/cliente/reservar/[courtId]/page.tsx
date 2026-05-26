import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { generateSlotsForDate, parseLocalDate, toLocalDateString } from '@/lib/slots';
import { getConfigInt } from '@/lib/config';
import { COURT_STATUS, COURT_STATUS_LABEL, dayScheduleFor, defaultSchedule, parseSchedule } from '@/lib/courtSchedule';
import { SlotPicker } from './SlotPicker';

export const dynamic = 'force-dynamic';

export default async function ReservarCourtPage({
  params,
  searchParams,
}: {
  params: { courtId: string };
  searchParams: { date?: string };
}) {
  await requireRole(ROLES.CLIENTE);

  const court = await prisma.court.findUnique({
    where: { id: params.courtId },
    include: { complex: true },
  });
  if (!court) notFound();

  const today = new Date();
  const date = (searchParams.date && parseLocalDate(searchParams.date)) || new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isActive = court.status === COURT_STATUS.ACTIVE;
  const schedule = parseSchedule(court.weeklySchedule, defaultSchedule(court.openingHour, court.closingHour));
  const day = dayScheduleFor(schedule, date);

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const blockedDate = isActive ? await prisma.courtBlockedDate.findUnique({
    where: { courtId_date: { courtId: court.id, date: dayStart } },
  }) : null;

  const existing = isActive && !blockedDate ? await prisma.reservation.findMany({
    where: { courtId: court.id, startsAt: { gte: dayStart, lte: dayEnd } },
    select: { startsAt: true, endsAt: true, status: true },
  }) : [];

  const slots = isActive && !blockedDate ? generateSlotsForDate(
    date,
    { slotDurationMin: court.slotDurationMin, openingHour: day.open, closingHour: day.close, isOpen: day.isOpen },
    existing,
  ) : [];

  const videoPriceCents = await getConfigInt('default_recording_price_cents');

  const days: Array<{ date: string; label: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    days.push({ date: toLocalDateString(d), label: d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }) });
  }
  const currentDate = toLocalDateString(date);

  return (
    <div className="space-y-4">
      <Link href="/cliente/reservar" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"><ArrowLeft size={14} />Volver</Link>

      <div>
        <div className="text-xs text-gray-500">{court.complex.name}</div>
        <h1 className="mt-1 text-2xl font-bold">{court.name}</h1>
      </div>

      {!isActive ? (
        <div className="card p-5 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold">{COURT_STATUS_LABEL[court.status] ?? court.status}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {court.statusMessage || 'Esta cancha no está aceptando reservas en este momento.'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            {days.map((d) => (
              <Link
                key={d.date}
                href={`/cliente/reservar/${court.id}?date=${d.date}`}
                className={`shrink-0 px-3 py-2 rounded-md border text-sm capitalize whitespace-nowrap ${currentDate === d.date ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700' : 'border-gray-200 dark:border-gray-800 hover:border-brand-300'}`}
              >
                {d.label}
              </Link>
            ))}
          </div>

          {blockedDate ? (
            <div className="card p-6 text-center text-sm text-gray-500">
              La cancha no está disponible este día{blockedDate.reason ? ` (${blockedDate.reason})` : ''}. Probá otra fecha.
            </div>
          ) : !day.isOpen ? (
            <div className="card p-6 text-center text-sm text-gray-500">La cancha está cerrada este día. Probá otra fecha.</div>
          ) : (
            <SlotPicker
              courtId={court.id}
              courtName={court.name}
              complexName={court.complex.name}
              slotPriceCents={court.pricePerSlotCents}
              videoPriceCents={videoPriceCents}
              slots={slots.map((s) => ({
                startsAt: s.startsAt.toISOString(),
                label: s.label,
                available: s.available,
                reason: s.reason,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
