'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/riders', label: 'Riders' },
  { href: '/admin/rides', label: 'Rides' },
  { href: '/admin/stays', label: 'Stays' },
  { href: '/admin/restaurants', label: 'Restaurants' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/theme', label: 'Theme' },
  { href: '/admin/settings', label: 'Site settings' },
];

export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();

  return (
    <nav className="scroll-x border-t px-5" style={{ borderColor: 'rgb(255 255 255 / 0.12)' }}>
      <ul className="mx-auto flex max-w-7xl items-center gap-1 py-1">
        {TABS.map((t) => {
          const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors"
                style={{
                  color: active ? 'var(--turmeric)' : 'rgb(255 255 255 / 0.7)',
                  background: active ? 'rgb(255 255 255 / 0.08)' : 'transparent',
                }}
              >
                {t.label}
                {t.href === '/admin/applications' && pending > 0 && (
                  <span
                    className="data rounded-full px-1.5 text-[10.5px] font-medium"
                    style={{ background: 'var(--laterite)', color: '#fff' }}
                  >
                    {pending}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
