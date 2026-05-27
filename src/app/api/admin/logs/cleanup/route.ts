import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { cleanupOldLogs, logger } from '@/lib/logger';
import { getConfigInt } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  const days = await getConfigInt('log_retention_days');
  const deleted = await cleanupOldLogs(days);
  await logger.audit('Limpieza manual de logs', { retentionDays: days, deleted }, session.user.id);
  return NextResponse.json({ ok: true, deleted, retentionDays: days });
}
