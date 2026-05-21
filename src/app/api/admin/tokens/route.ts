import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { newAccessCode } from '@/lib/tokens';
import { MAX_PRICE_CENTS } from '@/lib/money';

export const runtime = 'nodejs';

const Body = z.object({
  recordingId: z.string().min(1),
  priceCents: z.number().int().min(0).max(MAX_PRICE_CENTS),  // monto cobrado en efectivo
  maxUses: z.number().int().min(1).max(20).default(1),
  expiresInHours: z.number().int().min(1).max(720).optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });

  const recording = await prisma.recording.findFirst({
    where: { id: parsed.data.recordingId, deletedAt: null },
  });
  if (!recording) return NextResponse.json({ error: 'Grabación no encontrada' }, { status: 404 });

  let code = newAccessCode();
  for (let i = 0; i < 5; i++) {
    const collide = await prisma.accessToken.findUnique({ where: { code } });
    if (!collide) break;
    code = newAccessCode();
  }

  const expiresAt = parsed.data.expiresInHours
    ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000)
    : null;

  const token = await prisma.accessToken.create({
    data: {
      code,
      recordingId: recording.id,
      kind: 'ADMIN_CASH',
      priceOverrideCents: parsed.data.priceCents,
      maxUses: parsed.data.maxUses,
      expiresAt,
      createdById: session.user.id,
      isActive: true,
    },
  });

  await logger.audit('Token ADMIN_CASH creado', {
    tokenId: token.id, recordingId: recording.id, priceCents: parsed.data.priceCents, note: parsed.data.note,
  }, session.user.id);

  return NextResponse.json({ ok: true, code: token.code });
}
