'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, MapPin, Check } from 'lucide-react';
import { bpToPercent, percentToBp } from '@/lib/money';

interface Props {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  address: string;
  courtsCount: number;
  shareBp: number;
  lat: number | null;
  lng: number | null;
}

export function ComplexRow({ id, name, ownerName, ownerEmail, address, courtsCount, shareBp, lat: latIn, lng: lngIn }: Props) {
  const router = useRouter();
  const [pct, setPct] = useState<string>(bpToPercent(shareBp).toFixed(2));
  const [lat, setLat] = useState<string>(latIn !== null ? String(latIn) : '');
  const [lng, setLng] = useState<string>(lngIn !== null ? String(lngIn) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLoc, setGettingLoc] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const n = Number(pct);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setError('% inválido (0–100)'); setSaving(false); return;
    }
    const body: Record<string, unknown> = { revenueSharePct: percentToBp(n) };
    if (lat.trim() === '' && lng.trim() === '') {
      body.lat = null; body.lng = null;
    } else {
      const la = Number(lat), ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
        setError('Coordenadas inválidas'); setSaving(false); return;
      }
      body.lat = la; body.lng = ln;
    }
    const res = await fetch(`/api/admin/complejos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Falló'); return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    router.refresh();
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocalización no soportada'); return; }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGettingLoc(false);
      },
      (err) => { setError(`No se pudo obtener: ${err.message}`); setGettingLoc(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-gray-500">{address}</div>
          <div className="text-xs text-gray-500 mt-1">{ownerName} · {ownerEmail}</div>
          <div className="text-xs text-gray-500">{courtsCount} canchas físicas</div>
        </div>
        <div className="text-xs text-gray-500 text-right">
          {latIn !== null && lngIn !== null ? (
            <span className="badge badge-success"><MapPin size={11} />{latIn.toFixed(4)}, {lngIn.toFixed(4)}</span>
          ) : (
            <span className="badge badge-muted">Sin ubicación</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="label text-xs">Share Cancha (%)</label>
          <input type="number" min={0} max={100} step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="label text-xs">Latitud</label>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className="input text-sm font-mono" placeholder="-34.6037" />
        </div>
        <div>
          <label className="label text-xs">Longitud</label>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className="input text-sm font-mono" placeholder="-58.3816" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label text-xs">&nbsp;</label>
          <div className="flex gap-1">
            <button type="button" onClick={useMyLocation} disabled={gettingLoc} className="btn btn-secondary text-xs flex-1" title="Usar mi ubicación actual">
              <MapPin size={12} />{gettingLoc ? '...' : 'Mi pos.'}
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-primary text-xs flex-1">
              {saved ? <Check size={12} /> : <Save size={12} />}{saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
