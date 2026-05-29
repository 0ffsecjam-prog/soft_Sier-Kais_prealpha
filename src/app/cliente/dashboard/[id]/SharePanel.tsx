'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Link as LinkIcon, KeyRound, Copy, Check, Ban, Eye, Clock } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface ShareItem {
  id: string;
  token: string;
  expiresAt: string;
  isActive: boolean;
  viewCount: number;
}

interface AccountTokenItem {
  id: string;
  code: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface Props {
  recordingId: string;
  initialShares: ShareItem[];
  initialAccountTokens: AccountTokenItem[];
}

export function SharePanel({ recordingId, initialShares, initialAccountTokens }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'link' | 'account'>('link');

  // ── ShareLink (público 24h)
  const [generating, setGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyErrKey, setCopyErrKey] = useState<string | null>(null);

  async function generateShareLink() {
    setGenerating(true);
    setShareError(null);
    setLastShareUrl(null);
    const res = await fetch(`/api/recordings/${recordingId}/share`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setShareError(data?.error || 'No se pudo generar el link.');
      return;
    }
    const url = `${window.location.origin}/s/${data.token}`;
    setLastShareUrl(url);
    router.refresh();
  }

  async function revokeShareLink(token: string) {
    if (!confirm('¿Cancelar este link? Quien lo tenga ya no podrá usarlo.')) return;
    const res = await fetch(`/api/share/${token}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  // ── Token a otra cuenta
  const [accountMaxUses, setAccountMaxUses] = useState(1);
  const [accountExpires, setAccountExpires] = useState(0); // 0 = sin vencimiento
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [lastAccountCode, setLastAccountCode] = useState<string | null>(null);

  async function generateAccountToken() {
    setAccountLoading(true);
    setAccountError(null);
    setLastAccountCode(null);
    const res = await fetch(`/api/recordings/${recordingId}/share-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxUses: accountMaxUses,
        ...(accountExpires > 0 ? { expiresInHours: accountExpires } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setAccountLoading(false);
    if (!res.ok) {
      setAccountError(data?.error || 'No se pudo generar.');
      return;
    }
    setLastAccountCode(data.code);
    router.refresh();
  }

  async function copy(text: string, key: string) {
    setCopyErrKey(null);
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(key); setTimeout(() => setCopied(null), 1500); }
    else setCopyErrKey(key);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 font-semibold"><Share2 size={16} />Compartir este video</div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          El video es <b>tuyo</b>: podés compartirlo con un link público temporal (24 hs) o pasarle un código a otra cuenta.
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setTab('link')} className={`px-4 py-2 text-sm font-medium ${tab === 'link' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'}`}>
          <LinkIcon size={14} className="inline mr-1" />Link 24 hs
        </button>
        <button onClick={() => setTab('account')} className={`px-4 py-2 text-sm font-medium ${tab === 'account' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500'}`}>
          <KeyRound size={14} className="inline mr-1" />Código a otra cuenta
        </button>
      </div>

      {tab === 'link' && (
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cualquiera con el link puede ver y descargar el video por 24 hs. No necesita cuenta.
            </p>
            <button onClick={generateShareLink} disabled={generating} className="mt-3 btn btn-primary">
              <LinkIcon size={14} />{generating ? 'Generando...' : 'Generar nuevo link'}
            </button>
            {shareError && <div className="mt-2 text-sm text-red-600">{shareError}</div>}
          </div>

          {lastShareUrl && (
            <div className="space-y-1">
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 flex items-center gap-2">
                <input readOnly value={lastShareUrl} className="input text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
                <button onClick={() => copy(lastShareUrl, 'last-link')} className="btn btn-secondary text-xs">
                  {copied === 'last-link' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {copyErrKey === 'last-link' && (
                <div className="text-xs text-red-600">No se pudo copiar. Seleccioná el link y copialo a mano.</div>
              )}
            </div>
          )}

          {(() => {
            const now = Date.now();
            const activos = initialShares.filter((s) => s.isActive && new Date(s.expiresAt).getTime() > now);
            const historial = initialShares.filter((s) => !s.isActive || new Date(s.expiresAt).getTime() <= now);
            return (
              <>
                {activos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Links activos</div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
                      {activos.map((s) => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${s.token}` : `/s/${s.token}`;
                        return (
                          <div key={s.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <code className="text-xs truncate block">{url}</code>
                              <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span className="inline-flex items-center gap-1"><Clock size={11} />Vence {new Date(s.expiresAt).toLocaleString('es-AR')}</span>
                                <span className="inline-flex items-center gap-1"><Eye size={11} />{s.viewCount} vistas</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex gap-1">
                                <button onClick={() => copy(url, s.id)} className="btn btn-secondary text-xs">
                                  {copied === s.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <button onClick={() => revokeShareLink(s.token)} className="btn btn-secondary text-xs text-red-600" title="Cancelar link"><Ban size={14} /></button>
                              </div>
                              {copyErrKey === s.id && <div className="text-[10px] text-red-600">No se pudo copiar</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {historial.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historial</div>
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 opacity-60">
                      {historial.map((s) => {
                        const cancelado = !s.isActive;
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${s.token}` : `/s/${s.token}`;
                        return (
                          <div key={s.id} className="p-3 bg-gray-50 dark:bg-gray-900/40">
                            <code className="text-xs truncate block text-gray-500 line-through">{url}</code>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                              <span className="badge badge-muted">{cancelado ? 'Cancelado' : 'Caducado'}</span>
                              <span className="inline-flex items-center gap-1"><Clock size={11} />{cancelado ? 'Cancelado' : 'Venció'} {new Date(s.expiresAt).toLocaleString('es-AR')}</span>
                              <span className="inline-flex items-center gap-1"><Eye size={11} />{s.viewCount} vistas</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {tab === 'account' && (
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Genera un código que tu amigo pueda canjear en su cuenta. Una vez canjeado, el video también queda en su biblioteca.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cuántas cuentas pueden canjearlo</label>
              <input type="number" min={1} max={50} value={accountMaxUses} onChange={(e) => setAccountMaxUses(Math.max(1, Number(e.target.value) || 1))} className="input" />
            </div>
            <div>
              <label className="label">Vencimiento (horas, 0 = sin)</label>
              <input type="number" min={0} max={720} value={accountExpires} onChange={(e) => setAccountExpires(Math.max(0, Number(e.target.value) || 0))} className="input" />
            </div>
          </div>

          <button onClick={generateAccountToken} disabled={accountLoading} className="btn btn-primary">
            <KeyRound size={14} />{accountLoading ? 'Generando...' : 'Generar código'}
          </button>
          {accountError && <div className="text-sm text-red-600">{accountError}</div>}

          {lastAccountCode && (
            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 flex items-center gap-2">
              <code className="flex-1 text-lg font-mono tracking-widest font-bold text-center py-2 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded">{lastAccountCode}</code>
              <button onClick={() => copy(lastAccountCode, 'last-code')} className="btn btn-secondary text-xs">
                {copied === 'last-code' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {initialAccountTokens.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Códigos generados</div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg">
                {initialAccountTokens.map((t) => {
                  const expired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now();
                  return (
                    <div key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <code className="text-base font-mono font-bold tracking-wider">{t.code}</code>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Canjes {t.usedCount}{t.maxUses !== null ? `/${t.maxUses}` : ''}
                          {t.expiresAt ? ` · vence ${new Date(t.expiresAt).toLocaleDateString('es-AR')}` : ''}
                          {!t.isActive && ' · desactivado'}
                          {expired && ' · vencido'}
                        </div>
                      </div>
                      <button onClick={() => copy(t.code, t.id)} className="btn btn-secondary text-xs">
                        {copied === t.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
