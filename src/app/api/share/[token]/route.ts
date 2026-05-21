import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const link = await prisma.shareLink.findUnique({ where: { token: ctx.params.token } });
  if (!link) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (link.createdById !== session.user.id) return NextResponse.json({ error: 'No es tuyo' }, { status: 403 });

  await prisma.shareLink.update({ where: { id: link.id }, data: { isActive: false } });
  await logger.audit('ShareLink desactivado', { shareLinkId: link.id }, session.user.id);
  return NextResponse.json({ ok: true });
}
