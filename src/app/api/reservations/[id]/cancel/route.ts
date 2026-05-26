import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: ctx.params.id },
    include: { court: { include: { complex: true } } },
  });
  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });

  // Permisos: el cliente dueño de la reserva, la cancha dueña del complejo, o admin.
  const isOwnerClient = session.user.role === ROLES.CLIENTE && reservation.userId === session.user.id;
  const isCourtOwner = session.user.role === ROLES.CANCHA && reservation.court.complex.ownerId === session.user.id;
  const isAdmin = session.user.role === ROLES.ADMIN;
  if (!isOwnerClient && !isCourtOwner && !isAdmin) {
    return NextResponse.json({ error: 'No podés cancelar esta reserva' }, { status: 403 });
  }

  if (reservation.status === 'CANCELLED') {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  // El cliente solo puede cancelar reservas futuras; la cancha/admin pueden cancelar siempre.
  if (isOwnerClient && reservation.startsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'No se puede cancelar una reserva que ya empezó o pasó. Contactá a la cancha.' }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }),
    // Marca los pagos de la reserva como reembolsados (simulado) para que salgan de métricas.
    prisma.payment.updateMany({
      where: { reservationId: reservation.id, status: { not: 'REFUNDED' } },
      data: { status: 'REFUNDED' },
    }),
  ]);

  await logger.audit('Reserva cancelada', {
    reservationId: reservation.id,
    by: session.user.role,
    startsAt: reservation.startsAt.toISOString(),
  }, session.user.id);

  return NextResponse.json({ ok: true });
}
