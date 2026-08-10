/**
 * Falls back to the build-time env vars when Business Settings hasn't been
 * filled in yet, so a fresh deployment keeps working before an admin visits
 * the settings page.
 */

/** wa.me is WhatsApp's official click-to-chat deep-link domain. */
export function whatsappLink(number: string | null | undefined, message?: string): string {
  const resolved = number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const base = `https://wa.me/${resolved}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(phone: string | null | undefined): string {
  const resolved = phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || '';
  return `tel:${resolved.replace(/[^\d+]/g, '')}`;
}
