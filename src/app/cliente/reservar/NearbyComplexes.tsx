'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Building2, MapPin, Loader2, X } from 'lucide-react';
import { fmtDistanceKm, haversineKm } from '@/lib/geo';
import { formatCents } from '@/lib/money';

interface CourtInfo {
  id: string;
  name: string;
  slotDurationMin: number;
  pricePerSlotCents: number;
  openingHour: number;
  closingHour: number;
}

interface ComplexInfo {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  courts: CourtInfo[];
}

type LocState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; lat: number; lng: number }
  | { kind: 'denied' }
  | { kind: 'unsupported' }
  | { kind: 'error'; message: string };

export function NearbyComplexes({ complexes }: { complexes: ComplexInfo[] }) {
  const [loc, setLoc] = useState<LocState>({ kind: 'idle' });

  function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLoc({ kind: 'unsupported' });
      return;
    }
    setLoc({ kind: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLoc({ kind: 'ok', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLoc({ kind: 'denied' });
        else setLoc({ kind: 'error', message: err.message });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }

  const ordered = useMemo(() => {
    if (loc.kind !== 'ok') return complexes.map((c) => ({ ...c, distanceKm: null as number | null }));
    const me = { lat: loc.lat, lng: loc.lng };
    return complexes
      .map((c) => ({
        ...c,
        distanceKm:
          c.lat !== null && c.lng !== null
            ? haversineKm(me, { lat: c.lat, lng: c.lng })
            : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [complexes, loc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {loc.kind !== 'ok' ? (
          <button onClick={requestLocation} disabled={loc.kind === 'loading'} className="btn btn-secondary text-sm">
            {loc.kind === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            {loc.kind === 'loading' ? 'Pidiendo ubicación...' : 'Mostrar cercanas a mí'}
          </button>
        ) : (
          <>
            <span className="badge badge-success"><MapPin size={12} />Ordenando por cercanía</span>
            <button onClick={() => setLoc({ kind: 'idle' })} className="btn btn-ghost text-xs"><X size={12} />Quitar</button>
          </>
        )}
        {loc.kind === 'denied' && <span className="text-xs text-gray-500">Permiso denegado — mostrando todas.</span>}
        {loc.kind === 'unsupported' && <span className="text-xs text-gray-500">Tu navegador no soporta geolocalización.</span>}
        {loc.kind === 'error' && <span className="text-xs text-red-600">No pudimos obtener tu ubicación: {loc.message}</span>}
      </div>

      {complexes.length === 0 && (
        <div className="card p-6 text-sm text-gray-500">No hay canchas disponibles en este momento.</div>
      )}

      <div className="space-y-4">
        {ordered.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex items-center justify-center shrink-0"><Building2 size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-500 truncate">{c.address}</div>
              </div>
              {c.distanceKm !== null && (
                <span className="badge badge-info"><MapPin size={11} />{fmtDistanceKm(c.distanceKm)}</span>
              )}
              {loc.kind === 'ok' && c.distanceKm === null && (
                <span className="text-xs text-gray-400">sin ubicación cargada</span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {c.courts.map((court) => (
                <Link key={court.id} href={`/cliente/reservar/${court.id}`} className="card p-4 hover:border-brand-500 transition-colors block">
                  <div className="font-medium">{court.name}</div>
                  <div className="mt-1 text-xs text-gray-500">{court.slotDurationMin} min · {court.openingHour}:00 – {court.closingHour}:00</div>
                  <div className="mt-2 text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCents(court.pricePerSlotCents)} / turno</div>
                </Link>
              ))}
              {c.courts.length === 0 && <div className="text-sm text-gray-500 col-span-full">Aún no hay canchas en este complejo.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
