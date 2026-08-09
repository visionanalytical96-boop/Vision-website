import 'server-only';
import { headers } from 'next/headers';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Prevents unbounded growth on a long-running process. Not cryptographically
// precise timing, just periodic sweeping of expired entries.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Fixed-window in-memory rate limiter. Fine for the single-instance
 * deployment this app ships with (see deploy/docker-compose.yml) - a
 * horizontally-scaled deployment would need a shared store (e.g. Redis)
 * instead, since each instance would otherwise keep its own counters.
 */
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

/** Best-effort client IP from the proxy chain (nginx sets X-Forwarded-For in production). */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return headerList.get('x-real-ip') ?? 'unknown';
}
