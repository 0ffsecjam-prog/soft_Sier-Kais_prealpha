'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  COURT_TYPES, SURFACE_OPTIONS, MATCHES_PER_WEEK_OPTIONS,
  HAS_CAMERAS_OPTIONS, HAS_INTERNET_OPTIONS,
} from '@/lib/signupOptions';

export function SignupRequestForm() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contacto
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  // Complejo
  const [businessName, setBusinessName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const [courtTypes, setCourtTypes] = useState<string[]>([]);
  const [surfaceType, setSurfaceType] = useState('');
  // Operación
  const [matchesPerWeek, setMatchesPerWeek] = useState('');
  const [hasCameras, setHasCameras] = useState('');
  const [hasInternet, setHasInternet] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [message, setMessage] = useState('');

  function toggleCourtType(t: string) {
    setCourtTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (courtTypes.length === 0) { setError('Elegí al menos un tipo de cancha.'); return; }
    setLoading(true);

    const res = await fetch('/api/signup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName, email: email.trim().toLowerCase(), phone,
        role: role || null,
        businessName, province, city: city || null, address: address || null,
        numberOfCourts, courtTypes,
        surfaceType: surfaceType || null,
        matchesPerWeek: matchesPerWeek || null,
        hasCameras: hasCameras || null,
        hasInternet: hasInternet || null,
        referralSource: referralSource || null,
        message: message || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'No se pudo enviar. Probá de nuevo.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={28} /></div>
        <h2 className="mt-4 text-xl font-bold">¡Solicitud enviada!</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Recibimos los datos de <b>{businessName}</b>. Te vamos a contactar a <b>{email}</b> para coordinar los próximos pasos. ¡Gracias!
        </p>
        <Link href="/" className="mt-6 btn btn-secondary inline-flex">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="card p-5 space-y-4">
        <legend className="px-2 text-sm font-semibold">Tus datos de contacto</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cn">Nombre y apellido *</label>
            <input id="cn" required value={contactName} onChange={(e) => setContactName(e.target.value)} className="input" maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="role">Tu rol (opcional)</label>
            <input id="role" value={role} onChange={(e) => setRole(e.target.value)} className="input" placeholder="Dueño, encargado..." maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="em">Email *</label>
            <input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="vos@complejo.com" />
          </div>
          <div>
            <label className="label" htmlFor="ph">Teléfono / WhatsApp *</label>
            <input id="ph" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+54 9 11 ..." maxLength={40} />
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5 space-y-4">
        <legend className="px-2 text-sm font-semibold">Tu complejo</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bn">Nombre del complejo *</label>
            <input id="bn" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="input" maxLength={160} />
          </div>
          <div>
            <label className="label" htmlFor="prov">Provincia *</label>
            <input id="prov" required value={province} onChange={(e) => setProvince(e.target.value)} className="input" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="city">Ciudad / Localidad</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="input" maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="addr">Dirección (opcional)</label>
            <input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} className="input" maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="noc">Cantidad de canchas *</label>
            <input id="noc" type="number" min={1} max={200} required value={numberOfCourts} onChange={(e) => setNumberOfCourts(Math.max(1, Number(e.target.value) || 1))} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="surf">Tipo de superficie</label>
            <select id="surf" value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)} className="input">
              <option value="">Seleccionar...</option>
              {SURFACE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="label">Tipos de cancha * <span className="text-gray-400 font-normal">(elegí los que tengas)</span></div>
          <div className="flex flex-wrap gap-2">
            {COURT_TYPES.map((t) => {
              const on = courtTypes.includes(t);
              return (
                <button type="button" key={t} onClick={() => toggleCourtType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700' : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5 space-y-4">
        <legend className="px-2 text-sm font-semibold">Para conocerte mejor</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="mpw">Partidos por semana (aprox.)</label>
            <select id="mpw" value={matchesPerWeek} onChange={(e) => setMatchesPerWeek(e.target.value)} className="input">
              <option value="">Seleccionar...</option>
              {MATCHES_PER_WEEK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cam">¿Ya tenés cámaras?</label>
            <select id="cam" value={hasCameras} onChange={(e) => setHasCameras(e.target.value)} className="input">
              <option value="">Seleccionar...</option>
              {HAS_CAMERAS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="net">¿Tenés internet en el complejo?</label>
            <select id="net" value={hasInternet} onChange={(e) => setHasInternet(e.target.value)} className="input">
              <option value="">Seleccionar...</option>
              {HAS_INTERNET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ref">¿Cómo nos conociste?</label>
            <input id="ref" value={referralSource} onChange={(e) => setReferralSource(e.target.value)} className="input" placeholder="Instagram, un conocido..." maxLength={160} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="msg">¿Algo más que quieras contarnos?</label>
          <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} className="input min-h-[90px]" maxLength={2000} placeholder="Qué estás buscando, dudas, etc." />
        </div>
      </fieldset>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <span className="text-xs text-gray-500">Te contactamos por mail. No creamos ninguna cuenta todavía.</span>
      </div>
    </form>
  );
}
