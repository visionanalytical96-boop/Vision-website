import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

const schema = z.union([
  z.object({
    kind: z.literal('service'),
    key: z.string().min(1).max(40),
    enabled: z.boolean(),
  }),
  z.object({
    kind: z.literal('settings'),
    values: z.record(z.string().max(60), z.string().max(4000)),
  }),
]);

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ('response' in guard) return guard.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  if (parsed.data.kind === 'service') {
    const { key, enabled } = parsed.data;
    const service = await db.serviceToggle.findUnique({ where: { key } });
    if (!service) return NextResponse.json({ error: 'Service nahi mili' }, { status: 404 });

    await db.serviceToggle.update({ where: { key }, data: { enabled } });
    await db.auditLog.create({
      data: {
        actorId: guard.session.userId,
        actorName: guard.session.name,
        action: enabled ? 'service.enabled' : 'service.disabled',
        entity: 'ServiceToggle',
        entityId: key,
        detail: service.label,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const entries = Object.entries(parsed.data.values);
  for (const [key, value] of entries) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await db.auditLog.create({
    data: {
      actorId: guard.session.userId,
      actorName: guard.session.name,
      action: 'settings.updated',
      entity: 'SiteSetting',
      detail: entries.map(([k]) => k).join(', '),
    },
  });
  return NextResponse.json({ ok: true });
}
