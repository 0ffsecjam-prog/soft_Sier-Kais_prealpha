import { promises as fs } from 'node:fs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { getVideoStorage } from '@/lib/storage';
import { ensureThumbnail } from '@/lib/thumbnail';
import { fileResponse } from '@/lib/videoResponse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const storage = getVideoStorage();
  let videoPath: string;
  try { videoPath = storage.resolveAbsolutePath(recording.filePath); }
  catch { return new Response('Bad path', { status: 400 }); }

  try { await fs.stat(videoPath); } catch { return new Response('Sin archivo', { status: 404 }); }

  const thumbPath = await ensureThumbnail(recording.id, videoPath);
  if (!thumbPath) return new Response('Sin thumbnail', { status: 404 });

  const stat = await fs.stat(thumbPath);
  return fileResponse({
    absPath: thumbPath,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    contentType: 'image/jpeg',
    method: req.method,
    rangeHeader: req.headers.get('range'),
    ifRange: req.headers.get('if-range'),
    signal: req.signal,
    disposition: { type: 'inline' },
    cacheControl: 'private, max-age=86400',
  });
}
