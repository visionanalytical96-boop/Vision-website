import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
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
// Decided per request from X-Forwarded-Proto, which the reverse proxy sets, so
// one image works on http and https alike. Deliberately NOT keyed off
// NEXT_PUBLIC_SITE_URL: Next inlines NEXT_PUBLIC_* at build time, so that value
// freezes into the image and editing it at runtime silently does nothing.
//
// Fallback when no proxy header is present: secure in production. That fails
// closed - a direct-to-node deployment over https keeps the flag, and the only
// way to lose it is an explicit http X-Forwarded-Proto from your own proxy.
async function shouldUseSecureCookie(): Promise<boolean> {
  const forwardedProto = (await headers()).get('x-forwarded-proto');
  if (forwardedProto) {
    // May be a comma-separated chain ("https,http") - the client-facing hop is first.
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return process.env.NODE_ENV === 'production';
}

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
  const secure = await shouldUseSecureCookie();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
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
