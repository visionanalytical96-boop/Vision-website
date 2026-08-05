/** wa.me is WhatsApp's official click-to-chat deep-link domain. */
export function whatsappLink(message?: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(): string {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '';
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
