'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_PRICE_ARS } from '@/lib/money';

interface Props {
  courts: Array<{ id: string; name: string }>;
  defaultPriceCents: number;
  defaultDownloadFeeCents: number;
}

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function NewRecordingForm({ courts, defaultPriceCents, defaultDownloadFeeCents }: Props) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [recordedAt, setRecordedAt] = useState(localNow());
  const [durationMin, setDurationMin] = useState(60);
  const [filePath, setFilePath] = useState('');
  const [priceArs, setPriceArs] = useState((defaultPriceCents / 100).toFixed(2));
  const [feeArs, setFeeArs] = useState((defaultDownloadFeeCents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/cancha/recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courtId,
        title: title.trim(),
        recordedAt: new Date(recordedAt).toISOString(),
        durationSec: Math.max(0, Math.round(durationMin * 60)),
        filePath: filePath.trim(),
        priceArs,
        downloadFeeArs: feeArs,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'No se pudo crear la grabación.');
      setLoading(false);
      return;
    }
    router.push('/cancha/grabaciones');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="court">Cancha</label>
          <select id="court" required value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Fecha y hora</label>
          <input id="date" type="datetime-local" required value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="title">Título</label>
        <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Partido Sábado 20:00 — Cancha 1" maxLength={200} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="dur">Duración (min)</label>
          <input id="dur" type="number" min={1} max={600} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price">Precio (ARS)</label>
          <input id="price" type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={priceArs} onChange={(e) => setPriceArs(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fee">Adicional descarga (ARS)</label>
          <input id="fee" type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={feeArs} onChange={(e) => setFeeArs(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="file">Archivo (path relativo al storage)</label>
        <input id="file" required value={filePath} onChange={(e) => setFilePath(e.target.value)} className="input font-mono" placeholder="sample.mp4 o 2026/05/partido.mp4" />
        <p className="mt-1 text-xs text-gray-500">Debe existir en el directorio de storage configurado.</p>
      </div>
      <p className="text-xs text-gray-500">Precio máx: ${MAX_PRICE_ARS.toLocaleString('es-AR')} ARS por límite de Int32 (Fase 2: BigInt).</p>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Creando...' : 'Crear grabación'}
      </button>
    </form>
  );
}
