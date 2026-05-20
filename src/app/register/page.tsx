import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
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
            <h1 className="text-2xl font-bold">Crear cuenta de Cliente</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Las cuentas de cancha y admin se crean desde el panel admin.
            </p>
            <RegisterForm />
          </div>
          <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
            ¿Ya tenés cuenta? <Link href="/login" className="text-brand-600 font-medium">Iniciá sesión</Link>
          </p>
        </div>
      </div>
      <footer className="px-4 sm:px-8 py-4 text-xs text-gray-500 text-center">MVP local · Fase 1</footer>
    </main>
  );
}
