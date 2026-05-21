import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { ROLES, ROLE_HOME, isRole } from '@/lib/roles';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set<string>(['/', '/login', '/register']);
// /api/* hace su propio auth check internamente; el middleware no debe redirigir APIs a /login.
// /claim/* es público (el deep link decide qué mostrar según sesión).
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/api/', '/claim/'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user || !isRole(session.user.role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;

  if (pathname.startsWith('/admin') && role !== ROLES.ADMIN) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }
  if (pathname.startsWith('/cancha') && role !== ROLES.CANCHA) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }
  if (pathname.startsWith('/cliente') && role !== ROLES.CLIENTE) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
