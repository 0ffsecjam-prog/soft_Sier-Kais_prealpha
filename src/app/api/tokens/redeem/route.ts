import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { ipFromHeaders, rateLimit } from '@/lib/rate-limit';
import { normalizeCode } from '@/lib/tokens';

export const runtime = 'nodejs';

const Body = z.object({ code: z.string().min(4).max(32) });

export async function POST(req: Request) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`redeem:${ip}`, { capacity: 8, refillPerSec: 0.2 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos segundos.' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.CLIENTE) return NextResponse.json({ error: 'Solo clientes pueden canjear códigos' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Código inválido' }, { status: 400 });

  const code = normalizeCode(parsed.data.code);
  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const token = await tx.accessToken.findUnique({
        where: { code },
        include: { recording: true },
      });
      if (!token || !token.isActive) throw new Error('TOKEN_NOT_FOUND');
      if (token.expiresAt && token.expiresAt.getTime() < Date.now()) throw new Error('TOKEN_EXPIRED');
      if (token.maxUses !== null && token.usedCount >= token.maxUses) throw new Error('TOKEN_EXHAUSTED');
      if (token.recording.deletedAt) throw new Error('RECORDING_REMOVED');

      const existing = await tx.claim.findFirst({
        where: { userId, recordingId: token.recordingId, revokedAt: null },
      });
      if (existing) return { recordingId: token.recordingId, alreadyClaimed: true };

      const pricePaidCents = token.priceOverrideCents ?? token.recording.priceCents;

      const claim = await tx.claim.create({
        data: {
          userId,
          recordingId: token.recordingId,
          tokenId: token.id,
          pricePaidCents,
        },
      });

      // No registramos Payment para shares gratuitos (CLIENTE_SHARE con monto 0).
      if (!(token.kind === 'CLIENTE_SHARE' && pricePaidCents === 0)) {
        const paymentType =
          token.kind === 'ADMIN_CASH' ? 'CASH_SALE' : 'RECORDING';
        const paymentMethod = token.kind === 'ADMIN_CASH' ? 'CASH' : 'SIMULATED';
        const paymentStatus = token.kind === 'ADMIN_CASH' ? 'PAID' : 'SIMULATED';
        await tx.payment.create({
          data: {
            claimId: claim.id,
            type: paymentType,
            amountCents: pricePaidCents,
            status: paymentStatus,
            paymentMethod,
          },
        });
      }

      await tx.accessToken.update({
        where: { id: token.id },
        data: { usedCount: { increment: 1 } },
      });

      return { recordingId: token.recordingId, alreadyClaimed: false, kind: token.kind };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logger.audit('Token canjeado', { code, userId, recordingId: result.recordingId, alreadyClaimed: result.alreadyClaimed }, userId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN';
    const reasons: Record<string, { http: number; msg: string }> = {
      TOKEN_NOT_FOUND: { http: 404, msg: 'Código no encontrado o desactivado.' },
      TOKEN_EXPIRED:   { http: 410, msg: 'Este código ya venció.' },
      TOKEN_EXHAUSTED: { http: 410, msg: 'Este código ya alcanzó su límite de usos.' },
      RECORDING_REMOVED: { http: 410, msg: 'El video ya no está disponible.' },
    };
    const r = reasons[msg];
    if (r) {
      await logger.warn('Redeem rechazado', { code, userId, reason: msg }, userId);
      return NextResponse.json({ error: r.msg }, { status: r.http });
    }
    await logger.error('Redeem error inesperado', { code, userId, err: msg }, userId);
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 });
  }
}
