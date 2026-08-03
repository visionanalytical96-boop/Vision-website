import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUserPage } from '@/lib/auth/guards';
import { RiderConsole } from '@/components/RiderConsole';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rider console', robots: { index: false } };

export default async function RiderPage() {
  const session = await requireUserPage('/rider');
  const rider = session.phone ? await db.rider.findUnique({ where: { phone: session.phone } }) : null;

  if (!rider) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <h1 className="display text-[30px]">Rider account nahi mila</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          Jis number se aap login hain ({session.phone ?? '—'}) uske naam koi rider registration nahi hai. Pehle
          register kijiye — usi number se.
        </p>
        <Link href="/rider/apply" className="btn btn-primary mt-6">
          Rider banne ke liye register karo
        </Link>
      </main>
    );
  }

  if (rider.status !== 'APPROVED') {
    const message: Record<string, string> = {
      PENDING: 'Admin aapki gaadi aur licence verify kar rahe hain. Approve hote hi yeh page khul jayega.',
      REJECTED: rider.adminNote || 'Admin ne yeh registration abhi accept nahi kiya.',
      SUSPENDED: rider.adminNote || 'Aapka account filhaal roka gaya hai. Admin se baat kijiye.',
    };
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <span className="chip">{rider.status}</span>
        <h1 className="display mt-4 text-[30px]">{rider.name}</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          {message[rider.status]}
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          Home
        </Link>
      </main>
    );
  }

  return <RiderConsole name={rider.name} vehicleNumber={rider.vehicleNumber} />;
}
