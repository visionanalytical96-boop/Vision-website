'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { getSiteSettings } from '@/lib/data/cms';
import { sendMail, passwordResetEmail, isMailConfigured } from '@/lib/mail';
import { isWithinRateLimit, recordAttempt, getClientIp } from '@/lib/rate-limit';
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  classifyResetToken,
  buildResetUrl,
  RESET_TOKEN_TTL_MINUTES,
} from '@/lib/password-reset';
import { z } from 'zod';

export interface ResetRequestState {
  sent?: boolean;
  error?: string;
  errors?: Record<string, string[] | undefined>;
}

export interface ResetPasswordState {
  error?: string;
  errors?: Record<string, string[] | undefined>;
}

const WINDOW_MS = 15 * 60 * 1000;

const emailSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }),
});

const newPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(8, { error: 'Use at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

/**
 * Sends the reset link.
 *
 * Always reports the same thing whether or not the address is registered.
 * Saying "no such account" turns this form into a way to find out who has one,
 * which is worth more to an attacker than the reset itself.
 */
export async function requestPasswordReset(
  _prevState: ResetRequestState | undefined,
  formData: FormData,
): Promise<ResetRequestState> {
  const validated = emailSchema.safeParse({ email: formData.get('email') });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const email = validated.data.email.toLowerCase().trim();
  const ip = await getClientIp();

  // Per address and per source: one stops someone hammering a single mailbox,
  // the other stops a list being worked through from one machine.
  if (
    !isWithinRateLimit(`reset:email:${email}`, 5, WINDOW_MS) ||
    !isWithinRateLimit(`reset:ip:${ip}`, 20, WINDOW_MS)
  ) {
    return { error: 'Too many requests. Please wait a few minutes and try again.' };
  }
  recordAttempt(`reset:email:${email}`, WINDOW_MS);
  recordAttempt(`reset:ip:${ip}`, WINDOW_MS);

  if (!isMailConfigured()) {
    return {
      error:
        'Email is not set up on this server yet, so the link cannot be sent. Please contact your administrator.',
    };
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });

  if (user && user.isActive) {
    const token = generateResetToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: resetTokenExpiry(),
        requestIp: ip,
      },
    });

    const settings = await getSiteSettings();
    // From configuration, never the request Host — a forged header would
    // otherwise send a working reset link pointing at an attacker's server.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? '';
    const mail = passwordResetEmail({
      companyName: settings?.companyName ?? 'Vision Analytical',
      resetUrl: buildResetUrl(baseUrl, token),
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    const result = await sendMail({ to: email, ...mail });
    if (!result.sent) {
      return { error: result.error ?? 'The email could not be sent.' };
    }
  }

  return { sent: true };
}

/** What the reset page should show for a given token, without spending it. */
export async function checkResetToken(token: string): Promise<'valid' | 'expired' | 'used' | 'unknown'> {
  if (!token) return 'unknown';

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, usedAt: true },
  });

  if (!record) return 'unknown';
  return classifyResetToken(record);
}

export async function resetPassword(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const validated = newPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { token, password } = validated.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) {
    return { error: 'That link is not valid. Request a new one.' };
  }

  const state = classifyResetToken(record);
  if (state === 'used') {
    return { error: 'That link has already been used. Request a new one.' };
  }
  if (state === 'expired') {
    return { error: 'That link has expired. Request a new one.' };
  }

  const passwordHash = await hashPassword(password);

  // One transaction: the password change and the token being spent have to
  // land together, or a failure halfway leaves a live link to an account whose
  // password just changed.
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Every other outstanding link for this account is now stale.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect('/login?reset=done');
}
