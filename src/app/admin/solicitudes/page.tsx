import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { SIGNUP_STATUS_LABEL, parseCourtTypes } from '@/lib/signupOptions';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'REJECTED'] as const;

function statusBadge(s: string) {
  switch (s) {
    case 'NEW': return 'badge-info';
    case 'CONTACTED': return 'badge-warn';
    case 'CONVERTED': return 'badge-success';
    default: return 'badge-muted';
  }
}

const PAGE_SIZE = 50;

export default async function AdminSolicitudesPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  await requireRole(ROLES.ADMIN);

  const status = searchParams.status && STATUSES.includes(searchParams.status as typeof STATUSES[number]) ? searchParams.status : 'ALL';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = status === 'ALL' ? {} : { status };

  const [requests, filteredCount, counts] = await Promise.all([
    prisma.signupRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.signupRequest.count({ where }),
    prisma.signupRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));
  const newCount = countMap.get('NEW') ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de canchas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Leads de complejos que pidieron el sistema. {newCount > 0 && <span className="badge badge-info ml-1">{newCount} nuevas</span>}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/solicitudes${s === 'ALL' ? '' : `?status=${s}`}`}
            className={`px-3 py-1.5 rounded-md border text-sm ${status === s ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700' : 'border-gray-200 dark:border-gray-800 hover:border-brand-300'}`}>
            {s === 'ALL' ? 'Todas' : SIGNUP_STATUS_LABEL[s]}
            {s !== 'ALL' && countMap.get(s) ? <span className="ml-1 text-xs text-gray-400">({countMap.get(s)})</span> : null}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Complejo</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Canchas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const types = parseCourtTypes(r.courtTypes);
                return (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/solicitudes/${r.id}`} className="font-medium text-brand-700 dark:text-brand-300 hover:underline">{r.businessName}</Link>
                      <div className="text-xs text-gray-500">{types.slice(0, 3).join(', ')}{types.length > 3 ? '…' : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.contactName}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{[r.city, r.province].filter(Boolean).join(', ')}</td>
                    <td className="px-4 py-3">{r.numberOfCourts}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusBadge(r.status)}`}>{SIGNUP_STATUS_LABEL[r.status] ?? r.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.createdAt.toLocaleDateString('es-AR')}</td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No hay solicitudes{status !== 'ALL' ? ' con este estado' : ''}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination basePath="/admin/solicitudes" page={page} totalPages={totalPages} total={filteredCount} params={{ status: status === 'ALL' ? undefined : status }} />
    </div>
  );
}
