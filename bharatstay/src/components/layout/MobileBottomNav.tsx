'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Hotels', href: '/hotels', icon: '🏨' },
  { label: 'Bookings', href: '/dashboard/customer/bookings', icon: '🎫' },
  { label: 'Support', href: '/support', icon: '💬' },
  { label: 'Account', href: '/dashboard/customer', icon: '👤' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-white/95 backdrop-blur lg:hidden">
      <ul className="flex items-stretch justify-between">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  active ? 'text-saffron-600' : 'text-royal-500',
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
