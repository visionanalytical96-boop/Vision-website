import Link from 'next/link';
import { getNavLinks, getSettings } from '@/lib/site';
import { getSession } from '@/lib/auth/session';
import { LogoutButton } from './LogoutButton';

export async function SiteHeader() {
  const [links, settings, session] = await Promise.all([getNavLinks(), getSettings(), getSession()]);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ background: 'var(--header-bg)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="display text-[21px] shrink-0" style={{ color: 'var(--ink)' }}>
          {settings.brandA}
          <span style={{ color: 'var(--laterite)' }}>{settings.brandB}</span>
        </Link>

        <nav className="scroll-x ml-2 hidden flex-1 md:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-[14px] font-medium transition-colors hover:bg-[var(--mist-deep)]"
                  style={{ color: 'var(--basalt)' }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/partner/apply" className="btn btn-secondary btn-sm hidden sm:inline-flex">
            List your property
          </Link>
          {session ? (
            <>
              <Link
                href={session.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="btn btn-ink btn-sm"
              >
                {session.role === 'ADMIN' ? 'Admin' : 'My bookings'}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav sits on its own row so the brand and actions never wrap. */}
      <div className="scroll-x border-t px-5 py-2 md:hidden">
        <ul className="flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block whitespace-nowrap rounded-lg px-3 py-1.5 text-[13.5px] font-medium"
                style={{ color: 'var(--basalt)' }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
