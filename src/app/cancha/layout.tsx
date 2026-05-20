import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export default async function CanchaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(ROLES.CANCHA);
  return (
    <AppShell
      role={ROLES.CANCHA}
      userName={session.user.name}
      userEmail={session.user.email}
      nav={[
        { href: '/cancha/dashboard', label: 'Inicio' },
        { href: '/cancha/canchas', label: 'Canchas' },
        { href: '/cancha/grabaciones', label: 'Grabaciones' },
        { href: '/cancha/accesos', label: 'Accesos' },
        { href: '/cancha/metricas', label: 'Métricas' },
      ]}
    >
      {children}
    </AppShell>
  );
}
