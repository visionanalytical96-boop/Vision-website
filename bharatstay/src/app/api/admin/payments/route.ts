import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(['verify', 'reject']),
  note: z.string().trim().max(300).optional(),
});

/** The admin confirms a booking only after seeing the money in the bank. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const { id, action, note } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id }, select: { id: true, ref: true, upiRef: true } });
  if (!booking) return NextResponse.json({ error: 'Booking nahi mili' }, { status: 404 });

  if (action === 'reject' && !note?.trim()) {
    return NextResponse.json({ error: 'Reason likhiye — customer ko yahi dikhega' }, { status: 400 });
  }

  await db.booking.update({
    where: { id },
    data:
      action === 'verify'
        ? { status: 'CONFIRMED', upiVerifiedAt: new Date(), upiRejectedNote: null }
        : { status: 'PENDING', upiRef: null, upiSubmittedAt: null, upiRejectedNote: note!.trim() },
  });

  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: action === 'verify' ? 'payment.verified' : 'payment.rejected',
      entity: 'Booking',
      entityId: id,
      detail: `${booking.ref}${booking.upiRef ? ` · UTR ${booking.upiRef}` : ''}`,
    },
  });

  return NextResponse.json({ ok: true });
}
