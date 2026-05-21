import { promises as fs, createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
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

export async function GET(req: Request, ctx: { params: { id: string } }) {
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
  } else if (session.user.role === ROLES.CANCHA) {
    if (recording.court.complex.ownerId !== session.user.id) return new Response('Forbidden', { status: 403 });
  }
  // ADMIN: acceso libre

  const storage = getVideoStorage();
  let absPath: string;
  try { absPath = storage.resolveAbsolutePath(recording.filePath); }
  catch {
    await logger.error('Path inválido al stream', { recordingId: recording.id, filePath: recording.filePath });
    return new Response('Bad path', { status: 400 });
  }

  let stat;
  try { stat = await fs.stat(absPath); }
  catch {
    await logger.warn('Archivo de video no encontrado', { recordingId: recording.id, filePath: recording.filePath, absPath });
    return new Response('Archivo no encontrado en storage', { status: 404 });
  }

  const size = stat.size;
  const ext = extname(absPath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const range = req.headers.get('range');

  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!m) {
      return new Response('Range malformado', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
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
