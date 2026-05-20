import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { getComplexByOwnerId } from '@/lib/queries';
import { getConfigInt } from '@/lib/config';
import { getVideoStorage } from '@/lib/storage';
import { formatBytes } from '@/lib/storage/local';
import { NewRecordingForm } from './NewRecordingForm';

export const dynamic = 'force-dynamic';

export default async function NewRecordingPage() {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const [priceCents, downloadFeeCents, storage] = await Promise.all([
    getConfigInt('default_recording_price_cents'),
    getConfigInt('default_download_fee_cents'),
    Promise.resolve(getVideoStorage()),
  ]);
  const files = await storage.list();

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/cancha/grabaciones" className="text-sm text-gray-600 inline-flex items-center gap-1 hover:text-gray-900"><ArrowLeft size={14} />Volver</Link>
      <h1 className="text-2xl font-bold">Nueva grabación</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Subí el archivo a <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{storage.rootPath()}</code> y referencialo abajo. En Fase 2 será upload directo.
      </p>

      <div className="card p-4">
        <div className="text-sm font-semibold mb-2">Archivos disponibles en storage ({files.length})</div>
        {files.length === 0 ? (
          <div className="text-sm text-gray-500">Sin archivos. Copiá un .mp4 al directorio de storage.</div>
        ) : (
          <ul className="text-sm divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-auto">
            {files.map((f) => (
              <li key={f.relativePath} className="py-1.5 flex items-center justify-between gap-3">
                <code className="text-xs truncate">{f.relativePath}</code>
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatBytes(f.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <NewRecordingForm
          courts={complex.courts}
          defaultPriceCents={priceCents}
          defaultDownloadFeeCents={downloadFeeCents}
        />
      </div>
    </div>
  );
}
