import { promises as fs, createReadStream } from 'node:fs';
import { basename, extname } from 'node:path';
import { Readable } from 'node:stream';
import { prisma } from '@/lib/db';
import { getVideoStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const link = await prisma.shareLink.findUnique({
    where: { token: ctx.params.token },
    include: { recording: true },
  });
  if (!link || !link.isActive) return new Response('Link inválido o desactivado', { status: 404 });
  if (link.expiresAt.getTime() < Date.now()) return new Response('Link vencido', { status: 410 });
  if (link.recording.deletedAt) return new Response('Video no disponible', { status: 404 });

  const storage = getVideoStorage();
  let absPath: string;
  try { absPath = storage.resolveAbsolutePath(link.recording.filePath); }
  catch { return new Response('Bad path', { status: 400 }); }

  let stat;
  try { stat = await fs.stat(absPath); }
  catch { return new Response('Archivo no encontrado', { status: 404 }); }

  const ext = extname(absPath) || '.mp4';
  const safeTitle = link.recording.title.replace(/[^\w\s.-]/g, '_').slice(0, 80).trim() || basename(absPath, ext);
  const fileName = `${safeTitle}${ext}`;

  await logger.audit('Descarga via ShareLink', { shareLinkId: link.id, recordingId: link.recordingId });

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
