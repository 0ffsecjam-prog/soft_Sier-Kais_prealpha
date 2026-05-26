import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const isCancha = session.user.role === ROLES.CANCHA;
  const isAdmin = session.user.role === ROLES.ADMIN;
  if (!isCancha && !isAdmin) return NextResponse.json({ error: 'Solo CANCHA o ADMIN' }, { status: 403 });

  const claim = await prisma.claim.findUnique({
    where: { id: ctx.params.id },
    include: { recording: { include: { court: { include: { complex: true } } } } },
  });
  if (!claim) return NextResponse.json({ error: 'Acceso no encontrado' }, { status: 404 });
  if (isCancha && claim.recording.court.complex.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'No es una grabación tuya' }, { status: 403 });
  }
  if (claim.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

  // Revocar = cortar acceso + revertir el cobro (los pagos del claim pasan a REFUNDED,
  // así salen de métricas). El claim queda con revokedAt y deja de dar acceso.
  await prisma.$transaction([
    prisma.claim.update({ where: { id: claim.id }, data: { revokedAt: new Date() } }),
    prisma.payment.updateMany({ where: { claimId: claim.id, status: { not: 'REFUNDED' } }, data: { status: 'REFUNDED' } }),
  ]);

  await logger.audit('Claim revocado', {
    claimId: claim.id, recordingId: claim.recordingId, userId: claim.userId, by: session.user.role,
  }, session.user.id);

  return NextResponse.json({ ok: true });
}
