import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext turns the Next.js build into a Cloudflare Worker.
 *
 * No incremental cache is configured: every page in this app is
 * `dynamic = 'force-dynamic'` because the admin panel can change prices,
 * listings and the theme at any moment, and a cached page would show a
 * stale price after an edit. Caching can be layered on later per route.
 */
export default defineCloudflareConfig();
