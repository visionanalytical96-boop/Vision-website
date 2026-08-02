import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from '@node-rs/argon2';
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
    await verify(
      '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$8Kc0YvJXBmYUOJcHkPBhTAOWLmY0Zk5aVXBqSjNwbXM',
      parsed.data.password,
    ).catch(() => false);
    return invalid;
  }

  if (!(await verify(user.passwordHash, parsed.data.password).catch(() => false))) return invalid;

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email ?? undefined });
  return NextResponse.json({ ok: true, name: user.name });
}
