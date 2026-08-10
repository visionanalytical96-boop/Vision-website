import Link from 'next/link';
import { getPageContent, getSiteSettings } from '@/lib/data/cms';
import { headerContentSchema, footerContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_HEADER_CONTENT, DEFAULT_FOOTER_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';
import { SiteWordmark } from './SiteWordmark';
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from './SocialIcons';

export async function SiteFooter() {
  const [headerPage, footerPage, settings] = await Promise.all([
    getPageContent(ContentPageKey.HEADER),
    getPageContent(ContentPageKey.FOOTER),
    getSiteSettings(),
  ]);
  const { navLinks } = parseContent(headerContentSchema, headerPage?.content, DEFAULT_HEADER_CONTENT);
  const footer = parseContent(footerContentSchema, footerPage?.content, DEFAULT_FOOTER_CONTENT);
  const companyName = settings?.companyName || 'Vision Analytical';
  const year = new Date().getFullYear();

  const socialLinks = [
    { href: settings?.facebookUrl, label: 'Facebook', icon: FacebookIcon },
    { href: settings?.instagramUrl, label: 'Instagram', icon: InstagramIcon },
    { href: settings?.linkedinUrl, label: 'LinkedIn', icon: LinkedinIcon },
    { href: settings?.youtubeUrl, label: 'YouTube', icon: YoutubeIcon },
  ].filter((social): social is { href: string; label: string; icon: typeof FacebookIcon } => Boolean(social.href));

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <p className="font-display text-lg font-bold text-foreground">
            <SiteWordmark companyName={companyName} logoUrl={settings?.logoUrl} />
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">{footer.tagline}</p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
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
        <p className="text-center text-xs text-muted">&copy; {year} {companyName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
