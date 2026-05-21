import Link from 'next/link';
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

          <div className="mt-5 card p-4 text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <div className="font-semibold text-sm mb-1">Cuentas de prueba</div>
            <div><b>Admin:</b> admin@tempelgroup.com / admin123</div>
            <div><b>Cancha:</b> dueno@complejolosalamos.com / cancha123</div>
            <div><b>Cliente:</b> jugador@gmail.com / cliente123</div>
          </div>

          <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
            ¿Sos cliente nuevo? <Link href="/register" className="text-brand-600 font-medium">Registrate</Link>
          </p>
        </div>
      </div>
      <footer className="px-4 sm:px-8 py-4 text-xs text-gray-500 text-center">MVP local · Fase 1</footer>
    </main>
  );
}
