import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { getVideoStorage } from '@/lib/storage';
import { parseCents, MAX_PRICE_CENTS } from '@/lib/money';

export const runtime = 'nodejs';

const Body = z.object({
  title: z.string().min(1).max(200).optional(),
  recordedAt: z.string().datetime().optional(),
  durationSec: z.number().int().min(0).max(60 * 60 * 8).optional(),
  filePath: z.string().min(1).max(255).optional(),
  priceArs: z.string().optional(),
  downloadFeeArs: z.string().optional(),
});

async function ownedRecording(id: string, userId: string) {
  const rec = await prisma.recording.findUnique({
    where: { id },
    include: { court: { include: { complex: true } } },
  });
  if (!rec || rec.deletedAt) return { error: 'No encontrada', status: 404 as const };
  if (rec.court.complex.ownerId !== userId) return { error: 'No es tuya', status: 403 as const };
  return { rec };
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const owned = await ownedRecording(ctx.params.id, session.user.id);
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.recordedAt !== undefined) data.recordedAt = new Date(parsed.data.recordedAt);
  if (parsed.data.durationSec !== undefined) data.durationSec = parsed.data.durationSec;

  if (parsed.data.priceArs !== undefined) {
    const c = parseCents(parsed.data.priceArs);
    if (c < 0 || c > MAX_PRICE_CENTS) return NextResponse.json({ error: 'Precio fuera de rango' }, { status: 400 });
    data.priceCents = c;
  }
  if (parsed.data.downloadFeeArs !== undefined) {
    const c = parseCents(parsed.data.downloadFeeArs);
    if (c < 0 || c > MAX_PRICE_CENTS) return NextResponse.json({ error: 'Adicional fuera de rango' }, { status: 400 });
    data.downloadFeeCents = c;
  }
  if (parsed.data.filePath !== undefined) {
    const storage = getVideoStorage();
    try { storage.resolveAbsolutePath(parsed.data.filePath); }
    catch { return NextResponse.json({ error: 'Path inválido' }, { status: 400 }); }
    data.filePath = parsed.data.filePath;
    data.status = (await storage.exists(parsed.data.filePath)) ? 'READY' : 'UPLOADING';
  }

  await prisma.recording.update({ where: { id: ctx.params.id }, data });
  await logger.audit('Recording editada', { recordingId: ctx.params.id, fields: Object.keys(data) }, session.user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CANCHA) return NextResponse.json({ error: 'Solo CANCHA' }, { status: 403 });

  const owned = await ownedRecording(ctx.params.id, session.user.id);
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  // Soft delete + desactiva tokens activos. Los endpoints de stream/redeem ya
  // verifican deletedAt, así que el acceso se corta en todos lados.
  await prisma.$transaction([
    prisma.recording.update({ where: { id: ctx.params.id }, data: { deletedAt: new Date() } }),
    prisma.accessToken.updateMany({ where: { recordingId: ctx.params.id, isActive: true }, data: { isActive: false } }),
    prisma.shareLink.updateMany({ where: { recordingId: ctx.params.id, isActive: true }, data: { isActive: false } }),
  ]);

  await logger.audit('Recording borrada (soft)', { recordingId: ctx.params.id }, session.user.id);
  return NextResponse.json({ ok: true });
}
