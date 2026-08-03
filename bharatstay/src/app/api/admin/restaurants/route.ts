import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';
import { preparePhoto } from '@/lib/photos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(120),
  cuisine: z.string().trim().min(2).max(120),
  vegType: z.string().trim().min(2).max(60),
  hours: z.string().trim().min(2).max(120),
  emoji: z.string().trim().max(8).default('🍽️'),
  tone: z.string().trim().max(20).default('saffron'),
  costForTwo: z.coerce.number().int().min(50).max(50000),
  rating: z.coerce.number().min(1).max(5).default(4),
  visible: z.coerce.boolean().default(true),
});

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  const id = form.get('id');
  const raw = {
    ...Object.fromEntries([...form.entries()].filter(([k, v]) => !['photos', 'id'].includes(k) && typeof v === 'string')),
    visible: form.get('visible') === 'on' || form.get('visible') === 'true',
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Galat data' }, { status: 400 });
  }
  const d = parsed.data;
  const data = { ...d, address: `${d.area}, ${d.city}, Maharashtra` };

  let restaurantId: string;
  if (typeof id === 'string' && id) {
    restaurantId = (await db.restaurant.update({ where: { id }, data })).id;
  } else {
    let slug = slugify(`${d.name}-${d.city}`);
    let n = 1;
    while (await db.restaurant.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${slugify(`${d.name}-${d.city}`)}-${++n}`;
    }
    restaurantId = (await db.restaurant.create({ data: { ...data, slug } })).id;
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  for (const [sort, file] of files.slice(0, 8).entries()) {
    const photo = await preparePhoto(file);
    if ('error' in photo) return NextResponse.json({ error: photo.error }, { status: 400 });
    await db.photo.create({ data: { ...photo, alt: d.name, sort, restaurantId } });
  }

  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: id ? 'restaurant.updated' : 'restaurant.created',
      entity: 'Restaurant',
      entityId: restaurantId,
      detail: `${d.name} · ₹${d.costForTwo}`,
    },
  });

  return NextResponse.json({ ok: true, id: restaurantId });
}

export async function DELETE(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id chahiye' }, { status: 400 });

  const row = await db.restaurant.findUnique({ where: { id }, select: { name: true } });
  if (!row) return NextResponse.json({ error: 'Nahi mila' }, { status: 404 });

  await db.restaurant.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: 'restaurant.deleted',
      entity: 'Restaurant',
      entityId: id,
      detail: row.name,
    },
  });
  return NextResponse.json({ ok: true });
}
