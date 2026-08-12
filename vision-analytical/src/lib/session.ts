import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Role } from '@/generated/prisma/client';

export interface SessionPayload {
  userId: string;
  role: Role;
  // Index signature required by jose's JWTPayload constraint.
  [claim: string]: unknown;
}

const sessionPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(Role),
});

export const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// A `Secure` cookie is only stored by the browser on a secure context. https
// qualifies, and so does localhost, but a plain-http LAN address such as
// http://192.168.1.5:8088 does not - the browser silently drops the cookie, so
// login looks like it worked (the redirect happens) and then every following
// request arrives unauthenticated and bounces back to /login.
//
// Deliberately fails closed: stays secure in production unless NEXT_PUBLIC_SITE_URL
// explicitly says the site is served over plain http. An unset or https URL
// keeps the flag on.
const servedOverPlainHttp = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('http://');
const useSecureCookie = process.env.NODE_ENV === 'production' && !servedOverPlainHttp;

// One line at startup, because the failure it guards against is otherwise
// invisible: with Secure on, a browser on a plain-http origin silently drops
// the cookie, so login "succeeds" and every later request is anonymous.
console.info(
  `[session] cookie Secure=${useSecureCookie} (NODE_ENV=${process.env.NODE_ENV ?? 'unset'}, ` +
    `NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL ?? 'unset'})` +
    (useSecureCookie ? ' - browsers will only store this over https or on localhost' : ''),
);

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verifies a raw session token (e.g. read via `req.cookies` in proxy.ts). */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const parsed = sessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

/** Reads and verifies the session cookie from the current request (Server Components/Actions). */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
