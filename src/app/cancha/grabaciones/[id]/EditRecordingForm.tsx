'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';
import { MAX_PRICE_ARS } from '@/lib/money';

interface Initial {
  title: string;
  recordedAt: string;     // ISO
  durationMin: number;
  filePath: string;
  priceArs: string;
  downloadFeeArs: string;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function EditRecordingForm({ recordingId, initial }: { recordingId: string; initial: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [recordedAt, setRecordedAt] = useState(toLocalInput(initial.recordedAt));
  const [durationMin, setDurationMin] = useState(initial.durationMin);
  const [filePath, setFilePath] = useState(initial.filePath);
  const [priceArs, setPriceArs] = useState(initial.priceArs);
  const [downloadFeeArs, setDownloadFeeArs] = useState(initial.downloadFeeArs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    const res = await fetch(`/api/cancha/recordings/${recordingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        recordedAt: new Date(recordedAt).toISOString(),
        durationSec: Math.max(0, Math.round(durationMin * 60)),
        filePath: filePath.trim(),
        priceArs,
        downloadFeeArs,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || 'Falló'); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  async function remove() {
    if (!confirm('¿Borrar esta grabación? Se corta el acceso de todos los clientes y se desactivan sus tokens y links. No se puede deshacer.')) return;
    setDeleting(true); setError(null);
    const res = await fetch(`/api/cancha/recordings/${recordingId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || 'Falló'); setDeleting(false); return; }
    router.push('/cancha/grabaciones');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div className="font-semibold">Editar grabación</div>
      <div>
        <label className="label">Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" maxLength={200} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Fecha y hora</label>
          <input type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Duración (min)</label>
          <input type="number" min={1} max={600} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value) || 0)} className="input" />
        </div>
        <div>
          <label className="label">Precio (ARS)</label>
          <input type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={priceArs} onChange={(e) => setPriceArs(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Adicional descarga (ARS)</label>
          <input type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={downloadFeeArs} onChange={(e) => setDownloadFeeArs(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Archivo (path en storage)</label>
        <input value={filePath} onChange={(e) => setFilePath(e.target.value)} className="input font-mono" required />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn btn-primary"><Save size={16} />{saved ? 'Guardado ✓' : saving ? 'Guardando...' : 'Guardar cambios'}</button>
        <button type="button" onClick={remove} disabled={deleting} className="btn btn-secondary text-red-600"><Trash2 size={16} />{deleting ? 'Borrando...' : 'Borrar'}</button>
      </div>
    </form>
  );
}
