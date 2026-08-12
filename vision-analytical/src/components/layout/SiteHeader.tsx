import Link from 'next/link';
import { getSession } from '@/lib/dal';
import { roleHomePath } from '@/lib/roles';
import { getPageContent, getSiteSettings } from '@/lib/data/cms';
import { getInstrumentCategories } from '@/lib/data/products';
import { getPublishedBrands } from '@/lib/data/brands';
import { getFeatureFlags } from '@/lib/data/features';
import { headerContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_HEADER_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';
import { buttonVariants } from '@/components/ui/Button';
import type { FeatureFlagKey } from '@/lib/features';
import { SearchForm } from '@/components/search/SearchForm';
import { MobileNav } from './MobileNav';
import { MegaMenu, type MegaMenuColumn } from './MegaMenu';
import { CartIndicator } from './CartIndicator';
import { SiteWordmark } from './SiteWordmark';

/** The nav entry that opens the catalogue panel instead of navigating alone. */
const MEGA_MENU_HREF = '/products';

/** Each lifecycle entry names the flag that must be on for it to appear. */
const LIFECYCLE_ITEMS: (MegaMenuColumn['items'][number] & { feature?: FeatureFlagKey })[] = [
  { label: 'New instruments', href: '/products', description: 'Current systems across every technique', iconKey: 'package' },
  { label: 'Refurbished', href: '/refurbished', description: 'Tested, warranty-backed pre-owned systems', iconKey: 'refresh-cw', feature: 'refurbished' },
  { label: 'Spare parts', href: '/spare-parts', description: 'Lamps, columns, seals and service parts', iconKey: 'cog', feature: 'spare_parts' },
  { label: 'Service & AMC', href: '/services', description: 'Maintenance, calibration and qualification', iconKey: 'shield-check' },
  { label: 'Downloads', href: '/downloads', description: 'Datasheets, manuals and certificates', iconKey: 'file-check', feature: 'downloads' },
  { label: 'Error codes', href: '/error-codes', description: 'Look up what a code on your instrument means', iconKey: 'alert-triangle', feature: 'knowledge_center' },
];

/** Nav links whose destination is a module that can be switched off. */
const NAV_FEATURE_BY_HREF: Record<string, FeatureFlagKey> = {
  '/spare-parts': 'spare_parts',
  '/refurbished': 'refurbished',
  '/blog': 'knowledge_center',
  '/downloads': 'downloads',
};

export async function SiteHeader() {
  const [session, headerPage, settings, categories, brands, features] = await Promise.all([
    getSession(),
    getPageContent(ContentPageKey.HEADER),
    getSiteSettings(),
    getInstrumentCategories(),
    getPublishedBrands(),
    getFeatureFlags(),
  ]);
  const accountHref = session ? roleHomePath(session.role) : '/login';
  const { navLinks: allNavLinks } = parseContent(headerContentSchema, headerPage?.content, DEFAULT_HEADER_CONTENT);

  // A link to a switched-off module would 404, so it comes out of the nav
  // rather than being left as a dead end.
  const navLinks = allNavLinks.filter((link) => {
    const feature = NAV_FEATURE_BY_HREF[link.href];
    return feature ? features[feature] : true;
  });

  // Three axes, because that is how buyers arrive: by technique, by brand, or
  // by where their instrument is in its life.
  const megaColumns: MegaMenuColumn[] = [
    {
      title: 'By technique',
      href: '/products',
      items: categories.map((category) => ({
        label: category.name,
        href: `/products/${category.slug}`,
        description: category.description ?? undefined,
      })),
    },
    {
      title: 'By brand',
      href: '/brands',
      items: brands.slice(0, 8).map((brand) => ({ label: brand.name, href: `/brands/${brand.slug}` })),
    },
    { title: 'By need', items: LIFECYCLE_ITEMS.filter((item) => !item.feature || features[item.feature]) },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex-none font-display text-xl font-bold tracking-tight text-foreground">
          <SiteWordmark companyName={settings?.companyName || 'Vision Analytical'} logoUrl={settings?.logoUrl} />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) =>
            link.href === MEGA_MENU_HREF ? (
              <MegaMenu key={link.href} label={link.label} href={link.href} columns={megaColumns} />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <SearchForm className="w-56 xl:w-72" placeholder="Search products & parts…" />
          <CartIndicator />
          <Link href={accountHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {session ? 'My Account' : 'Login'}
          </Link>
          {features.request_quote && (
            <Link href="/request-quote" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              Request Quote
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <CartIndicator />
          <MobileNav
            navLinks={navLinks}
            isAuthenticated={Boolean(session)}
            accountHref={accountHref}
            megaColumns={megaColumns}
            megaMenuHref={MEGA_MENU_HREF}
            showRequestQuote={features.request_quote}
          />
        </div>
      </div>
    </header>
  );
}
