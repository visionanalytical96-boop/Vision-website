'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  createSession,
  deleteSession,
  createPendingTwoFactor,
  readPendingTwoFactor,
  clearPendingTwoFactor,
} from '@/lib/session';
import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyTotp } from '@/lib/totp';
import { roleHomePath } from '@/lib/roles';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
import {
  checkRateLimit,
  isWithinRateLimit,
  recordAttempt,
  clearRateLimit,
  getClientIp,
} from '@/lib/rate-limit';
import { Role } from '@/generated/prisma/client';

export interface AuthFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  /** Password accepted; the form should now ask for the authenticator code. */
  needsTwoFactor?: boolean;
}

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const RATE_LIMIT_ERROR = 'Too many attempts. Please wait a few minutes and try again.';
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function login(_prevState: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const ip = await getClientIp();
  const accountKey = `login:account:${email}`;
  const ipKey = `login:ip:${ip}`;

  // Only failed attempts count. Checking and spending in one step meant a
  // person signing in through the day exhausted their own budget and was then
  // told their correct password was wrong — the "sometimes it won't take my
  // password" report. Per-account blocks brute-forcing one target across many
  // IPs; per-IP blocks spraying many accounts from one source.
  if (
    !isWithinRateLimit(accountKey, 10, LOGIN_WINDOW_MS) ||
    !isWithinRateLimit(ipKey, 50, LOGIN_WINDOW_MS)
  ) {
    return { formError: RATE_LIMIT_ERROR };
  }

  const failed = () => {
    recordAttempt(accountKey, LOGIN_WINDOW_MS);
    recordAttempt(ipKey, LOGIN_WINDOW_MS);
    return { formError: GENERIC_LOGIN_ERROR };
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return failed();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return failed();
  }

  // Proving the password clears the record, so a few typos before a correct
  // entry never leave the account part-way to a lockout.
  clearRateLimit(accountKey);

  // Enrolled but unconfirmed accounts (secret set, never verified) sign in as
  // before — an abandoned setup must not lock somebody out of their own account.
  if (user.twoFactorEnabledAt && user.twoFactorSecret) {
    await createPendingTwoFactor(user.id);
    return { needsTwoFactor: true };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(safeRedirectPath(formData.get('next')) ?? roleHomePath(user.role));
}

const TWO_FACTOR_ERROR = 'That code is not right. Check your authenticator app and try again.';
const TWO_FACTOR_EXPIRED = 'That took too long. Please sign in again.';

/** SHA-256, matching how recovery codes are stored. */
function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

/**
 * Second step of sign-in: a code from the authenticator app, or one of the
 * recovery codes printed at enrolment.
 *
 * Rate limited on its own key. Without that, an attacker holding a stolen
 * password could sit on the code prompt and work through six digits.
 */
export async function verifyTwoFactor(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const userId = await readPendingTwoFactor();
  if (!userId) {
    return { formError: TWO_FACTOR_EXPIRED };
  }

  const key = `2fa:${userId}`;
  if (!isWithinRateLimit(key, 8, LOGIN_WINDOW_MS)) {
    return { formError: RATE_LIMIT_ERROR };
  }

  const submitted = String(formData.get('code') ?? '').trim();
  if (!submitted) {
    return { errors: { code: ['Enter the 6-digit code.'] } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.twoFactorSecret || !user.twoFactorEnabledAt) {
    await clearPendingTwoFactor();
    return { formError: TWO_FACTOR_EXPIRED };
  }

  let accepted = verifyTotp(user.twoFactorSecret, submitted);

  // Recovery codes are single use: the one that worked is removed before the
  // session is issued, so the same slip of paper cannot open a second session.
  if (!accepted && user.twoFactorRecoveryHashes.length > 0) {
    const candidate = Buffer.from(hashRecoveryCode(submitted));
    const match = user.twoFactorRecoveryHashes.find((stored) => {
      const storedBuffer = Buffer.from(stored);
      return storedBuffer.length === candidate.length && timingSafeEqual(storedBuffer, candidate);
    });
    if (match) {
      accepted = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorRecoveryHashes: user.twoFactorRecoveryHashes.filter((h) => h !== match) },
      });
    }
  }

  if (!accepted) {
    recordAttempt(key, LOGIN_WINDOW_MS);
    return { formError: TWO_FACTOR_ERROR };
  }

  clearRateLimit(key);
  await clearPendingTwoFactor();
  await createSession({ userId: user.id, role: user.role });
  redirect(safeRedirectPath(formData.get('next')) ?? roleHomePath(user.role));
}

export async function registerCustomer(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const validated = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: String(formData.get('phone') ?? ''),
    companyName: String(formData.get('companyName') ?? ''),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`register:ip:${ip}`, 10, LOGIN_WINDOW_MS)) {
    return { formError: RATE_LIMIT_ERROR };
  }

  const { name, email, phone, companyName, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      companyName: companyName || null,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  await createSession({ userId: user.id, role: user.role });
  redirect(roleHomePath(user.role));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
