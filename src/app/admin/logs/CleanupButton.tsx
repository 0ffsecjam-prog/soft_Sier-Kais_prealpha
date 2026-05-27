'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function CleanupButton({ retentionDays }: { retentionDays: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!confirm(`Borrar logs con más de ${retentionDays} días de antigüedad?`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch('/api/admin/logs/cleanup', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(data?.error || 'Falló'); return; }
    setMsg(`Borrados: ${data.deleted}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
      <button onClick={run} disabled={busy} className="btn btn-secondary text-sm text-red-600" title={`Retención: ${retentionDays} días`}>
        <Trash2 size={14} />{busy ? 'Limpiando...' : `Limpiar > ${retentionDays}d`}
      </button>
    </div>
  );
}
