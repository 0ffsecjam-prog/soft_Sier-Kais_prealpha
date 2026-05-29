import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { newAccessCode } from '@/lib/tokens';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CLIENTE) return NextResponse.json({ error: 'Solo clientes' }, { status: 403 });

  const reservation = await prisma.reservation.findFirst({
    where: { id: ctx.params.id, userId: session.user.id },
    include: { recordings: { where: { deletedAt: null }, take: 1 } },
  });
  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  const recording = reservation.recordings[0];
  if (!recording) return NextResponse.json({ error: 'El video del partido todavía no está disponible.' }, { status: 404 });

  // ¿ya tiene claim?
  const existing = await prisma.claim.findFirst({
    where: { userId: session.user.id, recordingId: recording.id, revokedAt: null },
  });
  if (existing) return NextResponse.json({ ok: true, alreadyClaimed: true, recordingId: recording.id });

  try {
    await prisma.$transaction(async (tx) => {
      // Si existe un VIDEO_BUNDLE PENDING para esta reserva, lo CONFIRMAMOS
      // (es el pago del bundle pre-reservado). Si no hay bundle, es la compra
      // a posteriori → creamos un Payment RECORDING confirmado.
      // En MVP "confirmar" es simulado; en producción lo dispara la pasarela
      // (webhook). En cualquier caso, el Claim se crea SOLO acá: el cliente
      // no puede obtener acceso al video flipeando un booleano.
      const pendingBundle = await tx.payment.findFirst({
        where: { reservationId: reservation.id, type: 'VIDEO_BUNDLE', status: 'PENDING' },
      });
      const priceCents = pendingBundle
        ? (reservation.videoPriceCents ?? recording.priceCents)
        : recording.priceCents;

      // AccessToken sintético para satisfacer la FK del Claim.
      let code = newAccessCode();
      for (let i = 0; i < 5; i++) {
        const c = await tx.accessToken.findUnique({ where: { code } });
        if (!c) break;
        code = newAccessCode();
      }
      const synthetic = await tx.accessToken.create({
        data: {
          code,
          recordingId: recording.id,
          kind: 'CANCHA',
          maxUses: 1,
          usedCount: 1,
          isActive: false,
          createdById: session.user.id,
        },
      });

      const claim = await tx.claim.create({
        data: {
          userId: session.user.id,
          recordingId: recording.id,
          tokenId: synthetic.id,
          pricePaidCents: priceCents,
        },
      });

      if (pendingBundle) {
        await tx.payment.update({
          where: { id: pendingBundle.id },
          data: { status: 'PAID' },
        });
      } else {
        await tx.payment.create({
          data: {
            claimId: claim.id,
            type: 'RECORDING',
            amountCents: priceCents,
            status: 'PAID',
            paymentMethod: 'SIMULATED',
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    await logger.error('buy-video tx error', { err: String(err) }, session.user.id);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }

  await logger.audit('Video comprado post-reserva', { reservationId: reservation.id, recordingId: recording.id }, session.user.id);
  return NextResponse.json({ ok: true, recordingId: recording.id });
}
