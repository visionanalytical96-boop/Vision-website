import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { preparePhoto } from '@/lib/photos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PHOTOS = 8;

const schema = z.object({
  kind: z.enum(['STAY', 'RESTAURANT']),
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(15),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  description: z.string().trim().min(20).max(2000),

  stayType: z.enum(['HOTEL', 'RESORT', 'VILLA', 'HOMESTAY', 'FARM_STAY']).optional(),
  rooms: z.coerce.number().int().min(1).max(500).optional(),
  maxGuests: z.coerce.number().int().min(1).max(200).optional(),
  roomName: z.string().trim().max(120).optional(),
  mealPlan: z.string().trim().max(120).optional(),
  amenities: z.array(z.string().trim().max(60)).max(20).optional(),

  cuisine: z.string().trim().max(120).optional(),
  vegType: z.string().trim().max(60).optional(),
  hours: z.string().trim().max(120).optional(),
  costForTwo: z.coerce.number().int().min(50).max(20000).optional(),

  price: z.coerce.number().int().min(100).max(200000).optional(),
});

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Form theek se nahi bhara gaya' }, { status: 400 });

  const raw = {
    ...Object.fromEntries(
      [...form.entries()].filter(([k, v]) => k !== 'photos' && k !== 'amenities' && typeof v === 'string'),
    ),
    amenities: form.getAll('amenities').filter((v): v is string => typeof v === 'string'),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join('.')}: ${first.message}` : 'Kuch fields galat hain' },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // A stay needs a nightly rate; a restaurant needs a cost for two. Enforcing
  // it here (not just in the UI) keeps the approval step from producing a
  // listing with no price on it.
  if (d.kind === 'STAY' && !d.price) {
    return NextResponse.json({ error: 'Per night price daaliye' }, { status: 400 });
  }
  if (d.kind === 'RESTAURANT' && !d.costForTwo) {
    return NextResponse.json({ error: 'Cost for two daaliye' }, { status: 400 });
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Zyada se zyada ${MAX_PHOTOS} photos` }, { status: 400 });
  }

  const prepared = [];
  for (const file of files.slice(0, MAX_PHOTOS)) {
    const photo = await preparePhoto(file);
    if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: 400 });
    prepared.push(photo);
  }

  const application = await db.partnerApplication.create({
    data: {
      kind: d.kind,
      publicToken: randomBytes(16).toString('hex'),
      businessName: d.businessName,
      ownerName: d.ownerName,
      email: d.email,
      phone: d.phone,
      city: d.city,
      area: d.area,
      address: d.address,
      description: d.description,
      stayType: d.kind === 'STAY' ? d.stayType ?? 'HOMESTAY' : null,
      rooms: d.rooms ?? null,
      maxGuests: d.maxGuests ?? null,
      roomName: d.roomName || null,
      mealPlan: d.mealPlan || null,
      amenities: d.amenities ?? [],
      cuisine: d.cuisine || null,
      vegType: d.vegType || null,
      hours: d.hours || null,
      costForTwo: d.costForTwo ?? null,
      price: d.price ?? null,
      photos: { create: prepared.map((p, sort) => ({ ...p, alt: d.businessName, sort })) },
    },
    select: { publicToken: true },
  });

  await db.auditLog.create({
    data: {
      actorName: d.ownerName,
      action: 'application.submitted',
      entity: 'PartnerApplication',
      detail: `${d.kind} · ${d.businessName} · ${d.city}`,
    },
  });

  return NextResponse.json({ ok: true, token: application.publicToken });
}
