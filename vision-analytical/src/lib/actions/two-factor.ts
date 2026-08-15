'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/dal';
import { verifyPassword } from '@/lib/password';
import {
  generateSecret,
  verifyTotp,
  generateRecoveryCodes,
  buildOtpauthUri,
  formatSecretForDisplay,
} from '@/lib/totp';

export interface TwoFactorState {
  error?: string;
  /** Shown once, at enrolment. Never retrievable afterwards. */
  secret?: string;
  secretPretty?: string;
  otpauthUri?: string;
  recoveryCodes?: string[];
  enabled?: boolean;
}

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

/**
 * Step one: mint a secret and show it.
 *
 * Stored immediately but without `twoFactorEnabledAt`, so login is unaffected
 * until a code proves the app actually holds the same secret. Enrolling and
 * walking away must never lock somebody out of their own account.
 */
export async function beginTwoFactorSetup(): Promise<TwoFactorState> {
  const user = await requireUser();

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabledAt: null },
  });

  return {
    secret,
    secretPretty: formatSecretForDisplay(secret),
    otpauthUri: buildOtpauthUri({
      secret,
      account: user.email,
      issuer: 'Vision Analytical',
    }),
  };
}

/**
 * Step two: a correct code turns it on and returns the recovery codes.
 *
 * The codes are shown here and nowhere else — only their hashes are kept, so
 * there is no later screen that can print them again.
 */
export async function confirmTwoFactorSetup(
  _prevState: TwoFactorState | undefined,
  formData: FormData,
): Promise<TwoFactorState> {
  const user = await requireUser();

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorSecret: true },
  });
  if (!record?.twoFactorSecret) {
    return { error: 'Start the setup again — no pending secret was found.' };
  }

  const code = String(formData.get('code') ?? '').trim();
  if (!verifyTotp(record.twoFactorSecret, code)) {
    return {
      error: 'That code is not right. Check your phone’s clock is set automatically and try again.',
      secret: record.twoFactorSecret,
      secretPretty: formatSecretForDisplay(record.twoFactorSecret),
      otpauthUri: buildOtpauthUri({
        secret: record.twoFactorSecret,
        account: user.email,
        issuer: 'Vision Analytical',
      }),
    };
  }

  const recoveryCodes = generateRecoveryCodes(10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorRecoveryHashes: recoveryCodes.map(hashRecoveryCode),
    },
  });

  revalidatePath('/portal/profile');
  return { enabled: true, recoveryCodes };
}

/**
 * Turning it off asks for the password again.
 *
 * Otherwise an unattended open session is enough to strip the second factor,
 * which would make it decorative.
 */
export async function disableTwoFactor(
  _prevState: TwoFactorState | undefined,
  formData: FormData,
): Promise<TwoFactorState> {
  const user = await requireUser();

  const password = String(formData.get('password') ?? '');
  if (!password) {
    return { error: 'Enter your password to turn this off.' };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    return { error: 'That password is not right.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorRecoveryHashes: [],
    },
  });

  revalidatePath('/portal/profile');
  return { enabled: false };
}
