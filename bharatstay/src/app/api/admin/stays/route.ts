import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';
import { preparePhoto } from '@/lib/photos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

const base = {
  name: z.string().trim().min(2).max(120),
  type: z.enum(['HOTEL', 'RESORT', 'VILLA', 'HOMESTAY', 'FARM_STAY']),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(120),
  room: z.string().trim().min(1).max(120),
  meal: z.string().trim().min(1).max(120),
  tone: z.string().trim().max(20).default('forest'),
  star: z.coerce.number().int().min(1).max(5).default(3),
  price: z.coerce.number().int().min(100).max(500000),
  basePrice: z.coerce.number().int().min(100).max(500000).optional(),
  rating: z.coerce.number().min(1).max(5).default(4),
  visible: z.coerce.boolean().default(true),
  amenities: z.array(z.string().trim().max(60)).max(24).default([]),
};

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  const id = form.get('id');
  const raw = {
    ...Object.fromEntries(
      [...form.entries()].filter(([k, v]) => !['photos', 'amenities', 'id'].includes(k) && typeof v === 'string'),
    ),
    amenities: form.getAll('amenities').filter((v): v is string => typeof v === 'string'),
    visible: form.get('visible') === 'on' || form.get('visible') === 'true',
  };

  const parsed = z.object(base).safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Galat data' }, { status: 400 });
  }
  const d = parsed.data;
  const address = `${d.area}, ${d.city}, Maharashtra`;
  const data = { ...d, address, basePrice: d.basePrice ?? Math.round(d.price * 1.15) };

  let stayId: string;
  if (typeof id === 'string' && id) {
    const updated = await db.stay.update({ where: { id }, data });
    stayId = updated.id;
  } else {
    let slug = slugify(`${d.name}-${d.city}`);
    let n = 1;
    while (await db.stay.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${slugify(`${d.name}-${d.city}`)}-${++n}`;
    }
    const created = await db.stay.create({ data: { ...data, slug } });
    stayId = created.id;
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  for (const [sort, file] of files.slice(0, 8).entries()) {
    const photo = await preparePhoto(file);
    if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: 400 });
    await db.photo.create({ data: { ...photo, alt: d.name, sort, stayId } });
  }

  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: id ? 'stay.updated' : 'stay.created',
      entity: 'Stay',
      entityId: stayId,
      detail: `${d.name} · ₹${d.price}`,
    },
  });

  return NextResponse.json({ ok: true, id: stayId });
}

export async function DELETE(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id chahiye' }, { status: 400 });

  const stay = await db.stay.findUnique({ where: { id }, select: { name: true } });
  if (!stay) return NextResponse.json({ error: 'Nahi mila' }, { status: 404 });

  await db.stay.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: 'stay.deleted',
      entity: 'Stay',
      entityId: id,
      detail: stay.name,
    },
  });
  return NextResponse.json({ ok: true });
}
