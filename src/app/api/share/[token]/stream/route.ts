import { promises as fs, createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { prisma } from '@/lib/db';
import { getVideoStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.mkv':  'video/x-matroska',
  '.m4v':  'video/x-m4v',
};

export async function GET(req: Request, ctx: { params: { token: string } }) {
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
  catch {
    await logger.warn('Archivo de video no encontrado (share)', { recordingId: link.recordingId });
    return new Response('Archivo no encontrado', { status: 404 });
  }

  // Incrementar view count solo en requests sin Range header (primera carga)
  if (!req.headers.get('range')) {
    prisma.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
  }

  const size = stat.size;
  const ext = extname(absPath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const range = req.headers.get('range');

  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!m) return new Response('Range malformado', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : Math.min(start + 1024 * 1024 - 1, size - 1);
    if (start >= size || end >= size || start > end) {
      return new Response('Range fuera de rango', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(absPath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=0',
      },
    });
  }

  const nodeStream = createReadStream(absPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=0',
    },
  });
}
