import type { NextAuthConfig } from 'next-auth';
import { isRole, type Role } from './roles';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
  interface User {
    role?: Role;
  }
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as Record<string, unknown>).role = user.role;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      const role = (token as Record<string, unknown>).role;
      if (token.sub && isRole(role)) {
        session.user = {
          ...session.user,
          id: token.sub,
          email: (token.email ?? session.user?.email ?? '') as string,
          name: (token.name ?? session.user?.name ?? '') as string,
          role,
        };
      }
      return session;
    },
  },
};
