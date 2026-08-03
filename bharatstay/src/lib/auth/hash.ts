import 'server-only';

/**
 * Password and OTP hashing built on WebCrypto alone.
 *
 * Cloudflare's runtime cannot load native addons, which rules out argon2. What
 * is left is PBKDF2, and PBKDF2 is not memory-hard — the iteration count is the
 * entire defence, so it is set high deliberately and stored inside the hash.
 *
 * Format: `pbkdf2-sha256$<iterations>$<salt-b64>$<hash-b64>`. Self-describing,
 * so the cost can be raised later without invalidating hashes already stored.
 */

/** OWASP's floor for PBKDF2-HMAC-SHA256. Costs real CPU — that is the point. */
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const PREFIX = 'pbkdf2-sha256';

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

async function derive(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(secret, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

/** Constant-time compare — a length-dependent early return leaks the prefix. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifySecret(stored: string, secret: string): Promise<boolean> {
  const [prefix, iterations, salt, hash] = stored.split('$');
  if (prefix !== PREFIX || !iterations || !salt || !hash) return false;

  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5_000_000) return false;

  try {
    return sameBytes(await derive(secret, unb64(salt), rounds), unb64(hash));
  } catch {
    return false;
  }
}

/**
 * Hashes made by the old argon2 build cannot be checked here — there is no
 * argon2 in this runtime. They verify as false rather than crashing; re-running
 * the seed rewrites the admin password in the new format.
 */
export const isLegacyHash = (stored: string) => stored.startsWith('$argon2');

/**
 * A dummy hash to verify against when the account does not exist, so a wrong
 * email costs the same time as a wrong password.
 */
export const DUMMY_HASH = `${PREFIX}$${ITERATIONS}$${b64(new Uint8Array(SALT_BYTES))}$${b64(new Uint8Array(KEY_BITS / 8))}`;
