/**
 * The platform's feature flags.
 *
 * Only flags that actually gate something live here. A toggle that does
 * nothing is worse than no toggle - it tells the admin they've turned
 * something off when they haven't. New flags get added alongside the module
 * they control.
 *
 * The registry is the source of truth for defaults; the database only stores
 * overrides. That way a fresh deployment behaves correctly before the seed
 * runs, and a missing row can never take a module offline.
 */
export const FEATURE_FLAGS = {
  knowledge_center: {
    label: 'Knowledge Center',
    description: 'Articles, guides and FAQs at /blog, plus the homepage preview.',
    group: 'Modules',
    defaultEnabled: true,
    sortOrder: 10,
  },
  downloads: {
    label: 'Downloads',
    description: 'The public downloads centre and document links on product pages.',
    group: 'Modules',
    defaultEnabled: true,
    sortOrder: 20,
  },
  spare_parts: {
    label: 'Spare Parts Store',
    description: 'The spare parts catalogue, parts finder and cart.',
    group: 'Modules',
    defaultEnabled: true,
    sortOrder: 30,
  },
  refurbished: {
    label: 'Refurbished Instruments',
    description: 'The refurbished instrument listings.',
    group: 'Modules',
    defaultEnabled: true,
    sortOrder: 40,
  },
  testimonials: {
    label: 'Testimonials',
    description: 'The testimonials section on the homepage.',
    group: 'Modules',
    defaultEnabled: true,
    sortOrder: 50,
  },
  request_quote: {
    label: 'Request a Quote',
    description: 'The quote request page and the header call-to-action.',
    group: 'Commerce',
    defaultEnabled: true,
    sortOrder: 10,
  },
  customer_registration: {
    label: 'Customer Registration',
    description: 'Lets visitors create their own account. Login stays available either way.',
    group: 'Accounts',
    defaultEnabled: true,
    sortOrder: 10,
  },
  maintenance_mode: {
    label: 'Maintenance Mode',
    description: 'Shows a maintenance notice on the public site. Admins can still browse and sign in.',
    group: 'Operations',
    defaultEnabled: false,
    sortOrder: 10,
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

export function featureFlagDefault(key: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[key].defaultEnabled;
}

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.hasOwn(FEATURE_FLAGS, value);
}
