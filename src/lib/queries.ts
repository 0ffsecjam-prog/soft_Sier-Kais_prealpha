import { prisma } from './db';

export async function getComplexByOwnerId(ownerId: string) {
  return prisma.complex.findUnique({
    where: { ownerId },
    include: {
      courts: { orderBy: { name: 'asc' } },
    },
  });
}

interface PaymentLite { type: string; amountCents: number; status: string }

export interface RevenueBreakdown {
  videoRevenueCents: number;        // RECORDING + CASH_SALE + VIDEO_BUNDLE
  downloadRevenueCents: number;     // DOWNLOAD
  reservationRevenueCents: number;  // RESERVATION (alquiler de cancha)
  totalRevenueCents: number;
  canchaShareCents: number;         // alquiler 100% + (video+download)*share
  tempelShareCents: number;         // (video+download)*(1-share)
  paymentsCount: number;
}

/**
 * El split de ingresos (revenueSharePct) aplica SOLO a la venta de video y
 * descargas. El alquiler de la cancha (RESERVATION) es 100% de la Cancha:
 * Tempel no toma comisión sobre el alquiler.
 */
export function classifyRevenue(payments: PaymentLite[], sharePctBp: number): RevenueBreakdown {
  let video = 0, download = 0, reservation = 0;
  for (const p of payments) {
    if (p.status === 'FAILED' || p.status === 'REFUNDED') continue;
    switch (p.type) {
      case 'RECORDING':
      case 'CASH_SALE':
      case 'VIDEO_BUNDLE':
        video += p.amountCents; break;
      case 'DOWNLOAD':
        download += p.amountCents; break;
      case 'RESERVATION':
        reservation += p.amountCents; break;
    }
  }
  const shareable = video + download;
  const tempelShareCents = shareable - Math.round((shareable * sharePctBp) / 10000);
  const canchaShareCents = reservation + (shareable - tempelShareCents);
  return {
    videoRevenueCents: video,
    downloadRevenueCents: download,
    reservationRevenueCents: reservation,
    totalRevenueCents: video + download + reservation,
    canchaShareCents,
    tempelShareCents,
    paymentsCount: payments.length,
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface ComplexMetrics extends RevenueBreakdown {
  monthLabel: string;
  byMonth: Array<{ month: string; videoCents: number; downloadCents: number; reservationCents: number }>;
}

export async function getComplexMetrics(complexId: string, sharePctBp: number): Promise<ComplexMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const courts = await prisma.court.findMany({ where: { complexId }, select: { id: true } });
  const courtIds = courts.map((c) => c.id);

  const EXCLUDED = ['FAILED', 'REFUNDED'];
  const where = (since: Date) => ({
    createdAt: { gte: since },
    status: { notIn: EXCLUDED },
    OR: [
      { claim: { recording: { courtId: { in: courtIds } } } },
      { reservation: { courtId: { in: courtIds } } },
    ],
  });

  const monthPayments = await prisma.payment.findMany({
    where: where(monthStart),
    select: { type: true, amountCents: true, status: true },
  });
  const breakdown = classifyRevenue(monthPayments, sharePctBp);

  const histPayments = await prisma.payment.findMany({
    where: where(sixMonthsAgo),
    select: { type: true, amountCents: true, createdAt: true },
  });

  const byMonthMap = new Map<string, { videoCents: number; downloadCents: number; reservationCents: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    byMonthMap.set(monthKey(d), { videoCents: 0, downloadCents: 0, reservationCents: 0 });
  }
  for (const p of histPayments) {
    const m = byMonthMap.get(monthKey(p.createdAt));
    if (!m) continue;
    if (p.type === 'RECORDING' || p.type === 'CASH_SALE' || p.type === 'VIDEO_BUNDLE') m.videoCents += p.amountCents;
    else if (p.type === 'DOWNLOAD') m.downloadCents += p.amountCents;
    else if (p.type === 'RESERVATION') m.reservationCents += p.amountCents;
  }
  const byMonth = Array.from(byMonthMap, ([month, v]) => ({ month, ...v }));

  return {
    ...breakdown,
    monthLabel: monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    byMonth,
  };
}

export interface AdminComplexRow extends RevenueBreakdown {
  id: string;
  name: string;
  shareBp: number;
}

/** Métricas del mes en curso por complejo, para el dashboard admin. */
export async function getAdminComplexMetrics(): Promise<AdminComplexRow[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const complexes = await prisma.complex.findMany({ select: { id: true, name: true, revenueSharePct: true } });

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: monthStart }, status: { notIn: ['FAILED', 'REFUNDED'] } },
    select: {
      type: true, amountCents: true, status: true,
      claim: { select: { recording: { select: { court: { select: { complexId: true } } } } } },
      reservation: { select: { court: { select: { complexId: true } } } },
    },
  });

  const grouped = new Map<string, PaymentLite[]>();
  for (const p of payments) {
    const cid = p.claim?.recording.court.complexId ?? p.reservation?.court.complexId;
    if (!cid) continue;
    const list = grouped.get(cid) ?? [];
    list.push({ type: p.type, amountCents: p.amountCents, status: p.status });
    grouped.set(cid, list);
  }

  return complexes
    .map((c) => ({
      id: c.id,
      name: c.name,
      shareBp: c.revenueSharePct,
      ...classifyRevenue(grouped.get(c.id) ?? [], c.revenueSharePct),
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents);
}
