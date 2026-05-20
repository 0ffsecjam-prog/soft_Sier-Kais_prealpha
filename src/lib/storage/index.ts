import { LocalStorageProvider } from './local';

export interface FileInfo {
  name: string;
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  mtime: Date;
}

export interface StorageProvider {
  resolveAbsolutePath(relativePath: string): string;
  exists(relativePath: string): Promise<boolean>;
  stat(relativePath: string): Promise<FileInfo | null>;
  list(): Promise<FileInfo[]>;
  rootPath(): string;
}

let storageInstance: StorageProvider | null = null;

export function getVideoStorage(): StorageProvider {
  if (!storageInstance) {
    const path = process.env.VIDEO_STORAGE_PATH || './storage/videos';
    storageInstance = new LocalStorageProvider(path);
  }
  return storageInstance;
}
