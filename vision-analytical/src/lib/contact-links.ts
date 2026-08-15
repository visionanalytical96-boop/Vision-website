/**
 * Falls back to the build-time env vars when Business Settings hasn't been
 * filled in yet, so a fresh deployment keeps working before an admin visits
 * the settings page.
 */

/**
 * The resolved values themselves, for anywhere that displays a number rather
 * than just linking one. Without these a deployment configured only through
 * env vars would show a working "Call Now" button next to a contact panel
 * claiming there is no phone number.
 */
export function resolvePhone(phone: string | null | undefined): string | null {
  return phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || null;
}

export function resolveWhatsappNumber(number: string | null | undefined): string | null {
  return number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null;
}

/** wa.me is WhatsApp's official click-to-chat deep-link domain. */
export function whatsappLink(number: string | null | undefined, message?: string): string {
  const base = `https://wa.me/${resolveWhatsappNumber(number) ?? ''}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(phone: string | null | undefined): string {
  return `tel:${(resolvePhone(phone) ?? '').replace(/[^\d+]/g, '')}`;
}
