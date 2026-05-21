'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Pencil } from 'lucide-react';
import { formatCents, MAX_PRICE_ARS } from '@/lib/money';

interface Props {
  id: string;
  name: string;
  recordingsCount: number;
  slotDurationMin: number;
  pricePerSlotCents: number;
  openingHour: number;
  closingHour: number;
}

export function CourtCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const [priceArs, setPriceArs] = useState((props.pricePerSlotCents / 100).toFixed(2));
  const [duration, setDuration] = useState(props.slotDurationMin);
  const [openH, setOpenH] = useState(props.openingHour);
  const [closeH, setCloseH] = useState(props.closingHour);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/cancha/courts/${props.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        pricePerSlotCents: Math.round(Number(priceArs) * 100),
        slotDurationMin: duration,
        openingHour: openH,
        closingHour: closeH,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Falló'); return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Cancha</div>
            <div className="mt-1 font-semibold">{props.name}</div>
          </div>
          <button onClick={() => setEditing(true)} className="btn btn-secondary text-xs"><Pencil size={12} />Editar</button>
        </div>
        <div className="mt-3 text-sm space-y-1">
          <div>{props.recordingsCount} grabaciones</div>
          <div className="text-gray-600 dark:text-gray-400">Turno: <b>{props.slotDurationMin} min</b> · <b>{formatCents(props.pricePerSlotCents)}</b></div>
          <div className="text-gray-600 dark:text-gray-400">Horario: <b>{props.openingHour}:00 – {props.closingHour}:00</b></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <label className="label">Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Precio turno (ARS)</label>
          <input type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={priceArs} onChange={(e) => setPriceArs(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Duración (min)</label>
          <input type="number" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Abre (hora)</label>
          <input type="number" min={0} max={23} value={openH} onChange={(e) => setOpenH(Number(e.target.value) || 0)} className="input" />
        </div>
        <div>
          <label className="label">Cierra (hora)</label>
          <input type="number" min={1} max={24} value={closeH} onChange={(e) => setCloseH(Number(e.target.value) || 23)} className="input" />
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn btn-primary flex-1"><Save size={14} />{saving ? 'Guardando...' : 'Guardar'}</button>
        <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancelar</button>
      </div>
    </div>
  );
}
