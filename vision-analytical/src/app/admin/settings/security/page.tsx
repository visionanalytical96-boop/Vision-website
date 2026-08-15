import type { Metadata } from 'next';
import { requireUser } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { Role } from '@/generated/prisma/client';
import { TwoFactorSetup } from '@/components/forms/TwoFactorSetup';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Security' };

export default async function AdminSecurityPage() {
  const user = await requireUser(Role.ADMIN);

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabledAt: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Security</h2>
        <p className="mt-1 text-sm text-muted">
          Your own sign-in settings. Changes here affect this account only.
        </p>
      </div>

      <TwoFactorSetup
        enabled={Boolean(record?.twoFactorEnabledAt)}
        enabledAt={record?.twoFactorEnabledAt ? formatDate(record.twoFactorEnabledAt) : null}
      />
    </div>
  );
}
