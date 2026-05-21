import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(ROLES.ADMIN);
  return (
    <AppShell
      role={ROLES.ADMIN}
      userName={session.user.name}
      userEmail={session.user.email}
      nav={[
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/complejos', label: 'Complejos' },
        { href: '/admin/config', label: 'Config' },
        { href: '/admin/storage', label: 'Storage' },
        { href: '/admin/logs', label: 'Logs' },
      ]}
    >
      {children}
    </AppShell>
  );
}
