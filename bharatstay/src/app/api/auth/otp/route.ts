import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendOtp, verifyOtp, normalisePhone } from '@/lib/auth/otp';
import { createSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const sendSchema = z.object({ action: z.literal('send'), phone: z.string().min(10) });
const verifySchema = z.object({
  action: z.literal('verify'),
  phone: z.string().min(10),
  code: z.string().min(4).max(6),
  name: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = z.union([sendSchema, verifySchema]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  if (parsed.data.action === 'send') {
    const result = await sendOtp(parsed.data.phone);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
    return NextResponse.json({ ok: true, expiresAt: result.expiresAt, devCode: result.devCode });
  }

  const { phone, code, name } = parsed.data;
  const result = await verifyOtp(phone, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

  const normalised = normalisePhone(phone);
  const user = await db.user.upsert({
    where: { phone: normalised },
    create: { phone: normalised, name: name?.trim() || 'Traveller', role: 'CUSTOMER' },
    update: { lastLoginAt: new Date(), ...(name?.trim() ? { name: name.trim() } : {}) },
  });

  await createSession({ userId: user.id, role: user.role, name: user.name, phone: user.phone ?? undefined });
  return NextResponse.json({ ok: true, name: user.name });
}
