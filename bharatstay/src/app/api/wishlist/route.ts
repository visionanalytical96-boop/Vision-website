import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUserApi } from '@/lib/auth/guards';

const toggle = z.object({ stayId: z.string().min(1) });

/** Returns the ids the current user has saved, so the UI can fill the hearts. */
export async function GET() {
  const auth = await requireUserApi();
  if ('response' in auth) return auth.response;

  const rows = await db.wishlist.findMany({
    where: { userId: auth.session.userId },
    select: { stayId: true },
  });
  return NextResponse.json({ stayIds: rows.map((r) => r.stayId) });
}

/**
 * Toggles one stay. The unique (userId, stayId) pair means a double tap can
 * never leave two rows behind, and the response says which way it went so the
 * button does not have to guess.
 */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if ('response' in auth) return auth.response;

  const parsed = toggle.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Stay chuniye' }, { status: 400 });

  const { stayId } = parsed.data;
  const stay = await db.stay.findUnique({ where: { id: stayId }, select: { id: true, visible: true } });
  if (!stay || !stay.visible) return NextResponse.json({ error: 'Yeh stay nahi mila' }, { status: 404 });

  const userId = auth.session.userId;
  const existing = await db.wishlist.findUnique({ where: { userId_stayId: { userId, stayId } } });

  if (existing) {
    await db.wishlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await db.wishlist.create({ data: { userId, stayId } });
  return NextResponse.json({ saved: true });
}
