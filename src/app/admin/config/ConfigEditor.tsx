'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2 } from 'lucide-react';

interface Item {
  key: string;
  value: string;
  isDefault: boolean;
  description?: string | null;
}

export function ConfigEditor({ items, knownKeys }: { items: Item[]; knownKeys: string[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.key, i.value])),
  );
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [status, setStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [error, setError] = useState<string | null>(null);

  async function save(key: string) {
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    setError(null);
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: local[key] ?? '' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Falló');
      setStatus((s) => ({ ...s, [key]: 'error' }));
      return;
    }
    setStatus((s) => ({ ...s, [key]: 'saved' }));
    setTimeout(() => setStatus((s) => ({ ...s, [key]: 'idle' })), 1500);
    router.refresh();
  }

  async function remove(key: string) {
    if (!confirm(`¿Borrar la entrada "${key}"? Si es un flag conocido, volverá al default.`)) return;
    const res = await fetch(`/api/admin/config?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey.trim(), value: newValue }),
    });
    if (res.ok) {
      setNewKey('');
      setNewValue('');
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const st = status[it.key] ?? 'idle';
                return (
                  <tr key={it.key} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 align-top">
                      <code className="text-xs">{it.key}</code>
                      {!knownKeys.includes(it.key) && <div className="text-xs text-amber-600">custom</div>}
                      {it.description && <div className="text-xs text-gray-500 mt-1 max-w-[260px]">{it.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={local[it.key] ?? ''}
                        onChange={(e) => setLocal((p) => ({ ...p, [it.key]: e.target.value }))}
                        className="input font-mono text-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {it.isDefault ? <span className="badge badge-muted">default</span> : <span className="badge badge-info">override</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => save(it.key)} disabled={st === 'saving'} className="btn btn-primary text-xs" title="Guardar"><Save size={14} />{st === 'saved' ? '✓' : ''}</button>
                        {!it.isDefault && (
                          <button onClick={() => remove(it.key)} className="btn btn-secondary text-xs text-red-600" title="Borrar override"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="card p-5">
        <div className="font-semibold flex items-center gap-2"><Plus size={16} />Agregar / sobrescribir key</div>
        <form onSubmit={addCustom} className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (ej: emulated_db_ip)" className="input font-mono text-xs" />
          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="value" className="input font-mono text-xs" />
          <button type="submit" className="btn btn-primary">Guardar</button>
        </form>
      </div>
    </div>
  );
}
