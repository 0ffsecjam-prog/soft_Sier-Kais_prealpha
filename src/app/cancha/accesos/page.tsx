import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { getComplexByOwnerId } from '@/lib/queries';
import { NewTokenForm } from './NewTokenForm';
import { TokenList } from './TokenList';

export const dynamic = 'force-dynamic';

export default async function CanchaAccesosPage() {
  const session = await requireRole(ROLES.CANCHA);
  const complex = await getComplexByOwnerId(session.user.id);
  if (!complex) return <div className="card p-6">Sin complejo asociado.</div>;

  const [recordings, tokens] = await Promise.all([
    prisma.recording.findMany({
      where: { court: { complexId: complex.id }, deletedAt: null },
      include: { court: true },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.accessToken.findMany({
      where: { recording: { court: { complexId: complex.id } } },
      include: { recording: { include: { court: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accesos a partidos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Generá un código por partido. Podés definir cuántas veces se canjea y cuándo expira.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold">Nuevo acceso</h2>
          <NewTokenForm recordings={recordings} />
        </div>

        <div>
          <h2 className="font-semibold mb-2">Recientes</h2>
          <TokenList tokens={tokens.map((t) => ({
            id: t.id,
            code: t.code,
            recordingTitle: t.recording.title,
            courtName: t.recording.court.name,
            maxUses: t.maxUses,
            usedCount: t.usedCount,
            expiresAt: t.expiresAt?.toISOString() ?? null,
            isActive: t.isActive,
            createdAt: t.createdAt.toISOString(),
          }))} />
        </div>
      </div>
    </div>
  );
}
