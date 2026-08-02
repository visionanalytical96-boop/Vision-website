import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { preparePhoto } from '@/lib/photos';
import { normalisePhone } from '@/lib/auth/otp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(15),
  vehicleType: z.enum(['BIKE', 'EBIKE', 'AUTO']),
  vehicleNumber: z.string().trim().min(4).max(20),
  licenceNumber: z.string().trim().max(30).optional(),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Form theek se nahi bhara gaya' }, { status: 400 });

  const parsed = schema.safeParse(
    Object.fromEntries([...form.entries()].filter(([k, v]) => k !== 'photos' && typeof v === 'string')),
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Kuch fields galat hain' }, { status: 400 });
  }
  const d = parsed.data;
  const phone = normalisePhone(d.phone);
  if (phone.length !== 10) return NextResponse.json({ error: '10 digit ka mobile number daaliye' }, { status: 400 });

  const existing = await db.rider.findUnique({ where: { phone }, select: { status: true } });
  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.status === 'APPROVED'
            ? 'Yeh number pehle se registered hai — seedha login kijiye'
            : 'Is number se application pehle hi aa chuki hai',
      },
      { status: 409 },
    );
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  const prepared = [];
  for (const file of files.slice(0, 4)) {
    const photo = await preparePhoto(file);
    if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: 400 });
    prepared.push(photo);
  }

  const rider = await db.rider.create({
    data: {
      name: d.name,
      phone,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber.toUpperCase(),
      licenceNumber: d.licenceNumber || null,
      city: d.city,
      area: d.area,
      photos: { create: prepared.map((p, sort) => ({ ...p, alt: d.name, sort })) },
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      actorName: d.name,
      action: 'rider.applied',
      entity: 'Rider',
      entityId: rider.id,
      detail: `${d.vehicleType} · ${d.vehicleNumber.toUpperCase()} · ${d.city}`,
    },
  });

  return NextResponse.json({ ok: true });
}
