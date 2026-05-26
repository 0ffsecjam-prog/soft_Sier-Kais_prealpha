import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId } from '@/lib/queries';
import { formatCents } from '@/lib/money';
import { getVideoStorage } from '@/lib/storage';
import { EditRecordingForm } from './EditRecordingForm';
import { ClaimsManager } from './ClaimsManager';

export const dynamic = 'force-dynamic';

export default async function CanchaRecordingDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const recording = await prisma.recording.findFirst({
    where: { id: params.id, court: { complexId: complex.id }, deletedAt: null },
    include: {
      court: true,
      claims: {
        where: { revokedAt: null },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { claimedAt: 'desc' },
      },
    },
  });
  if (!recording) notFound();

  const storage = getVideoStorage();
  const fileExists = await storage.exists(recording.filePath);

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/cancha/grabaciones" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"><ArrowLeft size={14} />Volver</Link>

      <div>
        <div className="text-xs text-gray-500">{recording.court.name}</div>
        <h1 className="mt-1 text-2xl font-bold">{recording.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {fileExists
            ? <span className="badge badge-success"><CheckCircle2 size={12} />Archivo OK</span>
            : <span className="badge badge-warn"><AlertTriangle size={12} />Falta el archivo: <code className="ml-1">{recording.filePath}</code></span>}
          <span className="badge badge-muted">{recording.claims.length} con acceso</span>
          <span className="text-gray-500">Precio {formatCents(recording.priceCents)} · descarga {formatCents(recording.downloadFeeCents)}</span>
        </div>
      </div>

      <EditRecordingForm
        recordingId={recording.id}
        initial={{
          title: recording.title,
          recordedAt: recording.recordedAt.toISOString(),
          durationMin: Math.round(recording.durationSec / 60),
          filePath: recording.filePath,
          priceArs: (recording.priceCents / 100).toFixed(2),
          downloadFeeArs: (recording.downloadFeeCents / 100).toFixed(2),
        }}
      />

      <ClaimsManager
        claims={recording.claims.map((c) => ({
          id: c.id,
          name: c.user.name,
          email: c.user.email,
          pricePaidCents: c.pricePaidCents,
          hasDownloadAccess: c.hasDownloadAccess,
          claimedAt: c.claimedAt.toISOString(),
        }))}
      />
    </div>
  );
}
