'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, UserPlus, Copy, Check, CheckCircle2 } from 'lucide-react';
import { SIGNUP_STATUS, SIGNUP_STATUS_LABEL } from '@/lib/signupOptions';
import { copyToClipboard } from '@/lib/clipboard';

interface Props {
  id: string;
  status: string;
  adminNotes: string | null;
  defaultEmail: string;
  defaultCourts: number;
  converted: boolean;
  convertedAccount: { email: string; complexName: string } | null;
}

export function LeadManager({ id, status: initialStatus, adminNotes: initialNotes, defaultEmail, defaultCourts, converted, convertedAccount }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  async function saveMeta() {
    setSavingMeta(true); setMetaError(null); setMetaSaved(false);
    const res = await fetch(`/api/admin/solicitudes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes: notes.trim() || null }),
    });
    setSavingMeta(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setMetaError(d?.error || 'Falló'); return; }
    setMetaSaved(true); setTimeout(() => setMetaSaved(false), 1500);
    router.refresh();
  }

  // Conversión
  const [email, setEmail] = useState(defaultEmail);
  const [courts, setCourts] = useState(defaultCourts);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState<string | null>(null);

  async function convert() {
    if (!confirm('¿Crear la cuenta de Cancha con estos datos? Se generará un usuario y su complejo.')) return;
    setConverting(true); setConvertError(null);
    const res = await fetch(`/api/admin/solicitudes/${id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), numberOfCourts: courts }),
    });
    const data = await res.json().catch(() => ({}));
    setConverting(false);
    if (!res.ok) { setConvertError(data?.error || 'No se pudo convertir.'); return; }
    setCredentials({ email: data.email, password: data.password });
    router.refresh();
  }

  async function copyCreds() {
    if (!credentials) return;
    setCopyErr(null);
    const ok = await copyToClipboard(`Email: ${credentials.email}\nContraseña: ${credentials.password}`);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
    else setCopyErr('No se pudo copiar automáticamente. Seleccioná y copiá manualmente.');
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <div className="font-semibold">Gestión interna</div>
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <div>
            <label className="label">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" disabled={converted}>
              {Object.values(SIGNUP_STATUS).map((s) => <option key={s} value={s}>{SIGNUP_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notas internas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[60px]" maxLength={2000} placeholder="Seguimiento, condiciones acordadas..." />
          </div>
        </div>
        {metaError && <div className="text-sm text-red-600">{metaError}</div>}
        <button onClick={saveMeta} disabled={savingMeta} className="btn btn-secondary text-sm">
          {metaSaved ? <Check size={14} /> : <Save size={14} />}{savingMeta ? 'Guardando...' : 'Guardar gestión'}
        </button>
      </div>

      {converted ? (
        <div className="card p-5 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
          <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300"><CheckCircle2 size={18} />Ya convertida en cuenta</div>
          {convertedAccount && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Cuenta: <b>{convertedAccount.email}</b> · Complejo: <b>{convertedAccount.complexName}</b>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          <div>
            <div className="font-semibold">Convertir en cuenta de Cancha</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Crea el usuario CANCHA + complejo + canchas. Hacelo cuando ya acordaron por mail.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email de la cuenta</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Canchas a crear</label>
              <input type="number" min={1} max={50} value={courts} onChange={(e) => setCourts(Math.max(1, Number(e.target.value) || 1))} className="input" />
            </div>
          </div>
          {convertError && <div className="text-sm text-red-600">{convertError}</div>}
          <button onClick={convert} disabled={converting} className="btn btn-primary">
            <UserPlus size={16} />{converting ? 'Creando...' : 'Crear cuenta'}
          </button>

          {credentials && (
            <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Cuenta creada — comunicá estas credenciales:</div>
              <div className="mt-2 font-mono text-sm bg-white dark:bg-gray-900 rounded p-3 border border-emerald-200 dark:border-emerald-800">
                <div>Email: <b>{credentials.email}</b></div>
                <div>Contraseña: <b>{credentials.password}</b></div>
              </div>
              <button onClick={copyCreds} className="mt-2 btn btn-secondary text-xs">
                {copied ? <Check size={14} /> : <Copy size={14} />}Copiar
              </button>
              {copyErr && <div className="mt-1 text-xs text-red-600">{copyErr}</div>}
              <p className="mt-2 text-xs text-gray-500">Guardala ahora: la contraseña no se vuelve a mostrar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
