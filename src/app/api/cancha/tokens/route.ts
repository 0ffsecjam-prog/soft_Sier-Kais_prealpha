import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { newAccessCode } from '@/lib/tokens';

export const runtime = 'nodejs';

const Body = z.object({
  recordingId: z.string().min(1),
  maxUses: z.number().int().min(1).max(500).nullable(),
  expiresAt: z.string().datetime().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });

  const recording = await prisma.recording.findFirst({
    where: { id: parsed.data.recordingId, deletedAt: null },
    include: { court: { include: { complex: true } } },
  });
  if (!recording) return NextResponse.json({ error: 'Grabación no encontrada' }, { status: 404 });
  if (recording.court.complex.ownerId !== session.user.id) return NextResponse.json({ error: 'No es tu grabación' }, { status: 403 });

  let code = newAccessCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const collide = await prisma.accessToken.findUnique({ where: { code } });
    if (!collide) break;
    code = newAccessCode();
  }

  const token = await prisma.accessToken.create({
    data: {
      code,
      recordingId: recording.id,
      maxUses: parsed.data.maxUses,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdById: session.user.id,
      isActive: true,
    },
  });

  await logger.audit('Token creado', { tokenId: token.id, code, recordingId: recording.id, maxUses: parsed.data.maxUses }, session.user.id);
  return NextResponse.json({ ok: true, code: token.code, id: token.id });
}
