import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { getConfigInt } from '@/lib/config';
import { COURT_STATUS, COURT_STATUS_LABEL, dayScheduleFor, defaultSchedule, parseSchedule } from '@/lib/courtSchedule';

export const runtime = 'nodejs';

const Body = z.object({
  courtId: z.string().min(1),
  startsAt: z.string().datetime(),  // ISO inicio del slot
  includesVideo: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CLIENTE) return NextResponse.json({ error: 'Solo clientes pueden reservar' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const court = await prisma.court.findUnique({ where: { id: parsed.data.courtId } });
  if (!court) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });

  if (court.status !== COURT_STATUS.ACTIVE) {
    return NextResponse.json({ error: `La cancha no acepta reservas (${COURT_STATUS_LABEL[court.status] ?? court.status}).` }, { status: 409 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + court.slotDurationMin * 60 * 1000);
  if (startsAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'No se puede reservar en el pasado' }, { status: 400 });
  }

  // Validar contra el horario del día
  const schedule = parseSchedule(court.weeklySchedule, defaultSchedule(court.openingHour, court.closingHour));
  const day = dayScheduleFor(schedule, startsAt);
  if (!day.isOpen) {
    return NextResponse.json({ error: 'La cancha está cerrada ese día.' }, { status: 409 });
  }
  const startHour = startsAt.getHours();
  const endHour = endsAt.getHours() === 0 ? 24 : endsAt.getHours() + (endsAt.getMinutes() > 0 ? 1 : 0);
  if (startHour < day.open || endHour > day.close) {
    return NextResponse.json({ error: 'Ese horario está fuera del horario de atención de la cancha.' }, { status: 409 });
  }

  const videoPriceCents = await getConfigInt('default_recording_price_cents');
  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar conflicto con otras reservas activas
      const conflict = await tx.reservation.findFirst({
        where: {
          courtId: court.id,
          status: 'CONFIRMED',
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (conflict) throw new Error('SLOT_TAKEN');

      const reservation = await tx.reservation.create({
        data: {
          userId,
          courtId: court.id,
          startsAt,
          endsAt,
          status: 'CONFIRMED',
          slotPriceCents: court.pricePerSlotCents,
          includesVideo: parsed.data.includesVideo,
          videoPriceCents: parsed.data.includesVideo ? videoPriceCents : null,
        },
      });

      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          type: 'RESERVATION',
          amountCents: court.pricePerSlotCents,
          status: 'SIMULATED',
          paymentMethod: 'SIMULATED',
        },
      });

      if (parsed.data.includesVideo) {
        await tx.payment.create({
          data: {
            reservationId: reservation.id,
            type: 'VIDEO_BUNDLE',
            amountCents: videoPriceCents,
            status: 'SIMULATED',
            paymentMethod: 'SIMULATED',
          },
        });
      }

      return reservation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logger.audit('Reserva creada', {
      reservationId: result.id, courtId: court.id, startsAt: startsAt.toISOString(),
      includesVideo: parsed.data.includesVideo,
    }, userId);

    return NextResponse.json({ ok: true, id: result.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN';
    if (msg === 'SLOT_TAKEN') {
      return NextResponse.json({ error: 'Ese horario ya fue tomado. Probá con otro.' }, { status: 409 });
    }
    await logger.error('Reserva error', { err: msg, userId }, userId);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
