import 'server-only';
import QRCode from 'qrcode';

/**
 * Direct UPI collection — no payment gateway, no merchant account, no fees.
 * The customer's own app (GPay, PhonePe, Paytm, any bank app) sends money
 * straight to the owner's UPI ID.
 *
 * The trade-off is real and the UI says so: nothing tells this site that money
 * arrived. The customer submits the UTR from their app and an admin checks it
 * against the bank statement before the booking is confirmed. Treating an
 * unverified UTR as payment would be trusting the customer's word for money.
 */

/** `name@bank` — deliberately strict, since a typo here sends money nowhere. */
const VPA = /^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/;

export const isValidUpiId = (id: string) => VPA.test(id.trim());

/** A UTR is 12 digits; some banks show it with an RRN prefix. */
export const isValidUtr = (ref: string) => /^\d{12}$/.test(ref.replace(/\D/g, ''));

export function upiPayLink({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

/** Data-URI PNG of the pay link, so the page needs no external image host. */
export async function upiQrDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#10261f', light: '#ffffff' },
  });
}

/** True once the owner has actually set a UPI ID in the admin panel. */
export const upiConfigured = (settings: Record<string, string>) =>
  isValidUpiId(settings.upiId ?? '');
