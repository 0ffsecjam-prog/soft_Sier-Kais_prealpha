import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { MAX_PRICE_CENTS } from '@/lib/money';

export const runtime = 'nodejs';

const Body = z.object({
  name: z.string().min(1).max(80).optional(),
  pricePerSlotCents: z.number().int().min(0).max(MAX_PRICE_CENTS).optional(),
  slotDurationMin: z.number().int().min(15).max(240).optional(),
  openingHour: z.number().int().min(0).max(23).optional(),
  closingHour: z.number().int().min(1).max(24).optional(),
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

  if (parsed.data.openingHour !== undefined && parsed.data.closingHour !== undefined && parsed.data.openingHour >= parsed.data.closingHour) {
    return NextResponse.json({ error: 'Hora de apertura debe ser menor a la de cierre' }, { status: 400 });
  }

  const updated = await prisma.court.update({
    where: { id: court.id },
    data: parsed.data,
  });

  await logger.audit('Cancha actualizada', { courtId: updated.id, fields: Object.keys(parsed.data) }, session.user.id);
  return NextResponse.json({ ok: true });
}
