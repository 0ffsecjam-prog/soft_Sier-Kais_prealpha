'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn-secondary text-sm"
      onClick={() => signOut({ callbackUrl: '/' })}
      title="Cerrar sesión"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}
