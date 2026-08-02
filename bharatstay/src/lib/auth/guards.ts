import 'server-only';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getSession, type Session } from './session';

/** For server components under /admin — sends anyone without an admin session to login. */
export async function requireAdminPage(): Promise<Session> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login?as=admin&next=/admin');
  return session;
}

/** For server components that need any logged-in user. */
export async function requireUserPage(next = '/dashboard'): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/**
 * For route handlers. Returns either the session or the 401 to return — the
 * caller must check `'response' in result` before using the session, so a
 * forgotten guard is a type error rather than a silent hole.
 */
export async function requireAdminApi(): Promise<{ session: Session } | { response: NextResponse }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { response: NextResponse.json({ error: 'Admin login required' }, { status: 401 }) };
  }
  return { session };
}
