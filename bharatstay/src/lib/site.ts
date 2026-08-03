import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';

export type ServiceKey = 'rides' | 'stays' | 'restaurants' | 'weekend' | 'packages' | 'activities' | 'cabs' | 'map';

const FALLBACK_SETTINGS: Record<string, string> = {
  brandA: 'Bharat',
  brandB: 'Stay',
  tagline: 'Maharashtra ke stays, restaurants aur weekend trips',
  heroTitle: 'Maharashtra, ghar ke paas se shuru',
  heroSubtitle: 'Badlapur se Karjat, Lonavala se Konkan — farmhouse, villa, hotel aur asli Maharashtrian khana, sab ek jagah.',
  upiId: '',
  upiName: '',
  supportEmail: 'support@bharatstay.example',
  gstin: '',
  city: 'Badlapur, Maharashtra',
  dataNotice: 'Prices aur timings sample data hain — booking se pehle property se confirm karein.',
  adminNotes: '',
};

/** Cached per request so a page render hits these tables once, not per section. */
export const getSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.siteSetting.findMany();
  return { ...FALLBACK_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
});

export const getServices = cache(async () => {
  const rows = await db.serviceToggle.findMany({ orderBy: { sort: 'asc' } });
  return rows;
});

export const getEnabledServices = cache(async (): Promise<Set<string>> => {
  const rows = await getServices();
  return new Set(rows.filter((r) => r.enabled).map((r) => r.key));
});

/** Nav entries the admin has switched on, in admin-defined order. */
export async function getNavLinks(): Promise<{ href: string; label: string }[]> {
  const enabled = await getEnabledServices();
  const all: { key: ServiceKey; href: string; label: string }[] = [
    { key: 'rides', href: '/ride', label: 'Rides' },
    { key: 'stays', href: '/stays', label: 'Stays' },
    { key: 'restaurants', href: '/restaurants', label: 'Restaurants' },
    { key: 'weekend', href: '/weekend', label: 'Weekend' },
    { key: 'packages', href: '/packages', label: 'Packages' },
    { key: 'activities', href: '/activities', label: 'Activities' },
    { key: 'map', href: '/map', label: 'Map' },
  ];
  return all.filter((l) => enabled.has(l.key)).map(({ href, label }) => ({ href, label }));
}
