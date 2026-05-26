'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Pencil, AlertTriangle, X, CalendarOff, Plus, Trash2 } from 'lucide-react';
import { formatCents, MAX_PRICE_ARS } from '@/lib/money';
import {
  COURT_STATUS, COURT_STATUS_LABEL, WEEKDAY_KEYS, WEEKDAY_LABELS,
  defaultSchedule, parseSchedule, type WeeklySchedule,
} from '@/lib/courtSchedule';

interface BlockedDate {
  date: string;        // YYYY-MM-DD
  reason: string | null;
}

interface Props {
  id: string;
  name: string;
  recordingsCount: number;
  slotDurationMin: number;
  pricePerSlotCents: number;
  openingHour: number;
  closingHour: number;
  weeklyScheduleJson: string | null;
  status: string;
  statusMessage: string | null;
  blockedDates: BlockedDate[];
}

export function CourtCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const [priceArs, setPriceArs] = useState((props.pricePerSlotCents / 100).toFixed(2));
  const [duration, setDuration] = useState(props.slotDurationMin);
  const [status, setStatus] = useState(props.status);
  const [statusMessage, setStatusMessage] = useState(props.statusMessage ?? '');
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    parseSchedule(props.weeklyScheduleJson, defaultSchedule(props.openingHour, props.closingHour)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDay(key: typeof WEEKDAY_KEYS[number], patch: Partial<WeeklySchedule[typeof key]>) {
    setSchedule((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/cancha/courts/${props.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        pricePerSlotCents: Math.round(Number(priceArs) * 100),
        slotDurationMin: duration,
        status,
        statusMessage: statusMessage.trim() || null,
        weeklySchedule: schedule,
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

  // ── Fechas bloqueadas
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [blockBusy, setBlockBusy] = useState(false);

  async function addBlock() {
    if (!newBlockDate) return;
    setBlockBusy(true);
    await fetch(`/api/cancha/courts/${props.id}/blocked-dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newBlockDate, reason: newBlockReason.trim() || null }),
    });
    setBlockBusy(false);
    setNewBlockDate(''); setNewBlockReason('');
    router.refresh();
  }

  async function removeBlock(date: string) {
    setBlockBusy(true);
    await fetch(`/api/cancha/courts/${props.id}/blocked-dates?date=${date}`, { method: 'DELETE' });
    setBlockBusy(false);
    router.refresh();
  }

  const statusBadge = props.status === COURT_STATUS.ACTIVE
    ? 'badge-success' : props.status === COURT_STATUS.MAINTENANCE ? 'badge-warn' : 'badge-muted';

  if (!editing) {
    const sched = parseSchedule(props.weeklyScheduleJson, defaultSchedule(props.openingHour, props.closingHour));
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Cancha</div>
            <div className="mt-1 font-semibold flex items-center gap-2">
              {props.name}
              <span className={`badge ${statusBadge}`}>{COURT_STATUS_LABEL[props.status] ?? props.status}</span>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="btn btn-secondary text-xs"><Pencil size={12} />Editar</button>
        </div>

        {props.status !== COURT_STATUS.ACTIVE && props.statusMessage && (
          <div className="mt-3 text-sm flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />{props.statusMessage}
          </div>
        )}

        <div className="mt-3 text-sm space-y-1">
          <div>{props.recordingsCount} grabaciones</div>
          <div className="text-gray-600 dark:text-gray-400">Turno: <b>{props.slotDurationMin} min</b> · <b>{formatCents(props.pricePerSlotCents)}</b></div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {WEEKDAY_KEYS.map((k) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-gray-500">{WEEKDAY_LABELS[k].slice(0, 3)}</span>
              <span className={sched[k].isOpen ? '' : 'text-gray-400'}>
                {sched[k].isOpen ? `${sched[k].open}:00–${sched[k].close}:00` : 'Cerrado'}
              </span>
            </div>
          ))}
        </div>

        {props.blockedDates.length > 0 && (
          <div className="mt-3 text-xs flex items-start gap-1.5 text-gray-500">
            <CalendarOff size={13} className="mt-0.5 shrink-0" />
            <span>{props.blockedDates.length} fecha{props.blockedDates.length > 1 ? 's' : ''} bloqueada{props.blockedDates.length > 1 ? 's' : ''}: {props.blockedDates.slice(0, 3).map((b) => b.date).join(', ')}{props.blockedDates.length > 3 ? '…' : ''}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Editar {props.name}</div>
        <button onClick={() => setEditing(false)} className="btn btn-ghost text-xs"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={80} />
        </div>
        <div>
          <label className="label">Duración turno (min)</label>
          <input type="number" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Precio turno (ARS)</label>
          <input type="number" min={0} max={MAX_PRICE_ARS} step="0.01" value={priceArs} onChange={(e) => setPriceArs(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value={COURT_STATUS.ACTIVE}>{COURT_STATUS_LABEL.ACTIVE}</option>
            <option value={COURT_STATUS.MAINTENANCE}>{COURT_STATUS_LABEL.MAINTENANCE}</option>
            <option value={COURT_STATUS.UNAVAILABLE}>{COURT_STATUS_LABEL.UNAVAILABLE}</option>
          </select>
        </div>
        <div>
          <label className="label">Aviso (opcional)</label>
          <input value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} className="input" placeholder="Ej: Cambio de césped hasta el 15" maxLength={300} />
        </div>
      </div>

      <div>
        <div className="label">Horarios por día</div>
        <div className="space-y-1.5">
          {WEEKDAY_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1.5 w-28 shrink-0">
                <input type="checkbox" checked={schedule[k].isOpen} onChange={(e) => setDay(k, { isOpen: e.target.checked })} />
                <span className={schedule[k].isOpen ? '' : 'text-gray-400'}>{WEEKDAY_LABELS[k]}</span>
              </label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number" min={0} max={23} value={schedule[k].open}
                  disabled={!schedule[k].isOpen}
                  onChange={(e) => setDay(k, { open: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
                  className="input w-16 text-center disabled:opacity-40"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number" min={1} max={24} value={schedule[k].close}
                  disabled={!schedule[k].isOpen}
                  onChange={(e) => setDay(k, { close: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })}
                  className="input w-16 text-center disabled:opacity-40"
                />
                <span className="text-xs text-gray-400">hs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label flex items-center gap-1.5"><CalendarOff size={14} />Fechas bloqueadas (feriados / eventos)</div>
        {props.blockedDates.length > 0 ? (
          <div className="space-y-1 mb-2">
            {props.blockedDates.map((b) => (
              <div key={b.date} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-900 rounded px-2 py-1">
                <span className="font-mono">{b.date}</span>
                {b.reason && <span className="text-xs text-gray-500 flex-1 truncate">{b.reason}</span>}
                <button type="button" onClick={() => removeBlock(b.date)} disabled={blockBusy} className="ml-auto text-red-600 hover:text-red-700" title="Desbloquear"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 mb-2">No hay fechas bloqueadas.</div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="date" value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)} className="input sm:w-44" />
          <input value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} className="input flex-1" placeholder="Motivo (opcional)" maxLength={200} />
          <button type="button" onClick={addBlock} disabled={blockBusy || !newBlockDate} className="btn btn-secondary text-sm"><Plus size={14} />Bloquear</button>
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
