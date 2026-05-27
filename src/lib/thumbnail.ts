import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';

const execFileAsync = promisify(execFile);

let ffmpegAvailable: boolean | null = null;

export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

export function thumbnailDir(): string {
  return resolve(process.env.THUMBNAIL_STORAGE_PATH || './storage/thumbnails');
}

// recordingId es un cuid (alfanumérico), seguro como nombre de archivo.
export function thumbnailPathFor(recordingId: string): string {
  return join(thumbnailDir(), `${recordingId}.jpg`);
}

// Dedup de generaciones en vuelo para no lanzar N ffmpeg por el mismo video.
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Devuelve el path absoluto del thumbnail, generándolo on-demand con ffmpeg
 * si no existe. Si no hay ffmpeg o falla, devuelve null (la UI cae al placeholder).
 * Usa execFile (sin shell) → sin riesgo de inyección por el path del video.
 */
export async function ensureThumbnail(recordingId: string, videoAbsPath: string, atSeconds = 3): Promise<string | null> {
  const out = thumbnailPathFor(recordingId);
  try { await fs.access(out); return out; } catch { /* generar */ }

  const existing = inFlight.get(recordingId);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    if (!(await hasFfmpeg())) return null;
    try {
      await fs.mkdir(thumbnailDir(), { recursive: true });
      await execFileAsync(
        'ffmpeg',
        ['-ss', String(atSeconds), '-i', videoAbsPath, '-frames:v', '1', '-vf', 'scale=640:-1', '-y', out],
        { timeout: 20000 },
      );
      await fs.access(out);
      return out;
    } catch {
      return null;
    }
  })();

  inFlight.set(recordingId, task);
  try { return await task; }
  finally { inFlight.delete(recordingId); }
}

export async function deleteThumbnail(recordingId: string): Promise<void> {
  try { await fs.unlink(thumbnailPathFor(recordingId)); } catch { /* no existía */ }
}
