'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Copy, Check } from 'lucide-react';
import { MAX_PRICE_ARS } from '@/lib/money';

interface RecordingOption {
  id: string;
  title: string;
  courtName: string;
  complexName: string;
  defaultPriceCents: number;
}

export function AdminTokenForm({ recordings }: { recordings: RecordingOption[] }) {
  const router = useRouter();
  const [recordingId, setRecordingId] = useState(recordings[0]?.id ?? '');
  const selected = useMemo(() => recordings.find((r) => r.id === recordingId), [recordings, recordingId]);
  const [priceArs, setPriceArs] = useState<string>(((selected?.defaultPriceCents ?? 0) / 100).toFixed(2));
  const [maxUses, setMaxUses] = useState(1);
  const [hours, setHours] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function onChangeRecording(id: string) {
    setRecordingId(id);
    const rec = recordings.find((r) => r.id === id);
    if (rec) setPriceArs((rec.defaultPriceCents / 100).toFixed(2));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const priceCents = Math.round(Number(priceArs) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Precio inválido'); setLoading(false); return;
    }
    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordingId,
        priceCents,
        maxUses,
        ...(hours > 0 ? { expiresInHours: hours } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || 'Falló'); return;
    }
    setResult(data.code);
    router.refresh();
  }

  async function copy() { try { await navigator.clipboard.writeText(result!); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }

  if (recordings.length === 0) {
    return <p className="mt-3 text-sm text-gray-500">No hay grabaciones cargadas.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div>
        <label className="label">Grabación</label>
        <select value={recordingId} onChange={(e) => onChangeRecording(e.target.value)} className="input">
          {recordings.map((r) => (
            <option key={r.id} value={r.id}>{r.complexName} · {r.courtName} · {r.title}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Monto cobrado (ARS)</label>
          <input type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={priceArs} onChange={(e) => setPriceArs(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Canjes máx.</label>
          <input type="number" min={1} max={20} value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))} className="input" />
        </div>
        <div>
          <label className="label">Expira en (h, 0 = sin)</label>
          <input type="number" min={0} max={720} value={hours} onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Nota (opcional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Ej: pago en efectivo Cancha Los Álamos sábado" maxLength={200} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        <KeyRound size={14} />{loading ? 'Generando...' : 'Generar código'}
      </button>

      {result && (
        <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 flex items-center gap-2">
          <code className="flex-1 text-lg font-mono tracking-widest font-bold text-center py-2 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded">{result}</code>
          <button type="button" onClick={copy} className="btn btn-secondary">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </form>
  );
}
