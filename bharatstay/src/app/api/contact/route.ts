import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const message = z.object({
  name: z.string().trim().min(2, 'Apna naam daaliye').max(80),
  email: z.string().trim().email('Sahi email daaliye').max(160),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3, 'Vishay likhiye').max(120),
  body: z.string().trim().min(10, 'Thoda vistaar se likhiye').max(4000),
});

/** Anything more than this from one address in an hour is not a customer. */
const MAX_PER_HOUR = 5;

export async function POST(request: Request) {
  const parsed = message.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Form poora bhariye' }, { status: 400 });
  }

  const { email } = parsed.data;
  const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.contactMessage.count({ where: { email, createdAt: { gt: anHourAgo } } });
  if (recent >= MAX_PER_HOUR) {
    return NextResponse.json(
      { error: 'Bahut saare message bhej diye. Thodi der baad koshish kijiye.' },
      { status: 429 },
    );
  }

  await db.contactMessage.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });

  return NextResponse.json({ ok: true });
}
