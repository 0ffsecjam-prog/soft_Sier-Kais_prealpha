import { promises as fs, createReadStream } from 'node:fs';
import { basename, extname } from 'node:path';
import { Readable } from 'node:stream';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { getVideoStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const recording = await prisma.recording.findUnique({
    where: { id: ctx.params.id },
    include: { court: { include: { complex: true } } },
  });
  if (!recording || recording.deletedAt) return new Response('Not found', { status: 404 });

  if (session.user.role === ROLES.CLIENTE) {
    const claim = await prisma.claim.findFirst({
      where: { userId: session.user.id, recordingId: recording.id, revokedAt: null },
    });
    if (!claim) return new Response('Forbidden', { status: 403 });
    if (!claim.hasDownloadAccess) return new Response('Necesitás pagar el adicional de descarga.', { status: 402 });
  } else if (session.user.role === ROLES.CANCHA) {
    if (recording.court.complex.ownerId !== session.user.id) return new Response('Forbidden', { status: 403 });
  }

  const storage = getVideoStorage();
  let absPath: string;
  try { absPath = storage.resolveAbsolutePath(recording.filePath); }
  catch { return new Response('Bad path', { status: 400 }); }

  let stat;
  try { stat = await fs.stat(absPath); }
  catch { return new Response('Archivo no encontrado', { status: 404 }); }

  const ext = extname(absPath) || '.mp4';
  const safeTitle = recording.title.replace(/[^\w\s.-]/g, '_').slice(0, 80).trim() || basename(absPath, ext);
  const fileName = `${safeTitle}${ext}`;

  await logger.audit('Descarga iniciada', { userId: session.user.id, recordingId: recording.id, fileName }, session.user.id);

  const nodeStream = createReadStream(absPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=0',
    },
  });
}
