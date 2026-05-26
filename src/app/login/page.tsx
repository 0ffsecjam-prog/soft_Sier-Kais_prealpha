import Link from 'next/link';
import { User, Building2, ArrowRight } from 'lucide-react';
import { LoginForm } from './LoginForm';

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  return (
    <main className="min-h-screen grid grid-rows-[auto_1fr_auto]">
      <header className="px-4 sm:px-8 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold">T</div>
          <div className="font-semibold">Tempel × SIERA</div>
        </Link>
      </header>
      <div className="px-4 sm:px-8 py-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Ingresá con tu cuenta de cliente, cancha o admin.
            </p>
            <LoginForm callbackUrl={searchParams.callbackUrl} error={searchParams.error} />
          </div>

          <div className="mt-6">
            <div className="text-center text-xs uppercase tracking-wider text-gray-400">¿Todavía no tenés cuenta?</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Link href="/register" className="card p-4 flex items-center gap-3 hover:border-brand-500 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><User size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Soy jugador / cliente</div>
                  <div className="text-xs text-gray-500">Creá tu cuenta gratis y mirá tus partidos.</div>
                </div>
                <ArrowRight size={16} className="text-gray-400 shrink-0" />
              </Link>
              <Link href="/solicitar" className="card p-4 flex items-center gap-3 hover:border-brand-500 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0"><Building2 size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Tengo un complejo</div>
                  <div className="text-xs text-gray-500">Solicitá el alta en la plataforma.</div>
                </div>
                <ArrowRight size={16} className="text-gray-400 shrink-0" />
              </Link>
            </div>
          </div>

          <details className="mt-5 text-xs text-gray-500">
            <summary className="cursor-pointer select-none">Cuentas de prueba (dev)</summary>
            <div className="mt-2 card p-3 space-y-1">
              <div><b>Admin:</b> admin@tempelgroup.com / admin123</div>
              <div><b>Cancha:</b> dueno@complejolosalamos.com / cancha123</div>
              <div><b>Cliente:</b> jugador@gmail.com / cliente123</div>
            </div>
          </details>
        </div>
      </div>
      <footer className="px-4 sm:px-8 py-4 text-xs text-gray-500 text-center">MVP local · Fase 1</footer>
    </main>
  );
}
