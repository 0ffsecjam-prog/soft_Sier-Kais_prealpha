import Link from 'next/link';
import { User, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { LoginForm } from './LoginForm';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid grid-rows-[auto_1fr_auto]">
      <header className="px-4 sm:px-8 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold">T</div>
          <div className="font-semibold">Tempel × SIERA</div>
        </Link>
      </header>
      <div className="px-4 sm:px-8 py-4 flex items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer className="px-4 sm:px-8 py-4 text-xs text-gray-500 text-center">MVP local · Fase 1</footer>
    </main>
  );
}

export default function LoginPage({ searchParams }: { searchParams: { role?: string; callbackUrl?: string; error?: string } }) {
  const role = searchParams.role === 'cliente' || searchParams.role === 'cancha' ? searchParams.role : null;

  // Paso 1: elegir rol
  if (!role) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-center">¿Cómo querés ingresar?</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 text-center">Elegí tu tipo de cuenta.</p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Link href="/login?role=cliente" className="card p-5 flex items-center gap-4 hover:border-brand-500 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><User size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Soy cliente</div>
              <div className="text-sm text-gray-500">Mirá y compartí los videos de tus partidos.</div>
            </div>
            <ArrowRight size={18} className="text-gray-400 shrink-0" />
          </Link>

          <Link href="/login?role=cancha" className="card p-5 flex items-center gap-4 hover:border-brand-500 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0"><Building2 size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Soy cancha</div>
              <div className="text-sm text-gray-500">Gestioná tu complejo, reservas y videos.</div>
            </div>
            <ArrowRight size={18} className="text-gray-400 shrink-0" />
          </Link>
        </div>

        <details className="mt-6 text-xs text-gray-500">
          <summary className="cursor-pointer select-none">Cuentas de prueba (dev)</summary>
          <div className="mt-2 card p-3 space-y-1">
            <div><b>Admin:</b> admin@tempelgroup.com / admin123 (entrá por &quot;Soy cancha&quot;)</div>
            <div><b>Cancha:</b> dueno@complejolosalamos.com / cancha123</div>
            <div><b>Cliente:</b> jugador@gmail.com / cliente123</div>
          </div>
        </details>
      </Shell>
    );
  }

  // Paso 2: login del rol elegido
  const isCliente = role === 'cliente';
  const accent = isCliente ? 'brand' : 'indigo';

  return (
    <Shell>
      <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-3"><ArrowLeft size={14} />Cambiar tipo de cuenta</Link>

      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isCliente ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'}`}>
            {isCliente ? <User size={18} /> : <Building2 size={18} />}
          </div>
          <div>
            <h1 className="text-xl font-bold">Ingreso {isCliente ? 'cliente' : 'cancha'}</h1>
            <p className="text-xs text-gray-500">Ingresá con tu email y contraseña.</p>
          </div>
        </div>

        <LoginForm callbackUrl={searchParams.callbackUrl} error={searchParams.error} />
      </div>

      <div className="mt-5 card p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{isCliente ? '¿Todavía no tenés cuenta?' : '¿Tu complejo todavía no está en la plataforma?'}</div>
          <div className="text-xs text-gray-500">
            {isCliente ? 'Creala en un minuto: nombre, email y contraseña.' : 'Mandanos una solicitud de alta y te contactamos.'}
          </div>
        </div>
        <Link href={isCliente ? '/register' : '/solicitar'} className={`btn shrink-0 ${accent === 'brand' ? 'btn-primary' : 'btn-secondary'}`}>
          {isCliente ? 'Crear cuenta' : 'Solicitar alta'}
        </Link>
      </div>
    </Shell>
  );
}
