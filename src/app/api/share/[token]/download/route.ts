import { promises as fs } from 'node:fs';
import { basename, extname } from 'node:path';
import { prisma } from '@/lib/db';
import { getVideoStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { fileResponse } from '@/lib/videoResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: Request, ctx: { params: { token: string } }, method: string) {
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

  if (method === 'GET') {
    await logger.audit('Descarga via ShareLink', { shareLinkId: link.id, recordingId: link.recordingId });
  }

  return fileResponse({
    absPath,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    contentType: 'application/octet-stream',
    method,
    rangeHeader: req.headers.get('range'),
    ifRange: req.headers.get('if-range'),
    signal: req.signal,
    disposition: { type: 'attachment', filename: fileName },
  });
}

export function GET(req: Request, ctx: { params: { token: string } }) {
  return handle(req, ctx, 'GET');
}

export function HEAD(req: Request, ctx: { params: { token: string } }) {
  return handle(req, ctx, 'HEAD');
}
