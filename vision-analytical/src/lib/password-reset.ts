import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Reset-token rules, with no I/O so the tests can exercise them directly.
 *
 * The token in the email and the row in the database are deliberately not the
 * same value: only the hash is stored, so reading the table gives an attacker
 * nothing to use.
 */

/** Half an hour: long enough to find the email, short enough that a forwarded one goes stale. */
export const RESET_TOKEN_TTL_MINUTES = 30;

/** 32 bytes, url-safe. Long enough that guessing is not a strategy. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resetTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000);
}

export type ResetTokenState = 'valid' | 'expired' | 'used';

/** What a stored token is good for right now. */
export function classifyResetToken(
  record: { expiresAt: Date; usedAt: Date | null },
  now: Date = new Date(),
): ResetTokenState {
  if (record.usedAt) return 'used';
  if (record.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'valid';
}

/**
 * Constant-time comparison of two hashes.
 *
 * The lookup is by unique index so this is belt and braces, but a hash
 * comparison that short-circuits on the first differing byte is exactly the
 * kind of thing that turns into a timing oracle after a later refactor.
 */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Builds the link that goes in the email.
 *
 * `baseUrl` comes from configuration rather than the request, so a forged Host
 * header cannot turn a password reset into a link pointing at someone else's
 * server.
 */
export function buildResetUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
