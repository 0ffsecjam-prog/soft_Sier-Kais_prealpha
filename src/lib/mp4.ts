import { open } from 'node:fs/promises';

export type FastStartResult = 'FASTSTART' | 'SLOW' | 'UNKNOWN';

/**
 * Detecta si un MP4 es "faststart" (átomo `moov` antes que `mdat`).
 * Un MP4 con moov al final obliga al reproductor a descargar casi todo el
 * archivo antes de empezar — faststart permite arranque inmediato y seek.
 *
 * Lee solo las cabeceras de los top-level boxes (size+type, 8-16 bytes c/u),
 * así que es barato incluso en archivos de varios GB.
 */
export async function detectFastStart(absPath: string): Promise<FastStartResult> {
  let fh;
  try {
    fh = await open(absPath, 'r');
    let offset = 0;
    const header = Buffer.alloc(16);

    for (let i = 0; i < 64; i++) {
      const { bytesRead } = await fh.read(header, 0, 16, offset);
      if (bytesRead < 8) return 'UNKNOWN';

      let boxSize = header.readUInt32BE(0);
      const type = header.toString('ascii', 4, 8);
      let headerLen = 8;

      // size === 1 → tamaño extendido de 64 bits en los siguientes 8 bytes
      if (boxSize === 1) {
        const high = header.readUInt32BE(8);
        const low = header.readUInt32BE(12);
        boxSize = high * 2 ** 32 + low;
        headerLen = 16;
      }

      if (type === 'moov') return 'FASTSTART';
      if (type === 'mdat') return 'SLOW';

      if (boxSize <= 0) return 'UNKNOWN';      // size 0 = hasta EOF; no podemos avanzar
      if (boxSize < headerLen) return 'UNKNOWN';
      offset += boxSize;
    }
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  } finally {
    await fh?.close();
  }
}

export function isMp4(path: string): boolean {
  return /\.(mp4|m4v|mov)$/i.test(path);
}
