import 'server-only';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

/**
 * Which stays the current visitor has saved. Empty for logged-out visitors —
 * the heart still renders, it just sends them to login when tapped, so the
 * feature is discoverable before you have an account.
 */
export async function getSavedStayIds(): Promise<Set<string>> {
  const session = await getSession();
  if (!session) return new Set();

  const rows = await db.wishlist.findMany({
    where: { userId: session.userId },
    select: { stayId: true },
  });
  return new Set(rows.map((r) => r.stayId));
}
