import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(ROLES.CLIENTE);

  return (
    <AppShell
      role={ROLES.CLIENTE}
      userName={session.user.name}
      userEmail={session.user.email}
      nav={[
        { href: '/cliente/dashboard', label: 'Mis Partidos' },
        { href: '/cliente/reservas', label: 'Mis Reservas' },
        { href: '/cliente/reservar', label: 'Reservar' },
        { href: '/cliente/claim', label: 'Canjear código' },
      ]}
    >
      {children}
    </AppShell>
  );
}
