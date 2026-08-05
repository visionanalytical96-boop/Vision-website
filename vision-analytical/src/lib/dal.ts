import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { readSessionCookie, type SessionPayload } from '@/lib/session';
import { roleHomePath } from '@/lib/roles';
import { Role } from '@/generated/prisma/client';

/** Optimistic, cookie-only session read. Memoized per request. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return readSessionCookie();
});

/** Redirects to /login when there is no valid session. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/** Redirects to the user's own section when their role doesn't match. */
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== role) {
    redirect(roleHomePath(session.role));
  }
  return session;
}

/** Secure check: re-reads the user from the database (e.g. to confirm isActive). Memoized per request. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      companyName: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
});

/** Secure, DB-backed gate for top-level dashboard layouts: confirms isActive and (optionally) role. */
export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (role && user.role !== role) {
    redirect(roleHomePath(user.role));
  }
  return user;
}
