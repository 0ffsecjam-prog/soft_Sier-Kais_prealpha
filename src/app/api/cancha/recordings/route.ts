import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { getVideoStorage } from '@/lib/storage';
import { parseCents, formatCents, MAX_PRICE_CENTS } from '@/lib/money';

export const runtime = 'nodejs';

const Body = z.object({
  courtId: z.string().min(1),
  title: z.string().min(1).max(200),
  recordedAt: z.string().datetime(),
  durationSec: z.number().int().min(0).max(60 * 60 * 8),
  filePath: z.string().min(1).max(255),
  priceArs: z.string(),
  downloadFeeArs: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const complex = await prisma.complex.findUnique({ where: { ownerId: session.user.id } });
  if (!complex) return NextResponse.json({ error: 'Sin complejo asociado' }, { status: 400 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });

  const court = await prisma.court.findFirst({ where: { id: parsed.data.courtId, complexId: complex.id } });
  if (!court) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });

  const storage = getVideoStorage();
  try { storage.resolveAbsolutePath(parsed.data.filePath); }
  catch { return NextResponse.json({ error: 'Path inválido' }, { status: 400 }); }

  const exists = await storage.exists(parsed.data.filePath);
  const priceCents = parseCents(parsed.data.priceArs);
  const downloadFeeCents = parseCents(parsed.data.downloadFeeArs);

  if (priceCents < 0 || priceCents > MAX_PRICE_CENTS) {
    return NextResponse.json({ error: `El precio debe estar entre 0 y ${formatCents(MAX_PRICE_CENTS)}.` }, { status: 400 });
  }
  if (downloadFeeCents < 0 || downloadFeeCents > MAX_PRICE_CENTS) {
    return NextResponse.json({ error: `El adicional debe estar entre 0 y ${formatCents(MAX_PRICE_CENTS)}.` }, { status: 400 });
  }

  const rec = await prisma.recording.create({
    data: {
      courtId: court.id,
      title: parsed.data.title,
      recordedAt: new Date(parsed.data.recordedAt),
      durationSec: parsed.data.durationSec,
      filePath: parsed.data.filePath,
      priceCents,
      downloadFeeCents,
      status: exists ? 'READY' : 'UPLOADING',
    },
  });

  await logger.audit('Recording creada', { recordingId: rec.id, fileExists: exists }, session.user.id);
  return NextResponse.json({ ok: true, id: rec.id, fileExists: exists });
}
