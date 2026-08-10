import Link from 'next/link';
import { getSession } from '@/lib/dal';
import { roleHomePath } from '@/lib/roles';
import { getPageContent } from '@/lib/data/cms';
import { headerContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_HEADER_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';
import { buttonVariants } from '@/components/ui/Button';
import { MobileNav } from './MobileNav';
import { CartIndicator } from './CartIndicator';

export async function SiteHeader() {
  const [session, headerPage] = await Promise.all([getSession(), getPageContent(ContentPageKey.HEADER)]);
  const accountHref = session ? roleHomePath(session.role) : '/login';
  const { navLinks } = parseContent(headerContentSchema, headerPage?.content, DEFAULT_HEADER_CONTENT);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Vision <span className="text-blue-600 dark:text-cyan-400">Analytical</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <CartIndicator />
          <Link href={accountHref} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'ml-1' })}>
            {session ? 'My Account' : 'Login'}
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Request Quote
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <CartIndicator />
          <MobileNav navLinks={navLinks} isAuthenticated={Boolean(session)} accountHref={accountHref} />
        </div>
      </div>
    </header>
  );
}
