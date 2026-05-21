import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const token = await prisma.accessToken.findUnique({
    where: { id: ctx.params.id },
    include: { recording: { include: { court: { include: { complex: true } } } } },
  });
  if (!token) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (token.recording.court.complex.ownerId !== session.user.id) return NextResponse.json({ error: 'No es tuyo' }, { status: 403 });

  await prisma.accessToken.update({ where: { id: token.id }, data: { isActive: false } });
  await logger.audit('Token desactivado', { tokenId: token.id, code: token.code }, session.user.id);
  return NextResponse.json({ ok: true });
}
