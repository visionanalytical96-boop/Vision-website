import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagDefault,
  isFeatureFlagKey,
  type FeatureFlagKey,
} from '@/lib/features';

/**
 * Flags are read on nearly every request, so the resolved map is cached per
 * request. A database failure falls back to the coded defaults rather than
 * taking modules offline - an unreachable database should degrade the site,
 * not silently disable half of it.
 */
export const getFeatureFlags = cache(async (): Promise<Record<FeatureFlagKey, boolean>> => {
  const resolved = Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key) => [key, featureFlagDefault(key)]),
  ) as Record<FeatureFlagKey, boolean>;

  try {
    const rows = await prisma.featureFlag.findMany({ select: { key: true, isEnabled: true } });
    for (const row of rows) {
      if (isFeatureFlagKey(row.key)) resolved[row.key] = row.isEnabled;
    }
  } catch (error) {
    console.error('Feature flag lookup failed, using defaults:', error);
  }

  return resolved;
});

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  return (await getFeatureFlags())[key];
}

/** The admin toggle list: registry metadata joined to the stored state. */
export async function getFeatureFlagSettings() {
  const resolved = await getFeatureFlags();
  return FEATURE_FLAG_KEYS.map((key) => ({
    key,
    ...FEATURE_FLAGS[key],
    isEnabled: resolved[key],
  })).sort((a, b) => a.group.localeCompare(b.group) || a.sortOrder - b.sortOrder);
}

/**
 * Gate a route on a flag. A disabled module returns 404 rather than a
 * "temporarily off" page: to the outside world the feature does not exist, and
 * a 404 keeps it out of search results while it's off.
 */
export async function requireFeature(key: FeatureFlagKey): Promise<void> {
  if (!(await isFeatureEnabled(key))) notFound();
}
