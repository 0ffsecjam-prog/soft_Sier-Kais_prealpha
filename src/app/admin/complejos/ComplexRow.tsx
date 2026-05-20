'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { bpToPercent, percentToBp } from '@/lib/money';

interface Props {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  courtsCount: number;
  shareBp: number;
}

export function ComplexRow({ id, name, ownerName, ownerEmail, courtsCount, shareBp }: Props) {
  const router = useRouter();
  const [pct, setPct] = useState<string>(bpToPercent(shareBp).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const n = Number(pct);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setError('0–100');
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/admin/complejos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revenueSharePct: percentToBp(n) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Falló');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  return (
    <tr className="border-t border-gray-200 dark:border-gray-800">
      <td className="px-4 py-3 font-medium">{name}</td>
      <td className="px-4 py-3">
        <div>{ownerName}</div>
        <div className="text-xs text-gray-500">{ownerEmail}</div>
      </td>
      <td className="px-4 py-3">{courtsCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="input w-24"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
      <td className="px-4 py-3">
        <button onClick={save} disabled={saving} className="btn btn-primary text-xs">
          {saved ? <Check size={14} /> : saving ? 'Guardando...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}
