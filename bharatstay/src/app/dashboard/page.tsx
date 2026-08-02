import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUserPage } from '@/lib/auth/guards';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My bookings', robots: { index: false } };

export default async function DashboardPage() {
  const session = await requireUserPage();
  const bookings = await db.booking.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: { stay: { select: { name: true, city: true, slug: true } } },
  });

  const spent = bookings
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">Namaste, {session.name}</p>
        <h1 className="display mt-3 text-[clamp(28px,5vw,44px)]">Meri bookings</h1>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {(
            [
              ['Total bookings', String(bookings.length)],
              ['Confirmed kharch', INR(spent)],
              ['Phone', session.phone ?? '—'],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="card p-5">
              <div className="eyebrow">{label}</div>
              <div className="data mt-2 text-[24px] font-medium">{value}</div>
            </div>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="card mt-8 p-10 text-center">
            <p className="text-[16px] font-medium">Abhi tak koi booking nahi</p>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
              Badlapur–Karjat belt se shuru kijiye — ghar se ek ghanta.
            </p>
            <Link href="/stays" className="btn btn-primary mt-6">
              Stays dekho
            </Link>
          </div>
        ) : (
          <ul className="card mt-8 divide-y overflow-hidden">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/booking/${b.ref}`} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-[var(--mist-deep)]">
                  <div>
                    <div className="text-[15px] font-semibold">{b.stay?.name ?? 'Stay'}</div>
                    <div className="data mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
                      {b.ref} · {b.checkIn?.toLocaleDateString('en-IN')} → {b.checkOut?.toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="chip text-[11.5px]">{b.status}</span>
                    <span className="data text-[16px] font-medium">{INR(b.totalAmount)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
