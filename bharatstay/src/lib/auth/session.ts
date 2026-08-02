import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@prisma/client';

const COOKIE = 'bs_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Session = {
  userId: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
};

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  // Failing loudly beats silently signing every session with a constant.
  if (!value || value.length < 16) {
    throw new Error('JWT_SECRET is missing or too short — set it to a random 32+ character string.');
  }
  return new TextEncoder().encode(value);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') return null;
    return {
      userId: payload.userId,
      role: payload.role as UserRole,
      name: typeof payload.name === 'string' ? payload.name : 'Guest',
      email: typeof payload.email === 'string' ? payload.email : undefined,
      phone: typeof payload.phone === 'string' ? payload.phone : undefined,
    };
  } catch {
    // Expired or tampered token — treat as logged out rather than erroring.
    return null;
  }
}

export function destroySession(): void {
  cookies().delete(COOKIE);
}
