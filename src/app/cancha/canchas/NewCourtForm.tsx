'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewCourtForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/cancha/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'No se pudo crear.');
      setLoading(false);
      return;
    }
    setName('');
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Cancha 3" maxLength={80} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary w-full">
        {loading ? 'Creando...' : 'Crear'}
      </button>
    </form>
  );
}
