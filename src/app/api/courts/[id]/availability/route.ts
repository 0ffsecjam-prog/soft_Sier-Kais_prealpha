import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSlotsForDate, parseLocalDate } from '@/lib/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  if (!dateParam) return NextResponse.json({ error: 'falta ?date=YYYY-MM-DD' }, { status: 400 });
  const date = parseLocalDate(dateParam);
  if (!date) return NextResponse.json({ error: 'date inválida' }, { status: 400 });

  const court = await prisma.court.findUnique({
    where: { id: ctx.params.id },
    include: { complex: true },
  });
  if (!court) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const existing = await prisma.reservation.findMany({
    where: {
      courtId: court.id,
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    select: { startsAt: true, endsAt: true, status: true },
  });

  const slots = generateSlotsForDate(
    date,
    { slotDurationMin: court.slotDurationMin, openingHour: court.openingHour, closingHour: court.closingHour },
    existing,
  );

  return NextResponse.json({
    court: {
      id: court.id,
      name: court.name,
      complexName: court.complex.name,
      pricePerSlotCents: court.pricePerSlotCents,
      slotDurationMin: court.slotDurationMin,
    },
    slots: slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      label: s.label,
      available: s.available,
      reason: s.reason,
    })),
  });
}
