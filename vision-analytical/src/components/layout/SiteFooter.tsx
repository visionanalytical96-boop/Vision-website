import Link from 'next/link';
import { MAIN_NAV_LINKS } from '@/lib/site-nav';

const CATEGORY_LINKS = [
  { href: '/products/hplc', label: 'HPLC' },
  { href: '/products/gc', label: 'GC' },
  { href: '/products/lc-ms', label: 'LC-MS' },
  { href: '/products/gc-ms', label: 'GC-MS' },
  { href: '/products/uv', label: 'UV-Vis' },
  { href: '/products/ftir', label: 'FTIR' },
];

const SERVICE_LINKS = [
  { href: '/services#amc', label: 'AMC / CMC' },
  { href: '/services#calibration', label: 'Calibration' },
  { href: '/services#iqoqpq', label: 'IQ / OQ / PQ' },
  { href: '/services#installation', label: 'Installation' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <p className="font-display text-lg font-bold text-foreground">
            Vision <span className="text-blue-600 dark:text-cyan-400">Analytical</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Laboratory instrument sales, refurbishment, spare parts and service across Maharashtra &amp; Gujarat.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Company</p>
          <ul className="mt-3 space-y-2">
            {MAIN_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Categories</p>
          <ul className="mt-3 space-y-2">
            {CATEGORY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Services</p>
          <ul className="mt-3 space-y-2">
            {SERVICE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-muted">&copy; {year} Vision Analytical. All rights reserved.</p>
      </div>
    </footer>
  );
}
