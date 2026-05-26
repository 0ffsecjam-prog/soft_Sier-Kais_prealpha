import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { MAX_PRICE_CENTS } from '@/lib/money';
import { COURT_STATUS, WEEKDAY_KEYS, isValidSchedule, serializeSchedule, type WeeklySchedule } from '@/lib/courtSchedule';

export const runtime = 'nodejs';

const DaySchema = z.object({
  open: z.number().int().min(0).max(23),
  close: z.number().int().min(1).max(24),
  isOpen: z.boolean(),
});

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  pricePerSlotCents: z.number().int().min(0).max(MAX_PRICE_CENTS).optional(),
  slotDurationMin: z.number().int().min(15).max(240).optional(),
  status: z.enum([COURT_STATUS.ACTIVE, COURT_STATUS.MAINTENANCE, COURT_STATUS.UNAVAILABLE]).optional(),
  statusMessage: z.string().max(300).nullable().optional(),
  weeklySchedule: z.object({
    sun: DaySchema, mon: DaySchema, tue: DaySchema, wed: DaySchema,
    thu: DaySchema, fri: DaySchema, sat: DaySchema,
  }).optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const court = await prisma.court.findUnique({ where: { id: ctx.params.id }, include: { complex: true } });
  if (!court) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  if (court.complex.ownerId !== session.user.id) return NextResponse.json({ error: 'No es tuya' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.pricePerSlotCents !== undefined) data.pricePerSlotCents = parsed.data.pricePerSlotCents;
  if (parsed.data.slotDurationMin !== undefined) data.slotDurationMin = parsed.data.slotDurationMin;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.statusMessage !== undefined) data.statusMessage = parsed.data.statusMessage;

  if (parsed.data.weeklySchedule) {
    const sched = parsed.data.weeklySchedule as WeeklySchedule;
    if (!isValidSchedule(sched)) {
      const bad = WEEKDAY_KEYS.find((k) => sched[k].close <= sched[k].open);
      return NextResponse.json({ error: `En cada día la hora de cierre debe ser mayor a la de apertura${bad ? ` (revisá ${bad})` : ''}.` }, { status: 400 });
    }
    data.weeklySchedule = serializeSchedule(sched);
    // Mantener openingHour/closingHour como "lunes" para compatibilidad/fallback
    data.openingHour = sched.mon.open;
    data.closingHour = sched.mon.close;
  }

  const updated = await prisma.court.update({ where: { id: court.id }, data });
  await logger.audit('Cancha actualizada', { courtId: updated.id, fields: Object.keys(data) }, session.user.id);
  return NextResponse.json({ ok: true });
}
