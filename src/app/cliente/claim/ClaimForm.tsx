'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ClaimForm({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/tokens/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'No se pudo canjear el código.');
      setLoading(false);
      return;
    }
    router.push(`/cliente/dashboard/${data.recordingId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="code">Código de acceso</label>
        <input
          id="code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="input font-mono tracking-widest text-center text-lg"
          placeholder="XXXXXXXX"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading || !code.trim()} className="btn btn-primary w-full">
        {loading ? 'Canjeando...' : 'Canjear'}
      </button>
    </form>
  );
}
