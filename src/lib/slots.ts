export interface CourtSchedule {
  slotDurationMin: number;
  openingHour: number;
  closingHour: number;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  label: string;          // "20:00 – 21:00"
  available: boolean;
  reason?: 'TAKEN' | 'PAST';
}

export interface ExistingReservation {
  startsAt: Date;
  endsAt: Date;
  status: string;
}

/**
 * Genera slots para una fecha dada según el horario de la cancha,
 * marca como TAKEN los que solapan con reservas activas, y como PAST
 * los que ya pasaron (basado en `now`).
 */
export function generateSlotsForDate(
  date: Date,
  schedule: CourtSchedule,
  existing: ExistingReservation[],
  now: Date = new Date(),
): Slot[] {
  const slots: Slot[] = [];
  const slotMs = schedule.slotDurationMin * 60 * 1000;

  // Construyo el día en zona local del server (en MVP asumimos misma zona)
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), schedule.openingHour, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), schedule.closingHour, 0, 0, 0);

  const activeReservations = existing.filter((r) => r.status === 'CONFIRMED');

  let cursor = dayStart;
  while (cursor.getTime() + slotMs <= dayEnd.getTime() + 1) {
    const startsAt = new Date(cursor);
    const endsAt = new Date(cursor.getTime() + slotMs);

    const overlaps = activeReservations.some(
      (r) => startsAt < r.endsAt && endsAt > r.startsAt,
    );

    const isPast = endsAt.getTime() <= now.getTime();

    slots.push({
      startsAt,
      endsAt,
      label: `${fmtTime(startsAt)} – ${fmtTime(endsAt)}`,
      available: !overlaps && !isPast,
      reason: overlaps ? 'TAKEN' : isPast ? 'PAST' : undefined,
    });

    cursor = endsAt;
  }
  return slots;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Parsea "YYYY-MM-DD" como fecha local (no UTC). */
export function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}
