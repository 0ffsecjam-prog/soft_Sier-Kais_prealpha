import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const Body = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const complex = await prisma.complex.findUnique({ where: { ownerId: session.user.id } });
  if (!complex) return NextResponse.json({ error: 'Sin complejo asociado' }, { status: 400 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const court = await prisma.court.create({
    data: { name: parsed.data.name, complexId: complex.id },
  });

  await logger.audit('Cancha creada', { courtId: court.id, complexId: complex.id }, session.user.id);
  return NextResponse.json({ ok: true, id: court.id });
}
