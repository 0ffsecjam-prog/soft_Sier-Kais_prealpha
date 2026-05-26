import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { SIGNUP_STATUS } from '@/lib/signupOptions';
import { getConfigInt } from '@/lib/config';

export const runtime = 'nodejs';

const pwGen = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', 10);

const Body = z.object({
  email: z.string().email().optional(),       // override opcional del email del lead
  password: z.string().min(6).max(100).optional(),  // si no, se genera
  numberOfCourts: z.number().int().min(1).max(50).optional(),
  pricePerSlotCents: z.number().int().min(0).optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  const lead = await prisma.signupRequest.findUnique({ where: { id: ctx.params.id } });
  if (!lead) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  if (lead.status === SIGNUP_STATUS.CONVERTED) {
    return NextResponse.json({ error: 'Esta solicitud ya fue convertida.' }, { status: 409 });
  }

  let raw: unknown = {};
  try { raw = await req.json(); } catch { /* body opcional */ }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const email = (parsed.data.email ?? lead.email).toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: `Ya existe un usuario con el email ${email}. Usá otro email.` }, { status: 409 });
  }

  const plainPassword = parsed.data.password ?? pwGen();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const numCourts = parsed.data.numberOfCourts ?? Math.min(50, Math.max(1, lead.numberOfCourts));
  const pricePerSlotCents = parsed.data.pricePerSlotCents ?? (await getConfigInt('default_recording_price_cents'));

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: lead.contactName,
        passwordHash,
        role: ROLES.CANCHA,
      },
    });

    const complex = await tx.complex.create({
      data: {
        name: lead.businessName,
        address: [lead.address, lead.city, lead.province].filter(Boolean).join(', ') || lead.province,
        ownerId: user.id,
        revenueSharePct: 7000,
      },
    });

    for (let i = 1; i <= numCourts; i++) {
      await tx.court.create({
        data: { name: `Cancha ${i}`, complexId: complex.id, pricePerSlotCents },
      });
    }

    await tx.signupRequest.update({
      where: { id: lead.id },
      data: { status: SIGNUP_STATUS.CONVERTED, convertedUserId: user.id },
    });

    return { user, complex };
  });

  await logger.audit('Solicitud convertida a cuenta CANCHA', {
    signupRequestId: lead.id, userId: result.user.id, complexId: result.complex.id, courts: numCourts,
  }, session.user.id);

  return NextResponse.json({
    ok: true,
    email,
    password: plainPassword,   // se muestra al admin para comunicarlo; no se guarda en claro
    complexId: result.complex.id,
    courts: numCourts,
  });
}
