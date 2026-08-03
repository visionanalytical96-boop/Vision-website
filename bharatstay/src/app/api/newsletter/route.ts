import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const signup = z.object({ email: z.string().trim().email('Sahi email daaliye').max(160) });

export async function POST(request: Request) {
  const parsed = signup.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Sahi email daaliye' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  // Signing up twice is a normal thing for a person to do, not an error they
  // should have to interpret — upsert and tell them they are on the list.
  await db.newsletterSignup.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
