import Link from 'next/link';
import { getPageContent } from '@/lib/data/cms';
import { headerContentSchema, footerContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_HEADER_CONTENT, DEFAULT_FOOTER_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';

export async function SiteFooter() {
  const [headerPage, footerPage] = await Promise.all([
    getPageContent(ContentPageKey.HEADER),
    getPageContent(ContentPageKey.FOOTER),
  ]);
  const { navLinks } = parseContent(headerContentSchema, headerPage?.content, DEFAULT_HEADER_CONTENT);
  const footer = parseContent(footerContentSchema, footerPage?.content, DEFAULT_FOOTER_CONTENT);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <p className="font-display text-lg font-bold text-foreground">
            Vision <span className="text-primary dark:text-secondary">Analytical</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">{footer.tagline}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{footer.companyColumnHeading}</p>
          <ul className="mt-3 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{footer.categoryColumnHeading}</p>
          <ul className="mt-3 space-y-2">
            {footer.categoryLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{footer.serviceColumnHeading}</p>
          <ul className="mt-3 space-y-2">
            {footer.serviceLinks.map((link) => (
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
