import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { newShareToken, shareLinkExpiresAt } from '@/lib/shareTokens';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const recordingId = ctx.params.id;

  // Permiso: cliente con claim activo, cancha dueña, o admin
  if (session.user.role === ROLES.CLIENTE) {
    const claim = await prisma.claim.findFirst({
      where: { userId: session.user.id, recordingId, revokedAt: null },
    });
    if (!claim) return NextResponse.json({ error: 'No tenés acceso al video' }, { status: 403 });
  } else if (session.user.role === ROLES.CANCHA) {
    const rec = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: { court: { include: { complex: true } } },
    });
    if (!rec || rec.court.complex.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'No es tu grabación' }, { status: 403 });
    }
  }
  // ADMIN: acceso libre

  let token = newShareToken();
  for (let i = 0; i < 5; i++) {
    const collide = await prisma.shareLink.findUnique({ where: { token } });
    if (!collide) break;
    token = newShareToken();
  }

  const link = await prisma.shareLink.create({
    data: {
      token,
      recordingId,
      createdById: session.user.id,
      expiresAt: shareLinkExpiresAt(),
    },
  });

  await logger.audit('ShareLink creado', { shareLinkId: link.id, recordingId }, session.user.id);
  return NextResponse.json({ ok: true, token: link.token, expiresAt: link.expiresAt.toISOString() });
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const links = await prisma.shareLink.findMany({
    where: { recordingId: ctx.params.id, createdById: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ links: links.map((l) => ({
    id: l.id,
    token: l.token,
    expiresAt: l.expiresAt.toISOString(),
    isActive: l.isActive && l.expiresAt.getTime() > Date.now(),
    viewCount: l.viewCount,
    createdAt: l.createdAt.toISOString(),
  })) });
}
