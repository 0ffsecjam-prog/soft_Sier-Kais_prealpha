'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Video, Check } from 'lucide-react';
import { formatCents } from '@/lib/money';

interface SlotItem {
  startsAt: string;
  label: string;
  available: boolean;
  reason?: 'TAKEN' | 'PAST';
}

interface Props {
  courtId: string;
  courtName: string;
  complexName: string;
  slotPriceCents: number;
  videoPriceCents: number;
  slots: SlotItem[];
}

export function SlotPicker({ courtId, courtName, complexName, slotPriceCents, videoPriceCents, slots }: Props) {
  const router = useRouter();
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [includesVideo, setIncludesVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sólo cobramos el slot ahora. El video se cobra cuando esté listo
  // (después del partido), al confirmarse vía /api/reservations/[id]/buy-video.
  const total = slotPriceCents;

  async function confirm() {
    if (!selectedStartsAt) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId, startsAt: selectedStartsAt, includesVideo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'No se pudo reservar.');
      setLoading(false);
      return;
    }
    router.push('/cliente/reservas');
    router.refresh();
  }

  const anyAvailable = slots.some((s) => s.available);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {slots.map((s) => {
          const isSelected = selectedStartsAt === s.startsAt;
          const base = 'px-2 py-3 rounded-md border text-sm font-medium transition-colors';
          if (!s.available) {
            return (
              <button key={s.startsAt} disabled className={`${base} border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed`} title={s.reason === 'TAKEN' ? 'Tomado' : 'Pasado'}>
                {s.label}
                <div className="text-[10px] mt-0.5 uppercase tracking-wider">{s.reason === 'TAKEN' ? 'tomado' : 'pasado'}</div>
              </button>
            );
          }
          return (
            <button
              key={s.startsAt}
              onClick={() => setSelectedStartsAt(s.startsAt)}
              className={`${base} ${isSelected ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700' : 'border-gray-200 dark:border-gray-800 hover:border-brand-500'}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {!anyAvailable && (
        <div className="card p-5 text-sm text-gray-500 text-center">No hay horarios libres en este día. Probá otra fecha.</div>
      )}

      {selectedStartsAt && (
        <div className="card p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Resumen</div>
            <div className="mt-1 font-semibold">{complexName} · {courtName}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Calendar size={14} />{new Date(selectedStartsAt).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}</div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-brand-400 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={includesVideo} onChange={(e) => setIncludesVideo(e.target.checked)} />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-1.5"><Video size={14} />Reservar el video del partido (+{formatCents(videoPriceCents)})</div>
              <div className="text-xs text-gray-500 mt-0.5">Te confirmamos la intención ahora y te cobramos el video cuando esté listo (después del partido), desde &quot;Mis Reservas&quot;. Así no pagás algo que todavía no existe.</div>
            </div>
          </label>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total a pagar ahora (simulado)</div>
              {includesVideo && (
                <div className="text-xs text-gray-500 mt-0.5">+ {formatCents(videoPriceCents)} del video al confirmarse (después del partido)</div>
              )}
            </div>
            <div className="text-2xl font-bold">{formatCents(total)}</div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button onClick={confirm} disabled={loading} className="btn btn-primary w-full">
            <Check size={16} />{loading ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      )}
    </div>
  );
}
