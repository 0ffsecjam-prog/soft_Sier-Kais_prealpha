import { prisma } from './db';

export async function getComplexByOwnerId(ownerId: string) {
  return prisma.complex.findUnique({
    where: { ownerId },
    include: {
      courts: { orderBy: { name: 'asc' } },
    },
  });
}

export interface ComplexMetrics {
  recordingRevenueCents: number;
  downloadRevenueCents: number;
  totalRevenueCents: number;
  canchaShareCents: number;
  tempelShareCents: number;
  claimsCount: number;
  monthLabel: string;
  byMonth: Array<{ month: string; recordingCents: number; downloadCents: number }>;
}

export async function getComplexMetrics(complexId: string, sharePctBp: number): Promise<ComplexMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const courts = await prisma.court.findMany({ where: { complexId }, select: { id: true } });
  const courtIds = courts.map((c) => c.id);

  const claims = await prisma.claim.findMany({
    where: {
      revokedAt: null,
      claimedAt: { gte: monthStart },
      recording: { courtId: { in: courtIds } },
    },
    select: { pricePaidCents: true, hasDownloadAccess: true, downloadFeeCents: true, downloadPaidAt: true, claimedAt: true },
  });

  const recordingRevenueCents = claims.reduce((s, c) => s + c.pricePaidCents, 0);
  const downloadRevenueCents = claims.reduce((s, c) => s + (c.hasDownloadAccess && c.downloadFeeCents ? c.downloadFeeCents : 0), 0);
  const totalRevenueCents = recordingRevenueCents + downloadRevenueCents;
  const canchaShareCents = Math.round((totalRevenueCents * sharePctBp) / 10000);
  const tempelShareCents = totalRevenueCents - canchaShareCents;

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const all = await prisma.claim.findMany({
    where: {
      revokedAt: null,
      claimedAt: { gte: sixMonthsAgo },
      recording: { courtId: { in: courtIds } },
    },
    select: { pricePaidCents: true, hasDownloadAccess: true, downloadFeeCents: true, claimedAt: true },
  });

  const byMonthMap = new Map<string, { recordingCents: number; downloadCents: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonthMap.set(key, { recordingCents: 0, downloadCents: 0 });
  }
  for (const c of all) {
    const key = `${c.claimedAt.getFullYear()}-${String(c.claimedAt.getMonth() + 1).padStart(2, '0')}`;
    const m = byMonthMap.get(key);
    if (m) {
      m.recordingCents += c.pricePaidCents;
      if (c.hasDownloadAccess && c.downloadFeeCents) m.downloadCents += c.downloadFeeCents;
    }
  }
  const byMonth = Array.from(byMonthMap, ([month, v]) => ({ month, ...v }));

  return {
    recordingRevenueCents,
    downloadRevenueCents,
    totalRevenueCents,
    canchaShareCents,
    tempelShareCents,
    claimsCount: claims.length,
    monthLabel: monthStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    byMonth,
  };
}
