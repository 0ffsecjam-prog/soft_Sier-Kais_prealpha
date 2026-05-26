import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ipFromHeaders, rateLimit } from '@/lib/rate-limit';
import { COURT_TYPES } from '@/lib/signupOptions';

export const runtime = 'nodejs';

const Body = z.object({
  contactName: z.string().min(2).max(120),
  email: z.string().email().max(190),
  phone: z.string().min(5).max(40),
  role: z.string().max(80).optional().nullable(),
  businessName: z.string().min(2).max(160),
  province: z.string().min(2).max(80),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  numberOfCourts: z.number().int().min(1).max(200),
  courtTypes: z.array(z.enum(COURT_TYPES)).min(1).max(COURT_TYPES.length),
  surfaceType: z.enum(['INDOOR', 'OUTDOOR', 'MIXED']).optional().nullable(),
  matchesPerWeek: z.string().max(40).optional().nullable(),
  hasCameras: z.enum(['ALL', 'SOME', 'NONE']).optional().nullable(),
  hasInternet: z.enum(['YES', 'NO', 'PARTIAL']).optional().nullable(),
  referralSource: z.string().max(160).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`signup-request:${ip}`, { capacity: 5, refillPerSec: 0.05 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Probá de nuevo en un rato.' }, { status: 429 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisá los datos del formulario.', issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const created = await prisma.signupRequest.create({
    data: {
      contactName: d.contactName,
      email: d.email.toLowerCase(),
      phone: d.phone,
      role: d.role || null,
      businessName: d.businessName,
      province: d.province,
      city: d.city || null,
      address: d.address || null,
      numberOfCourts: d.numberOfCourts,
      courtTypes: JSON.stringify(d.courtTypes),
      surfaceType: d.surfaceType || null,
      matchesPerWeek: d.matchesPerWeek || null,
      hasCameras: d.hasCameras || null,
      hasInternet: d.hasInternet || null,
      referralSource: d.referralSource || null,
      message: d.message || null,
    },
    select: { id: true },
  });

  await logger.audit('Solicitud de cancha recibida', { signupRequestId: created.id, businessName: d.businessName, email: d.email });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
