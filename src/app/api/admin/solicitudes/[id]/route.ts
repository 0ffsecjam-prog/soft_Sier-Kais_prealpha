import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { SIGNUP_STATUS } from '@/lib/signupOptions';

export const runtime = 'nodejs';

const Body = z.object({
  status: z.enum([SIGNUP_STATUS.NEW, SIGNUP_STATUS.CONTACTED, SIGNUP_STATUS.CONVERTED, SIGNUP_STATUS.REJECTED]).optional(),
  adminNotes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const existing = await prisma.signupRequest.findUnique({ where: { id: ctx.params.id } });
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) data.adminNotes = parsed.data.adminNotes;

  await prisma.signupRequest.update({ where: { id: ctx.params.id }, data });
  await logger.audit('Solicitud actualizada', { signupRequestId: ctx.params.id, fields: Object.keys(data) }, session.user.id);
  return NextResponse.json({ ok: true });
}
