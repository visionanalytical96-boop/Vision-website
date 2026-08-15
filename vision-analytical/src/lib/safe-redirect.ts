/**
 * Only accepts same-origin relative paths (e.g. "/portal/orders"). Rejects
 * protocol-relative ("//evil.com") and absolute URLs to prevent open redirects,
 * since this value can arrive directly in a POST body, not just via proxy.ts.
 */
export function safeRedirectPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
