import Link from 'next/link';
import { Download, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/db';
import VideoPlayer from '@/components/VideoPlayer';

export const dynamic = 'force-dynamic';

export default async function SharePage({ params }: { params: { token: string } }) {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { recording: { include: { court: { include: { complex: true } } } } },
  });

  const now = Date.now();
  const expired = link && link.expiresAt.getTime() < now;
  const inactive = link && !link.isActive;
  const valid = link && !expired && !inactive && !link.recording.deletedAt;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white text-sm font-bold">T</div>
          <span className="font-semibold text-sm">Tempel × SIERA</span>
        </Link>
        <div className="text-xs text-gray-500">Link compartido · 24 hs</div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        {!link ? (
          <Banner kind="error" title="Link inválido" body="El link que abriste no existe o fue eliminado." />
        ) : expired ? (
          <Banner kind="error" title="Link vencido" body={`Este link expiró el ${link.expiresAt.toLocaleString('es-AR')}. Pedile uno nuevo al cliente que te lo compartió.`} />
        ) : inactive ? (
          <Banner kind="error" title="Link desactivado" body="Quien generó este link lo desactivó." />
        ) : link.recording.deletedAt ? (
          <Banner kind="error" title="Video no disponible" body="El video fue eliminado." />
        ) : (
          <>
            <div>
              <div className="text-xs text-gray-500">{link.recording.court.complex.name} · {link.recording.court.name}</div>
              <h1 className="mt-1 text-2xl font-bold">{link.recording.title}</h1>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{new Date(link.recording.recordedAt).toLocaleString('es-AR')}</div>
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Este link expira el <b>{link.expiresAt.toLocaleString('es-AR')}</b>.
              </div>
            </div>

            <VideoPlayer src={`/api/share/${link.token}/stream`} title={link.recording.title} />

            <div className="card p-4 flex flex-wrap items-center gap-3">
              <a href={`/api/share/${link.token}/download`} className="btn btn-primary"><Download size={16} />Descargar (para ver sin internet)</a>
              <span className="text-xs text-gray-500">El archivo es válido mientras el link no expire.</span>
            </div>
          </>
        )}
        {valid && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            ¿Querés tu propia copia? <Link href="/register" className="text-brand-600">Crear cuenta</Link> y pedile el código al cliente.
          </div>
        )}
      </div>
    </main>
  );
}

function Banner({ kind, title, body }: { kind: 'error' | 'info'; title: string; body: string }) {
  return (
    <div className={`card p-5 flex gap-3 ${kind === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : ''}`}>
      <AlertTriangle className={`shrink-0 ${kind === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{body}</div>
      </div>
    </div>
  );
}
