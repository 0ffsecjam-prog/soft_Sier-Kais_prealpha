'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Ban, Users } from 'lucide-react';
import { formatCents } from '@/lib/money';

interface ClaimRow {
  id: string;
  name: string;
  email: string;
  pricePaidCents: number;
  hasDownloadAccess: boolean;
  claimedAt: string;
}

export function ClaimsManager({ claims }: { claims: ClaimRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!confirm('¿Revocar el acceso de este cliente al video? Se le reintegra el pago (simulado) y deja de verlo.')) return;
    setBusy(id);
    const res = await fetch(`/api/cancha/claims/${id}/revoke`, { method: 'POST' });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 font-semibold flex items-center gap-2">
        <Users size={16} />Clientes con acceso ({claims.length})
      </div>
      {claims.length === 0 ? (
        <div className="px-5 py-6 text-sm text-gray-500 text-center">Todavía nadie reclamó este video.</div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {claims.map((c) => (
            <div key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-gray-500 truncate">{c.email}</div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>{c.pricePaidCents > 0 ? formatCents(c.pricePaidCents) : 'Compartido'}</div>
                <div>{new Date(c.claimedAt).toLocaleDateString('es-AR')}</div>
              </div>
              {c.hasDownloadAccess && <span className="badge badge-info"><Download size={10} />Descarga</span>}
              <button onClick={() => revoke(c.id)} disabled={busy === c.id} className="btn btn-secondary text-xs text-red-600" title="Revocar acceso">
                <Ban size={13} />{busy === c.id ? '...' : 'Revocar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
