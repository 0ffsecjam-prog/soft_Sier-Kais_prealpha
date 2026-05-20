'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Ban } from 'lucide-react';

interface TokenRow {
  id: string;
  code: string;
  recordingTitle: string;
  courtName: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function TokenList({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(code: string, id: string) {
    try { await navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch {}
  }

  async function disable(id: string) {
    if (!confirm('¿Desactivar este token? El cliente no podrá canjearlo más.')) return;
    const res = await fetch(`/api/cancha/tokens/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  if (tokens.length === 0) {
    return <div className="card p-5 text-sm text-gray-500">Sin tokens aún.</div>;
  }

  return (
    <div className="card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
      {tokens.map((t) => {
        const expired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now();
        const exhausted = t.maxUses !== null && t.usedCount >= t.maxUses;
        return (
          <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-base font-mono font-bold tracking-wider">{t.code}</code>
                {!t.isActive && <span className="badge badge-muted">Desactivado</span>}
                {t.isActive && expired && <span className="badge badge-warn">Vencido</span>}
                {t.isActive && exhausted && <span className="badge badge-warn">Agotado</span>}
                {t.isActive && !expired && !exhausted && <span className="badge badge-success">Activo</span>}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">{t.recordingTitle}</div>
              <div className="text-xs text-gray-500">{t.courtName} · canjes: {t.usedCount}{t.maxUses !== null ? `/${t.maxUses}` : ''}{t.expiresAt ? ` · vence ${new Date(t.expiresAt).toLocaleDateString('es-AR')}` : ''}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => copy(t.code, t.id)} className="btn btn-secondary text-xs" title="Copiar código">
                {copiedId === t.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
              {t.isActive && (
                <button onClick={() => disable(t.id)} className="btn btn-secondary text-xs text-red-600" title="Desactivar"><Ban size={14} /></button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
