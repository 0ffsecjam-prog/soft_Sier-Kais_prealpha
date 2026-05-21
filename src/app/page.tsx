import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/roles';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect(ROLE_HOME[session.user.role]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold">T</div>
          <div className="font-semibold">Tempel × SIERA</div>
        </div>
        <Link href="/login" className="btn btn-secondary">Iniciar sesión</Link>
      </header>
      <section className="flex-1 px-4 sm:px-8 py-10 sm:py-20 max-w-5xl mx-auto w-full">
        <div className="text-xs font-semibold tracking-widest uppercase text-brand-600">Fase 1 — MVP local</div>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight">
          Grabá. Vendé. <span className="text-brand-600">Reproducí.</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
          Plataforma de video para complejos deportivos: el jugador compra el video de su partido, lo ve online y lo descarga si quiere. La cancha lo gestiona en 2 clicks.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary">Soy cliente</Link>
          <Link href="/login" className="btn btn-secondary">Soy una cancha</Link>
          <Link href="/login" className="btn btn-ghost">Admin Tempel</Link>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500">Cliente</div>
            <h3 className="mt-1 font-semibold">Mis Partidos</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Reclamá tu código y miralo en cualquier dispositivo.</p>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500">Cancha</div>
            <h3 className="mt-1 font-semibold">Generar accesos</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Un código por partido, reutilizable, opcionalmente con vencimiento.</p>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500">Admin</div>
            <h3 className="mt-1 font-semibold">Métricas y debug</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ingresos por complejo, logs y configuración live.</p>
          </div>
        </div>
      </section>
      <footer className="px-4 sm:px-8 py-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
        SIERA hardware · Tempel software · MVP local
      </footer>
    </main>
  );
}
