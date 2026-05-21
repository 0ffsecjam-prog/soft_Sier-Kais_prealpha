import Link from 'next/link';
import { ROLE_LABEL, type Role } from '@/lib/roles';
import { SignOutButton } from './SignOutButton';

interface NavItem {
  href: string;
  label: string;
}

interface Props {
  role: Role;
  userName: string;
  userEmail: string;
  nav: NavItem[];
  children: React.ReactNode;
}

export default function AppShell({ role, userName, userEmail, nav, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white text-sm font-bold">T</div>
            <span className="font-semibold hidden sm:inline">Tempel × SIERA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="btn btn-ghost text-sm">{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">{ROLE_LABEL[role]}</div>
              <div className="text-sm font-medium truncate max-w-[160px]">{userName || userEmail}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="btn btn-ghost text-xs whitespace-nowrap">{n.label}</Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
