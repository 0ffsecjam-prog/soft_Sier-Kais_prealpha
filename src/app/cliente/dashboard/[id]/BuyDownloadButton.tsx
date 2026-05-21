'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { formatCents } from '@/lib/money';

export function BuyDownloadButton({ recordingId, feeCents }: { recordingId: string; feeCents: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/recordings/${recordingId}/buy-download`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'No se pudo completar el pago.');
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button onClick={buy} disabled={loading} className="btn btn-primary">
        <CreditCard size={16} />
        {loading ? 'Procesando...' : `Pagar descarga (${formatCents(feeCents)})`}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
