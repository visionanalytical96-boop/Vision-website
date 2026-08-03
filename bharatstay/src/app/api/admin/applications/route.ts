import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'reject', 'needs_info']),
  note: z.string().trim().max(600).optional(),
  /** Admin can correct the asking price before it goes live. */
  price: z.coerce.number().int().min(50).max(200000).optional(),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

/** Slugs are unique; if a name collides, add a numeric suffix rather than failing. */
async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  let slug = base || 'listing';
  let n = 1;
  while (await exists(slug)) slug = `${base}-${++n}`;
  return slug;
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const { id, action, note, price } = parsed.data;

  const app = await db.partnerApplication.findUnique({ where: { id }, include: { photos: { select: { id: true } } } });
  if (!app) return NextResponse.json({ error: 'Application nahi mili' }, { status: 404 });

  if (action !== 'approve') {
    await db.partnerApplication.update({
      where: { id },
      data: {
        status: action === 'reject' ? 'REJECTED' : 'NEEDS_INFO',
        adminNote: note || null,
        reviewedAt: new Date(),
        reviewedById: guard.session.userId,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: guard.session.userId,
        actorName: guard.session.name,
        action: action === 'reject' ? 'application.rejected' : 'application.needs_info',
        entity: 'PartnerApplication',
        entityId: id,
        detail: app.businessName,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (app.status === 'APPROVED') return NextResponse.json({ error: 'Yeh pehle hi approve ho chuki hai' }, { status: 409 });

  const address = app.address || `${app.area}, ${app.city}, Maharashtra`;

  if (app.kind === 'STAY') {
    const finalPrice = price ?? app.price ?? 1500;
    const slug = await uniqueSlug(slugify(`${app.businessName}-${app.city}`), async (s) =>
      Boolean(await db.stay.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const stay = await db.stay.create({
      data: {
        slug,
        name: app.businessName,
        type: app.stayType ?? 'HOMESTAY',
        city: app.city,
        area: app.area,
        address,
        star: 3,
        tone: 'forest',
        room: app.roomName || 'Standard Room',
        meal: app.mealPlan || 'Breakfast',
        amenities: app.amenities,
        basePrice: Math.round(finalPrice * 1.15),
        price: finalPrice,
        rating: 4.0,
        reviewCount: 0,
        applicationId: app.id,
      },
    });
    // Move the submitted photos onto the live listing so the owner does not
    // have to upload them a second time.
    if (app.photos.length) {
      await db.photo.updateMany({
        where: { applicationId: app.id },
        data: { applicationId: null, stayId: stay.id },
      });
    }
  } else {
    const slug = await uniqueSlug(slugify(`${app.businessName}-${app.city}`), async (s) =>
      Boolean(await db.restaurant.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const restaurant = await db.restaurant.create({
      data: {
        slug,
        name: app.businessName,
        city: app.city,
        area: app.area,
        address,
        cuisine: app.cuisine || 'Maharashtrian',
        vegType: app.vegType || 'Veg & Non-veg',
        hours: app.hours || '11:00 AM – 11:00 PM',
        costForTwo: price ?? app.costForTwo ?? 400,
        rating: 4.0,
        applicationId: app.id,
      },
    });
    if (app.photos.length) {
      await db.photo.updateMany({
        where: { applicationId: app.id },
        data: { applicationId: null, restaurantId: restaurant.id },
      });
    }
  }

  await db.partnerApplication.update({
    where: { id },
    data: {
      status: 'APPROVED',
      adminNote: note || null,
      reviewedAt: new Date(),
      reviewedById: guard.session.userId,
      ...(price ? (app.kind === 'STAY' ? { price } : { costForTwo: price }) : {}),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: 'application.approved',
      entity: 'PartnerApplication',
      entityId: id,
      detail: `${app.businessName} · ${app.city} · live`,
    },
  });

  return NextResponse.json({ ok: true });
}
