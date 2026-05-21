import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { newAccessCode } from '@/lib/tokens';

export const runtime = 'nodejs';

const Body = z.object({
  maxUses: z.number().int().min(1).max(50).default(1),
  expiresInHours: z.number().int().min(1).max(720).optional(),  // opcional: vencimiento
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CLIENTE) return NextResponse.json({ error: 'Solo clientes pueden compartir a otra cuenta' }, { status: 403 });

  // Verifica que tenga claim activo
  const claim = await prisma.claim.findFirst({
    where: { userId: session.user.id, recordingId: ctx.params.id, revokedAt: null },
  });
  if (!claim) return NextResponse.json({ error: 'No sos dueño de este video' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

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
      recordingId: ctx.params.id,
      kind: 'CLIENTE_SHARE',
      priceOverrideCents: 0,
      maxUses: parsed.data.maxUses,
      expiresAt,
      createdById: session.user.id,
      isActive: true,
    },
  });

  await logger.audit('Token CLIENTE_SHARE creado', { tokenId: token.id, recordingId: ctx.params.id, maxUses: parsed.data.maxUses }, session.user.id);
  return NextResponse.json({ ok: true, code: token.code });
}
