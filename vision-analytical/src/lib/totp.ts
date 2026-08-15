import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238), as Google Authenticator speaks them.
 *
 * Written here rather than pulled from a package: the algorithm is a HMAC and
 * a truncation, the spec ships its own test vectors (see tests/totp.test.ts),
 * and a login path is the last place worth adding a dependency whose contents
 * nobody on this project will ever read.
 *
 * No I/O, so the tests exercise it directly.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Google Authenticator reads secrets as base32, unpadded. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[=\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Not a base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 20 random bytes, the length RFC 4226 recommends for HMAC-SHA1. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export interface TotpOptions {
  digits?: number;
  periodSeconds?: number;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/**
 * The code for one counter value. Authenticator apps use counter =
 * floor(unixSeconds / 30).
 */
export function hotp(secret: Buffer, counter: number, options: TotpOptions = {}): string {
  const { digits = 6, algorithm = 'sha1' } = options;

  // 8-byte big-endian counter. Written in two halves because a JS bitwise op
  // truncates to 32 bits, and the counter outgrows that in 2038.
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac(algorithm, secret).update(buffer).digest();

  // Dynamic truncation, RFC 4226 section 5.3.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totp(secret: string, atMs: number = Date.now(), options: TotpOptions = {}): string {
  const { periodSeconds = 30 } = options;
  const counter = Math.floor(atMs / 1000 / periodSeconds);
  return hotp(base32Decode(secret), counter, options);
}

/**
 * Checks a submitted code, allowing one step either side.
 *
 * The window exists because phone clocks drift and because a code typed at
 * :29 arrives at :31. One step each way is the usual compromise: it forgives
 * ~30 seconds of skew without meaningfully widening what an attacker can
 * guess. Comparison is constant-time so a wrong code cannot be narrowed down
 * by how long the check took.
 */
export function verifyTotp(
  secret: string,
  submitted: string,
  atMs: number = Date.now(),
  options: TotpOptions & { window?: number } = {},
): boolean {
  const { window = 1, periodSeconds = 30, digits = 6 } = options;

  const cleaned = submitted.replace(/\s/g, '');
  if (!/^\d+$/.test(cleaned) || cleaned.length !== digits) return false;

  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / periodSeconds);
  const submittedBuffer = Buffer.from(cleaned);

  let matched = false;
  for (let drift = -window; drift <= window; drift += 1) {
    const candidate = Buffer.from(hotp(key, counter + drift, options));
    if (
      candidate.length === submittedBuffer.length &&
      timingSafeEqual(candidate, submittedBuffer)
    ) {
      // No early return: leaving the loop on the first hit would leak which
      // step matched through timing.
      matched = true;
    }
  }
  return matched;
}

/**
 * The otpauth:// URI an authenticator app imports.
 *
 * `issuer` shows as the account's heading in the app, so it is what tells
 * somebody with several codes which one is this site.
 */
export function buildOtpauthUri(params: {
  secret: string;
  account: string;
  issuer: string;
  digits?: number;
  periodSeconds?: number;
}): string {
  const { secret, account, issuer, digits = 6, periodSeconds = 30 } = params;
  const label = encodeURIComponent(`${issuer}:${account}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(periodSeconds),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

/** Groups of four, so a key read off the screen can be typed without losing your place. */
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Single-use codes for when the phone is lost. Without these, a broken phone
 * means an account nobody can reach, which is how two-factor turns into a
 * support problem instead of a security feature.
 */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });
}
