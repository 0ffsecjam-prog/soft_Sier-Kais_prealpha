import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { parseLocalDate } from '@/lib/slots';

export const runtime = 'nodejs';

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional().nullable(),
});

async function ownCourtOr(res: { id: string }, userId: string) {
  const court = await prisma.court.findUnique({ where: { id: res.id }, include: { complex: true } });
  if (!court) return { error: 'No encontrada', status: 404 as const };
  if (court.complex.ownerId !== userId) return { error: 'No es tuya', status: 403 as const };
  return { court };
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const owned = await ownCourtOr({ id: ctx.params.id }, session.user.id);
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const date = parseLocalDate(parsed.data.date);
  if (!date) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });

  const block = await prisma.courtBlockedDate.upsert({
    where: { courtId_date: { courtId: ctx.params.id, date } },
    create: { courtId: ctx.params.id, date, reason: parsed.data.reason || null },
    update: { reason: parsed.data.reason || null },
  });

  await logger.audit('Fecha bloqueada', { courtId: ctx.params.id, date: parsed.data.date }, session.user.id);
  return NextResponse.json({ ok: true, id: block.id });
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const owned = await ownCourtOr({ id: ctx.params.id }, session.user.id);
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const url = new URL(req.url);
  const dateStr = url.searchParams.get('date');
  if (!dateStr) return NextResponse.json({ error: 'falta ?date=YYYY-MM-DD' }, { status: 400 });
  const date = parseLocalDate(dateStr);
  if (!date) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });

  await prisma.courtBlockedDate.deleteMany({ where: { courtId: ctx.params.id, date } });
  await logger.audit('Fecha desbloqueada', { courtId: ctx.params.id, date: dateStr }, session.user.id);
  return NextResponse.json({ ok: true });
}
