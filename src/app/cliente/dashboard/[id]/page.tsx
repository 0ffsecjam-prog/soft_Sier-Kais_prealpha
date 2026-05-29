import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { formatCents } from '@/lib/money';
import VideoPlayer from '@/components/VideoPlayer';
import { BuyDownloadButton } from './BuyDownloadButton';
import { SharePanel } from './SharePanel';

export const dynamic = 'force-dynamic';

export default async function ClienteRecordingPage({ params }: { params: { id: string } }) {
  const session = await requireRole(ROLES.CLIENTE);

  const claim = await prisma.claim.findFirst({
    where: { userId: session.user.id, recordingId: params.id, revokedAt: null },
    include: {
      recording: { include: { court: { include: { complex: true } } } },
    },
  });

  if (!claim) notFound();

  const existingShares = await prisma.shareLink.findMany({
    where: { recordingId: params.id, createdById: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const existingAccountTokens = await prisma.accessToken.findMany({
    where: { recordingId: params.id, createdById: session.user.id, kind: 'CLIENTE_SHARE' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="space-y-4">
      <Link href="/cliente/dashboard" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
        <ArrowLeft size={14} />Volver
      </Link>

      <div>
        <div className="text-xs text-gray-500">{claim.recording.court.complex.name} · {claim.recording.court.name}</div>
        <h1 className="mt-1 text-2xl font-bold">{claim.recording.title}</h1>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{new Date(claim.recording.recordedAt).toLocaleString('es-AR')}</div>
      </div>

      <VideoPlayer src={`/api/recordings/${claim.recording.id}/stream`} poster={`/api/recordings/${claim.recording.id}/thumbnail`} title={claim.recording.title} />

      <div className="card p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold">Descarga del archivo</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Si querés guardar el video sin internet, comprá el adicional para descargarlo.
          </p>
        </div>
        {claim.hasDownloadAccess ? (
          <div className="flex flex-wrap gap-3 items-center">
            <span className="badge badge-success">Descarga habilitada</span>
            <a href={`/api/recordings/${claim.recording.id}/download`} className="btn btn-primary"><Download size={16} />Descargar</a>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <BuyDownloadButton recordingId={claim.recording.id} feeCents={claim.recording.downloadFeeCents} />
            <span className="text-sm text-gray-500">Precio: {formatCents(claim.recording.downloadFeeCents)} (simulado)</span>
          </div>
        )}
      </div>

      <SharePanel
        recordingId={claim.recording.id}
        initialShares={existingShares.map((s) => ({
          id: s.id,
          token: s.token,
          expiresAt: s.expiresAt.toISOString(),
          isActive: s.isActive,
          viewCount: s.viewCount,
        }))}
        initialAccountTokens={existingAccountTokens.map((t) => ({
          id: t.id,
          code: t.code,
          maxUses: t.maxUses,
          usedCount: t.usedCount,
          expiresAt: t.expiresAt?.toISOString() ?? null,
          isActive: t.isActive,
        }))}
      />
    </div>
  );
}
