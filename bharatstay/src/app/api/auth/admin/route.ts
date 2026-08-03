import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DUMMY_HASH, isLegacyHash, verifySecret } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email aur password daaliye' }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  // Same message and roughly the same work either way, so a wrong email cannot
  // be told apart from a wrong password.
  const invalid = NextResponse.json({ error: 'Galat email ya password' }, { status: 401 });
  if (!user?.passwordHash || user.role !== 'ADMIN') {
    await verifySecret(DUMMY_HASH, parsed.data.password);
    return invalid;
  }

  // A password stored by the old argon2 build cannot be checked in this
  // runtime. Say so plainly instead of pretending the password is wrong.
  if (isLegacyHash(user.passwordHash)) {
    return NextResponse.json(
      { error: 'Password purane format mein hai — `pnpm db:seed` chalakar admin dobara banaiye' },
      { status: 409 },
    );
  }

  if (!(await verifySecret(user.passwordHash, parsed.data.password))) return invalid;

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email ?? undefined });
  return NextResponse.json({ ok: true, name: user.name });
}
