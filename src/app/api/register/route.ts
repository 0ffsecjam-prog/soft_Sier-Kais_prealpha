import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { ipFromHeaders, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const Body = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(190).transform((s) => s.toLowerCase()),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`register:${ip}`, { capacity: 10, refillPerSec: 0.1 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en un momento.' }, { status: 429 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: ROLES.CLIENTE,
    },
    select: { id: true, email: true },
  });

  await logger.audit('Cliente registrado', { userId: user.id, email: user.email });

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
}
