import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const Body = z.object({ revenueSharePct: z.number().int().min(0).max(10000) });

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const updated = await prisma.complex.update({
    where: { id: ctx.params.id },
    data: { revenueSharePct: parsed.data.revenueSharePct },
  });

  await logger.audit('Revenue share actualizado', { complexId: updated.id, newBp: parsed.data.revenueSharePct }, session.user.id);
  return NextResponse.json({ ok: true });
}
