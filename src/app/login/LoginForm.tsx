'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';

export function LoginForm({ callbackUrl, error: serverError }: { callbackUrl?: string; error?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(serverError ? 'Email o contraseña incorrectos.' : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Cerrar cualquier sesión previa antes de iniciar la nueva.
    // NextAuth difunde el signOut a otras pestañas y queda una sola cookie activa.
    await signOut({ redirect: false });

    const res = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setError('Email o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    const dest = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/';
    // Navegación dura: descarta el estado cliente viejo y aplica la nueva sesión.
    window.location.assign(dest);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          placeholder="••••••••"
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Ingresando...' : 'Entrar'}
      </button>
    </form>
  );
}
