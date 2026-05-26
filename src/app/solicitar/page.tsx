import Link from 'next/link';
import { SignupRequestForm } from './SignupRequestForm';

export const metadata = { title: 'Pedí el sistema — Tempel × SIERA' };

export default function SolicitarPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-8 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold">T</div>
          <div className="font-semibold">Tempel × SIERA</div>
        </Link>
        <Link href="/login" className="btn btn-ghost text-sm">Ya tengo cuenta</Link>
      </header>

      <div className="flex-1 px-4 sm:px-8 py-8 max-w-3xl mx-auto w-full">
        <div className="text-xs font-semibold tracking-widest uppercase text-brand-600">Para complejos deportivos</div>
        <h1 className="mt-2 text-3xl font-bold">¿Querés el sistema en tu complejo?</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Dejanos los datos de tu complejo y te contactamos por mail para coordinar la instalación de cámaras (SIERA) y darte de alta en la plataforma. Sin compromiso.
        </p>

        <div className="mt-8">
          <SignupRequestForm />
        </div>
      </div>

      <footer className="px-4 sm:px-8 py-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
        SIERA hardware · Tempel software
      </footer>
    </main>
  );
}
