import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';

const MIME: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.mkv':  'video/x-matroska',
  '.m4v':  'video/x-m4v',
  '.ogg':  'video/ogg',
};

export function videoContentType(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

export interface FileResponseOptions {
  absPath: string;
  size: number;
  mtimeMs: number;
  contentType: string;
  method: string;                    // 'GET' | 'HEAD'
  rangeHeader: string | null;
  ifRange?: string | null;
  signal?: AbortSignal;
  disposition?: { type: 'inline' | 'attachment'; filename?: string };
  cacheControl?: string;
}

function etagFor(size: number, mtimeMs: number): string {
  return `"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

function toWebStream(absPath: string, start: number, end: number, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(absPath, { start, end });
  if (signal) {
    if (signal.aborted) nodeStream.destroy();
    else signal.addEventListener('abort', () => nodeStream.destroy(), { once: true });
  }
  return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
}

function unsatisfiable(size: number): Response {
  return new Response('Range no satisfiable', {
    status: 416,
    headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' },
  });
}

/**
 * Construye una Response óptima para servir un archivo:
 * - Honra Range (206) exacto, abierto (bytes=N-) y sufijo (bytes=-N).
 * - 200 completo cuando no hay Range.
 * - ETag + Last-Modified + Accept-Ranges para revalidación/reanudación.
 * - Soporta HEAD (headers sin body).
 * - Limpia el file descriptor si el cliente aborta (seek/cancelación).
 */
export function fileResponse(opts: FileResponseOptions): Response {
  const etag = etagFor(opts.size, opts.mtimeMs);
  const lastModified = new Date(opts.mtimeMs).toUTCString();

  const headers: Record<string, string> = {
    'Content-Type': opts.contentType,
    'Accept-Ranges': 'bytes',
    'ETag': etag,
    'Last-Modified': lastModified,
    'Cache-Control': opts.cacheControl ?? 'private, max-age=0, must-revalidate',
  };
  if (opts.disposition) {
    const fn = opts.disposition.filename ? `; filename="${opts.disposition.filename}"` : '';
    headers['Content-Disposition'] = `${opts.disposition.type}${fn}`;
  }

  const isHead = opts.method === 'HEAD';

  // If-Range: si no matchea el validador actual, ignoramos el Range (servimos completo).
  let honorRange = !!opts.rangeHeader;
  if (opts.rangeHeader && opts.ifRange) {
    if (opts.ifRange !== etag && opts.ifRange !== lastModified) honorRange = false;
  }

  if (honorRange && opts.rangeHeader) {
    // Una sola unidad de rango. Multipart ranges no se soportan (poco frecuente en video).
    const m = /^bytes=(\d*)-(\d*)$/.exec(opts.rangeHeader.trim());
    if (!m || (m[1] === '' && m[2] === '')) return unsatisfiable(opts.size);

    let start: number;
    let end: number;
    if (m[1] === '') {
      // Sufijo: bytes=-N → últimos N bytes
      const n = parseInt(m[2], 10);
      if (!Number.isFinite(n) || n <= 0) return unsatisfiable(opts.size);
      start = Math.max(0, opts.size - n);
      end = opts.size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? opts.size - 1 : parseInt(m[2], 10);
    }

    if (!Number.isFinite(start) || start >= opts.size || start > end) return unsatisfiable(opts.size);
    end = Math.min(end, opts.size - 1);

    const chunkSize = end - start + 1;
    const rangeHeaders = {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${opts.size}`,
      'Content-Length': String(chunkSize),
    };
    if (isHead) return new Response(null, { status: 206, headers: rangeHeaders });
    return new Response(toWebStream(opts.absPath, start, end, opts.signal), { status: 206, headers: rangeHeaders });
  }

  const fullHeaders = { ...headers, 'Content-Length': String(opts.size) };
  if (isHead) return new Response(null, { status: 200, headers: fullHeaders });
  return new Response(toWebStream(opts.absPath, 0, opts.size - 1, opts.signal), { status: 200, headers: fullHeaders });
}
