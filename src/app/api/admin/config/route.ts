import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/roles';
import { invalidateConfigCache, setConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const PutBody = z.object({
  key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/i),
  value: z.string().max(500),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = PutBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  await setConfig(parsed.data.key, parsed.data.value);
  await logger.audit('Config setting actualizado', { key: parsed.data.key }, session.user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Solo ADMIN' }, { status: 403 });

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'falta key' }, { status: 400 });

  await prisma.configSetting.delete({ where: { key } }).catch(() => null);
  invalidateConfigCache();
  await logger.audit('Config setting borrado', { key }, session.user.id);

  return NextResponse.json({ ok: true });
}
