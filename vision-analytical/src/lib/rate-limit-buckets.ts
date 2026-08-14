/**
 * Fixed-window counters, with no I/O of any kind.
 *
 * Split out of rate-limit.ts because that module is `server-only` — it reads
 * request headers — and this half is pure arithmetic that the tests need to
 * exercise directly. The login lockout bug lived in here, so it is worth being
 * able to test it without standing up a request.
 *
 * In-memory, which suits the single-instance deployment this app ships with
 * (see deploy/docker-compose.yml). A horizontally scaled deployment would need
 * a shared store instead, since each instance would keep its own counters.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Keeps the map from growing without bound on a long-running process. Not
// precise timing, just periodic sweeping of expired entries.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

/** Checks and spends an attempt in one step. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * True while the key is under its limit, without spending an attempt.
 *
 * Login needs this: counting every attempt meant somebody signing in ten times
 * in a morning locked themselves out with the correct password, which from the
 * outside is indistinguishable from the password being wrong. Only failures
 * should count, so the check and the increment have to be separable.
 */
export function isWithinRateLimit(key: string, limit: number, windowMs: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < Date.now()) return true;
  return bucket.count < limit;
}

/** Spends one attempt against the key. */
export function recordAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
}

/** Forgets a key's attempts — called once the caller has proved who they are. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
