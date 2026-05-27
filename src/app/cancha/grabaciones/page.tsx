import Link from 'next/link';
import { Plus, AlertTriangle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId } from '@/lib/queries';
import { formatCents } from '@/lib/money';
import { getVideoStorage } from '@/lib/storage';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function CanchaGrabacionesPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = { court: { complexId: complex.id }, deletedAt: null };

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where,
      include: { court: true, _count: { select: { claims: true, tokens: true } } },
      orderBy: { recordedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recording.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const storage = getVideoStorage();
  const exists = await Promise.all(
    recordings.map((r) => storage.exists(r.filePath).then((e) => [r.id, e] as const)),
  );
  const existMap = new Map(exists);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Grabaciones</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Videos de tu complejo.</p>
        </div>
        <Link href="/cancha/grabaciones/nuevo" className="btn btn-primary"><Plus size={16} />Nueva</Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Cancha</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Vendidos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => {
                const fileOk = existMap.get(r.id);
                return (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/cancha/grabaciones/${r.id}`} className="text-brand-700 dark:text-brand-300 hover:underline">{r.title}</Link>
                    </td>
                    <td className="px-4 py-3">{r.court.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(r.recordedAt).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCents(r.priceCents)}</td>
                    <td className="px-4 py-3">{r._count.tokens}</td>
                    <td className="px-4 py-3">{r._count.claims}</td>
                    <td className="px-4 py-3">
                      {fileOk ? (
                        <span className="badge badge-success">{r.status}</span>
                      ) : (
                        <span className="badge badge-warn" title={r.filePath}><AlertTriangle size={12} />Sin archivo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {recordings.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aún no hay grabaciones.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination basePath="/cancha/grabaciones" page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
