import { prisma } from './db';
import { getConfigInt } from './config';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>, userId?: string): Promise<void>;
  info(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  warn(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  error(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  audit(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
}

/** Borra logs más viejos que retentionDays. Devuelve cuántos borró. */
export async function cleanupOldLogs(retentionDays: number): Promise<number> {
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const res = await prisma.log.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return res.count;
}

// Limpieza oportunista: corre como mucho una vez por hora por proceso.
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

async function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  try {
    const days = await getConfigInt('log_retention_days');
    await cleanupOldLogs(days);
  } catch {
    /* no romper el logging si la limpieza falla */
  }
}

class DbLogger implements Logger {
  async log(level: LogLevel, message: string, context?: Record<string, unknown>, userId?: string) {
    try {
      await prisma.log.create({
        data: {
          level,
          message,
          context: context ? JSON.stringify(context) : null,
          userId: userId ?? null,
        },
      });
      void maybeCleanup();
    } catch (err) {
      console.error('[logger] failed to persist log', err);
    }
    if (process.env.NODE_ENV !== 'production') {
      const prefix = `[${level}]`;
      console.log(prefix, message, context ?? '');
    }
  }
  info(m: string, c?: Record<string, unknown>, u?: string) { return this.log('INFO', m, c, u); }
  warn(m: string, c?: Record<string, unknown>, u?: string) { return this.log('WARN', m, c, u); }
  error(m: string, c?: Record<string, unknown>, u?: string) { return this.log('ERROR', m, c, u); }
  audit(m: string, c?: Record<string, unknown>, u?: string) { return this.log('AUDIT', m, c, u); }
}

export const logger: Logger = new DbLogger();
