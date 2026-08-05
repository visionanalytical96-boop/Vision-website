import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { roleHomePath } from '@/lib/roles';
import { Role } from '@/generated/prisma/client';

// Optimistic, cookie-only checks: fast redirects for the common case. The
// real authorization check lives in the DAL (src/lib/dal.ts), which every
// protected Server Component/Action/Route Handler also calls directly.
const ROLE_SECTIONS: ReadonlyArray<{ prefix: string; role: Role }> = [
  { prefix: '/admin', role: Role.ADMIN },
  { prefix: '/engineer', role: Role.ENGINEER },
  { prefix: '/portal', role: Role.CUSTOMER },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  const section = ROLE_SECTIONS.find(({ prefix }) => pathname.startsWith(prefix));
  if (section) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== section.role) {
      return NextResponse.redirect(new URL(roleHomePath(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (session && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/engineer/:path*', '/portal/:path*', '/login', '/register'],
};
