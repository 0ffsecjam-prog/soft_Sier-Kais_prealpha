import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CLIENTE) return NextResponse.json({ error: 'Solo clientes' }, { status: 403 });

  const claim = await prisma.claim.findFirst({
    where: { userId: session.user.id, recordingId: ctx.params.id, revokedAt: null },
    include: { recording: true },
  });
  if (!claim) return NextResponse.json({ error: 'No tenés acceso a este video.' }, { status: 404 });
  if (claim.hasDownloadAccess) return NextResponse.json({ ok: true, already: true });

  await prisma.$transaction([
    prisma.claim.update({
      where: { id: claim.id },
      data: {
        hasDownloadAccess: true,
        downloadPaidAt: new Date(),
        downloadFeeCents: claim.recording.downloadFeeCents,
      },
    }),
    prisma.payment.create({
      data: {
        claimId: claim.id,
        type: 'DOWNLOAD',
        amountCents: claim.recording.downloadFeeCents,
        status: 'SIMULATED',
      },
    }),
  ]);

  await logger.audit('Descarga comprada (simulada)', {
    userId: session.user.id,
    recordingId: ctx.params.id,
    amountCents: claim.recording.downloadFeeCents,
  }, session.user.id);

  return NextResponse.json({ ok: true });
}
