'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm('¿Cancelar esta reserva? Se reintegra el pago (simulado) y el horario queda libre.')) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/reservations/${reservationId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'No se pudo cancelar.');
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={cancel} disabled={loading} className="btn btn-secondary text-sm text-red-600">
        <XCircle size={14} />{loading ? 'Cancelando...' : 'Cancelar'}
      </button>
      {error && <div className="text-xs text-red-600 max-w-[200px] text-right">{error}</div>}
    </div>
  );
}
