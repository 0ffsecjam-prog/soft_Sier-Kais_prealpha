import { promises as fs } from 'node:fs';
import { resolve, join, relative, normalize, sep } from 'node:path';
import type { FileInfo, StorageProvider } from './index';

export class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor(rootPath: string) {
    this.root = resolve(rootPath);
  }

  rootPath(): string {
    return this.root;
  }

  resolveAbsolutePath(relativePath: string): string {
    const cleaned = normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
    const full = resolve(this.root, cleaned);
    // Prevent path traversal
    if (!full.startsWith(this.root + sep) && full !== this.root) {
      throw new Error('path traversal detected');
    }
    return full;
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolveAbsolutePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async stat(relativePath: string): Promise<FileInfo | null> {
    try {
      const abs = this.resolveAbsolutePath(relativePath);
      const st = await fs.stat(abs);
      if (!st.isFile()) return null;
      return {
        name: relativePath.split('/').pop() ?? relativePath,
        relativePath,
        absolutePath: abs,
        sizeBytes: st.size,
        mtime: st.mtime,
      };
    } catch {
      return null;
    }
  }

  async list(): Promise<FileInfo[]> {
    try {
      await fs.mkdir(this.root, { recursive: true });
    } catch {}
    const out: FileInfo[] = [];
    await walk(this.root, this.root, out);
    return out.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }
}

async function walk(root: string, dir: string, out: FileInfo[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(root, abs, out);
    } else if (e.isFile()) {
      const st = await fs.stat(abs);
      const rel = relative(root, abs).split(sep).join('/');
      out.push({
        name: e.name,
        relativePath: rel,
        absolutePath: abs,
        sizeBytes: st.size,
        mtime: st.mtime,
      });
    }
  }
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
