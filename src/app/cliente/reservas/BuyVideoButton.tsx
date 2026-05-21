'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { formatCents } from '@/lib/money';

export function BuyVideoButton({ reservationId, priceCents }: { reservationId: string; priceCents: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/reservations/${reservationId}/buy-video`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'No se pudo comprar.');
      setLoading(false);
      return;
    }
    router.push(`/cliente/dashboard/${data.recordingId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={buy} disabled={loading} className="btn btn-primary text-sm">
        <Video size={14} />{loading ? 'Procesando...' : `Comprar video (${formatCents(priceCents)})`}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
