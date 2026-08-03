import 'server-only';
import { hashSecret, verifySecret } from './hash';
import { db } from '@/lib/db';

/**
 * Six random digits from WebCrypto, which every runtime has — `node:crypto`
 * is only partly available on Cloudflare. Values at the top of the 32-bit
 * range are rejected rather than folded in, so no code is likelier than another.
 */
function sixDigitCode(): string {
  const limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0] ?? 0;
  } while (n >= limit);
  return String(n % 1_000_000).padStart(6, '0');
}

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
/** Stops one number from being used to pump SMS or to brute-force in bulk. */
const MAX_SENDS_PER_HOUR = 5;

export type SendResult =
  | { ok: true; expiresAt: Date; devCode?: string }
  | { ok: false; error: string };

export function normalisePhone(input: string): string {
  return input.replace(/\D/g, '').slice(-10);
}

export async function sendOtp(rawPhone: string): Promise<SendResult> {
  const phone = normalisePhone(rawPhone);
  if (phone.length !== 10) return { ok: false, error: '10 digit ka mobile number daaliye' };

  const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.otpChallenge.count({ where: { phone, createdAt: { gt: anHourAgo } } });
  if (recent >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: 'Bahut saare OTP bhej diye. Ek ghante baad dobara koshish karein.' };
  }

  const code = sixDigitCode();
  const expiresAt = new Date(Date.now() + TTL_MS);

  // Any earlier code for this number stops working the moment a new one is sent.
  await db.otpChallenge.updateMany({ where: { phone, consumed: false }, data: { consumed: true } });
  await db.otpChallenge.create({ data: { phone, codeHash: await hashSecret(code), expiresAt } });

  const delivery = await deliverSms(phone, code);
  if (delivery === 'failed') return { ok: false, error: 'OTP bhejne mein dikkat hui — dobara koshish karein' };
  // Only mock mode hands the code back for the UI to display. A real provider
  // never returns it to the browser, even when delivery fails.
  return { ok: true, expiresAt, devCode: delivery === 'mock' ? code : undefined };
}

export type VerifyResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

export async function verifyOtp(rawPhone: string, rawCode: string): Promise<VerifyResult> {
  const phone = normalisePhone(rawPhone);
  const code = rawCode.replace(/\D/g, '');

  const challenge = await db.otpChallenge.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!challenge) return { ok: false, error: 'Pehle OTP bhejiye' };

  if (challenge.expiresAt < new Date()) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumed: true } });
    return { ok: false, error: 'OTP expire ho gaya — naya OTP bhejiye' };
  }

  if (await verifySecret(challenge.codeHash, code)) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumed: true } });
    return { ok: true, phone };
  }

  const attempts = challenge.attempts + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  await db.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts, consumed: exhausted },
  });
  return {
    ok: false,
    error: exhausted
      ? '3 baar galat OTP — naya OTP bhejiye'
      : `Galat OTP — ${MAX_ATTEMPTS - attempts} koshish baaki`,
  };
}

async function deliverSms(phone: string, code: string): Promise<'sent' | 'mock' | 'failed'> {
  if (process.env.SMS_PROVIDER !== 'msg91' || !process.env.SMS_API_KEY) {
    console.info(`[sms:mock] OTP for ${phone} is ${code}`);
    return 'mock';
  }
  const url = new URL('https://api.msg91.com/api/v5/otp');
  url.searchParams.set('mobile', `91${phone}`);
  url.searchParams.set('otp', code);
  url.searchParams.set('sender', process.env.SMS_SENDER_ID ?? 'BHTSTY');
  const res = await fetch(url, { headers: { authkey: process.env.SMS_API_KEY } });
  if (!res.ok) {
    console.error('[sms:msg91] send failed', res.status, await res.text().catch(() => ''));
    return 'failed';
  }
  return 'sent';
}
