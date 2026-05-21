import { prisma } from './db';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>, userId?: string): Promise<void>;
  info(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  warn(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  error(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
  audit(msg: string, ctx?: Record<string, unknown>, userId?: string): Promise<void>;
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
