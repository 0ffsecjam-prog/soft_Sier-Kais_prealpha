import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT'] as const;

function levelBadge(l: string) {
  switch (l) {
    case 'ERROR': return 'badge-warn';
    case 'WARN': return 'badge-warn';
    case 'AUDIT': return 'badge-info';
    case 'INFO': return 'badge-success';
    default: return 'badge-muted';
  }
}

export default async function AdminLogsPage({ searchParams }: { searchParams: { level?: string; limit?: string } }) {
  await requireRole(ROLES.ADMIN);

  const level = searchParams.level && LEVELS.includes(searchParams.level as typeof LEVELS[number]) ? searchParams.level : 'ALL';
  const limit = Math.min(500, Math.max(10, Number(searchParams.limit) || 100));

  const logs = await prisma.log.findMany({
    where: level === 'ALL' ? {} : { level },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Logs</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Eventos persistidos en DB.</p>
        </div>
        <form className="flex items-center gap-2">
          <select name="level" defaultValue={level} className="input text-sm w-40">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select name="limit" defaultValue={String(limit)} className="input text-sm w-28">
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="btn btn-secondary text-sm">Filtrar</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Nivel</th>
                <th className="px-3 py-2">Mensaje</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Contexto</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-800 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{l.createdAt.toLocaleString('es-AR')}</td>
                  <td className="px-3 py-2"><span className={`badge ${levelBadge(l.level)}`}>{l.level}</span></td>
                  <td className="px-3 py-2">{l.message}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{l.user?.email ?? '—'}</td>
                  <td className="px-3 py-2">
                    {l.context ? <pre className="text-xs whitespace-pre-wrap break-all max-w-md text-gray-500">{l.context}</pre> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">Sin logs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
