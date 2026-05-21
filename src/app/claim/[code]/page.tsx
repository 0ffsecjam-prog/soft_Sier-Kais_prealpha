import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ROLES, ROLE_HOME } from '@/lib/roles';
import { redirect } from 'next/navigation';
import { ClaimForm } from '../../cliente/claim/ClaimForm';

export const dynamic = 'force-dynamic';

export default async function ClaimDeepLinkPage({ params }: { params: { code: string } }) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/claim/${params.code}`)}`);
  }

  if (session.user.role !== ROLES.CLIENTE) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-6 max-w-md w-full">
          <h1 className="text-xl font-bold">Solo clientes</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Los códigos de acceso se canjean con una cuenta de cliente. Iniciá sesión con una cuenta de cliente para reclamar este video.
          </p>
          <Link href={ROLE_HOME[session.user.role]} className="mt-4 btn btn-secondary">Ir a mi panel</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-6 max-w-md w-full">
        <h1 className="text-xl font-bold">Canjear código</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tu código está pre-cargado. Confirmá para vincular el video.</p>
        <div className="mt-4">
          <ClaimForm initialCode={params.code} />
        </div>
      </div>
    </main>
  );
}
