import 'server-only';
import { headers } from 'next/headers';

// The counters themselves are pure and live in their own module so the tests
// can reach them; this file adds the part that needs a request.
export {
  checkRateLimit,
  isWithinRateLimit,
  recordAttempt,
  clearRateLimit,
} from '@/lib/rate-limit-buckets';

/**
 * Best-effort client IP.
 *
 * Order matters. Behind a Cloudflare tunnel every request reaches nginx from
 * the cloudflared container, so X-Forwarded-For would make the whole internet
 * look like a single address sharing one budget — a handful of failed logins
 * anywhere would then lock out everybody. CF-Connecting-IP carries the real
 * caller and is set by Cloudflare itself, so it wins where present.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();

  const cloudflare = headerList.get('cf-connecting-ip');
  if (cloudflare) return cloudflare.trim();

  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return headerList.get('x-real-ip') ?? 'unknown';
}
