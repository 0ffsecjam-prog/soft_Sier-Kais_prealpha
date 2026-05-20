import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getVideoStorage } from '@/lib/storage';
import { formatBytes } from '@/lib/storage/local';
import { AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import MetricCard from '@/components/MetricCard';

export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
  await requireRole(ROLES.ADMIN);
  const storage = getVideoStorage();
  const files = await storage.list();
  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);

  const recordings = await prisma.recording.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, filePath: true, court: { include: { complex: true } } },
  });

  const fileSet = new Set(files.map((f) => f.relativePath));
  const missing = recordings.filter((r) => !fileSet.has(r.filePath));
  const referencedSet = new Set(recordings.map((r) => r.filePath));
  const orphans = files.filter((f) => !referencedSet.has(f.relativePath));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storage</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Directorio: <code className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{storage.rootPath()}</code>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Archivos" value={String(files.length)} icon={<HardDrive size={18} />} />
        <MetricCard label="Tamaño total" value={formatBytes(totalBytes)} />
        <MetricCard label="Referenciados" value={String(recordings.length)} hint={`${missing.length} sin archivo`} />
        <MetricCard label="Huérfanos" value={String(orphans.length)} hint="archivos sin Recording" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold flex items-center gap-2">
            {missing.length > 0 ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
            Recordings sin archivo
          </div>
          <div className="max-h-72 overflow-auto">
            {missing.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-500">Todo OK ✓</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {missing.map((r) => (
                  <li key={r.id} className="px-5 py-2 text-sm">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-gray-500">{r.court.complex.name} · {r.court.name} · <code>{r.filePath}</code></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold flex items-center gap-2">
            {orphans.length > 0 ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
            Archivos huérfanos
          </div>
          <div className="max-h-72 overflow-auto">
            {orphans.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-500">Todo OK ✓</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {orphans.map((f) => (
                  <li key={f.relativePath} className="px-5 py-2 text-sm flex items-center justify-between gap-3">
                    <code className="text-xs truncate">{f.relativePath}</code>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatBytes(f.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold">Todos los archivos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2">Path</th>
                <th className="px-4 py-2">Tamaño</th>
                <th className="px-4 py-2">Modificado</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.relativePath} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-2"><code className="text-xs">{f.relativePath}</code></td>
                  <td className="px-4 py-2">{formatBytes(f.sizeBytes)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{f.mtime.toLocaleString('es-AR')}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-500">Sin archivos en storage.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
