'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { FEATURE_FLAGS, isFeatureFlagKey } from '@/lib/features';
import { Role } from '@/generated/prisma/client';

/**
 * Upsert rather than update: the registry holds the defaults, so a flag has no
 * row until someone changes it. Toggling one is the moment it gets stored.
 */
export async function setFeatureFlag(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const key = String(formData.get('key') ?? '');
  if (!isFeatureFlagKey(key)) return;
  const isEnabled = formData.get('isEnabled') === 'true';

  const meta = FEATURE_FLAGS[key];
  await prisma.featureFlag.upsert({
    where: { key },
    update: { isEnabled },
    create: {
      key,
      isEnabled,
      label: meta.label,
      description: meta.description,
      group: meta.group,
      sortOrder: meta.sortOrder,
    },
  });

  // A flag can change navigation, so the whole tree revalidates.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings/features');
}
