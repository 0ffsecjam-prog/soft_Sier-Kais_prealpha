import { promises as fs } from 'node:fs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { getVideoStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { fileResponse, videoContentType } from '@/lib/videoResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: Request, ctx: { params: { id: string } }, method: string) {
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
    await logger.warn('Archivo de video no encontrado', { recordingId: recording.id, filePath: recording.filePath });
    return new Response('Archivo no encontrado en storage', { status: 404 });
  }

  return fileResponse({
    absPath,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    contentType: videoContentType(absPath),
    method,
    rangeHeader: req.headers.get('range'),
    ifRange: req.headers.get('if-range'),
    signal: req.signal,
    disposition: { type: 'inline' },
  });
}

export function GET(req: Request, ctx: { params: { id: string } }) {
  return handle(req, ctx, 'GET');
}

export function HEAD(req: Request, ctx: { params: { id: string } }) {
  return handle(req, ctx, 'HEAD');
}
