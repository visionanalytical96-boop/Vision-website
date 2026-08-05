import Link from 'next/link';
import { getSession } from '@/lib/dal';
import { roleHomePath } from '@/lib/roles';
import { MAIN_NAV_LINKS } from '@/lib/site-nav';
import { buttonVariants } from '@/components/ui/Button';
import { MobileNav } from './MobileNav';

export async function SiteHeader() {
  const session = await getSession();
  const accountHref = session ? roleHomePath(session.role) : '/login';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Vision <span className="text-blue-600 dark:text-cyan-400">Analytical</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {MAIN_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href={accountHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {session ? 'My Account' : 'Login'}
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Request Quote
          </Link>
        </div>

        <MobileNav isAuthenticated={Boolean(session)} accountHref={accountHref} />
      </div>
    </header>
  );
}
