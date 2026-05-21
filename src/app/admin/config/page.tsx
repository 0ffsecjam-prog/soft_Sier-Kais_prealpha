import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { CONFIG_DEFAULTS, getAllConfig } from '@/lib/config';
import { ConfigEditor } from './ConfigEditor';

export const dynamic = 'force-dynamic';

export default async function AdminConfigPage() {
  await requireRole(ROLES.ADMIN);
  const items = await getAllConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración live</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Editá variables de negocio sin reiniciar el servidor. Los cambios aplican luego del cache TTL (~30s).
          {' '}<span className="text-amber-600">Solo flags de negocio — los secrets de infra (DB URL, AUTH_SECRET) viven en <code>.env</code>.</span>
        </p>
      </div>

      <ConfigEditor
        items={items}
        knownKeys={Object.keys(CONFIG_DEFAULTS)}
      />
    </div>
  );
}
