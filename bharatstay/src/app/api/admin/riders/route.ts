import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const riderSchema = z.object({
  kind: z.literal('rider'),
  id: z.string().min(1),
  action: z.enum(['approve', 'reject', 'suspend', 'reinstate']),
  note: z.string().trim().max(400).optional(),
});

const fareSchema = z.object({
  kind: z.literal('fare'),
  vehicleType: z.enum(['BIKE', 'EBIKE', 'AUTO', 'CAB', 'CAB_XL']),
  baseFare: z.coerce.number().int().min(0).max(2000),
  perKm: z.coerce.number().int().min(1).max(500),
  minFare: z.coerce.number().int().min(0).max(5000),
  matchRadiusKm: z.coerce.number().min(0.5).max(50),
  seats: z.coerce.number().int().min(1).max(12),
  enabled: z.boolean(),
});

const STATUS = { approve: 'APPROVED', reject: 'REJECTED', suspend: 'SUSPENDED', reinstate: 'APPROVED' } as const;

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const parsed = z.union([riderSchema, fareSchema]).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  if (parsed.data.kind === 'fare') {
    const { vehicleType, ...data } = parsed.data;
    await db.fareRule.update({ where: { vehicleType }, data });
    await db.auditLog.create({
      data: {
        actorId: guard.session.userId,
        actorName: guard.session.name,
        action: 'fare.updated',
        entity: 'FareRule',
        entityId: vehicleType,
        detail: `₹${data.baseFare} + ₹${data.perKm}/km, min ₹${data.minFare}`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const { id, action, note } = parsed.data;
  const rider = await db.rider.findUnique({ where: { id } });
  if (!rider) return NextResponse.json({ error: 'Rider nahi mila' }, { status: 404 });

  const status = STATUS[action];
  await db.rider.update({
    where: { id },
    data: {
      status,
      adminNote: note || null,
      reviewedAt: new Date(),
      // A rider who is rejected or suspended must stop being matchable at once.
      ...(status === 'APPROVED' ? {} : { online: false }),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: `rider.${action}`,
      entity: 'Rider',
      entityId: id,
      detail: `${rider.name} · ${rider.vehicleNumber}`,
    },
  });

  return NextResponse.json({ ok: true });
}
