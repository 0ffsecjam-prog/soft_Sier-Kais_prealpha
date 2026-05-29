'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface Recording {
  id: string;
  title: string;
  court: { name: string };
}

export function NewTokenForm({ recordings }: { recordings: Recording[] }) {
  const router = useRouter();
  const [recordingId, setRecordingId] = useState(recordings[0]?.id ?? '');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; link: string } | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [copyErr, setCopyErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recordingId) {
      setError('Necesitás al menos una grabación creada.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch('/api/cancha/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordingId,
        maxUses: maxUses === '' ? null : Math.max(1, Number(maxUses)),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || 'No se pudo generar el código.');
      return;
    }
    const link = `${window.location.origin}/claim/${data.code}`;
    setResult({ code: data.code, link });
    router.refresh();
  }

  async function copy(text: string, which: 'code' | 'link') {
    setCopyErr(null);
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(which); setTimeout(() => setCopied(null), 1500); }
    else setCopyErr('No se pudo copiar. Seleccioná y copiá manualmente.');
  }

  if (recordings.length === 0) {
    return <p className="mt-3 text-sm text-gray-500">Necesitás crear al menos una grabación antes de generar accesos.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div>
        <label className="label">Grabación</label>
        <select required value={recordingId} onChange={(e) => setRecordingId(e.target.value)} className="input">
          {recordings.map((r) => (
            <option key={r.id} value={r.id}>{r.title} — {r.court.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="max">Máx. canjes (vacío = ilimitado)</label>
          <input id="max" type="number" min={1} max={500} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="input" placeholder="ej: 12" />
        </div>
        <div>
          <label className="label" htmlFor="exp">Vence (opcional)</label>
          <input id="exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input" />
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full"><KeyRound size={16} />{loading ? 'Generando...' : 'Generar código'}</button>

      {result && (
        <div className="mt-2 p-4 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
          <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">¡Listo!</div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 text-lg font-mono tracking-widest font-bold text-center py-2 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded">{result.code}</code>
            <button type="button" onClick={() => copy(result.code, 'code')} className="btn btn-secondary">{copied === 'code' ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={result.link} className="input text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => copy(result.link, 'link')} className="btn btn-secondary text-xs">{copied === 'link' ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
          {copyErr && <div className="mt-2 text-xs text-red-600">{copyErr}</div>}
        </div>
      )}
    </form>
  );
}
