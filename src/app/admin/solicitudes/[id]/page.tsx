import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { prisma } from '@/lib/db';
import {
  SIGNUP_STATUS_LABEL, parseCourtTypes,
  HAS_CAMERAS_LABEL, HAS_INTERNET_LABEL, SURFACE_LABEL,
} from '@/lib/signupOptions';
import { LeadManager } from './LeadManager';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm">{value || <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

export default async function SolicitudDetailPage({ params }: { params: { id: string } }) {
  await requireRole(ROLES.ADMIN);

  const lead = await prisma.signupRequest.findUnique({ where: { id: params.id } });
  if (!lead) notFound();

  const types = parseCourtTypes(lead.courtTypes);
  const convertedUser = lead.convertedUserId
    ? await prisma.user.findUnique({ where: { id: lead.convertedUserId }, include: { complex: true } })
    : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/admin/solicitudes" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"><ArrowLeft size={14} />Volver</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{lead.businessName}</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">Solicitud recibida el {lead.createdAt.toLocaleString('es-AR')}</div>
        </div>
        <span className="badge badge-info">{SIGNUP_STATUS_LABEL[lead.status] ?? lead.status}</span>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Contacto</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" value={lead.contactName} />
          <Field label="Rol" value={lead.role} />
          <Field label="Email" value={<a href={`mailto:${lead.email}`} className="text-brand-600">{lead.email}</a>} />
          <Field label="Teléfono" value={lead.phone} />
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Complejo</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Provincia" value={lead.province} />
          <Field label="Ciudad" value={lead.city} />
          <Field label="Dirección" value={lead.address} />
          <Field label="Cantidad de canchas" value={lead.numberOfCourts} />
          <Field label="Tipos" value={types.join(', ')} />
          <Field label="Superficie" value={lead.surfaceType ? SURFACE_LABEL[lead.surfaceType] : null} />
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Operación</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Partidos / semana" value={lead.matchesPerWeek} />
          <Field label="¿Tiene cámaras?" value={lead.hasCameras ? HAS_CAMERAS_LABEL[lead.hasCameras] : null} />
          <Field label="Internet" value={lead.hasInternet ? HAS_INTERNET_LABEL[lead.hasInternet] : null} />
          <Field label="Nos conoció por" value={lead.referralSource} />
        </div>
        {lead.message && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Mensaje</div>
            <div className="mt-1 text-sm whitespace-pre-wrap">{lead.message}</div>
          </div>
        )}
      </div>

      <LeadManager
        id={lead.id}
        status={lead.status}
        adminNotes={lead.adminNotes}
        defaultEmail={lead.email}
        defaultCourts={Math.min(50, Math.max(1, lead.numberOfCourts))}
        converted={lead.status === 'CONVERTED'}
        convertedAccount={convertedUser ? {
          email: convertedUser.email,
          complexName: convertedUser.complex?.name ?? '',
        } : null}
      />
    </div>
  );
}
