import { db } from '@/lib/db';
import { getSettings } from '@/lib/site';
import { upiConfigured } from '@/lib/upi';
import { INR } from '@/lib/format';
import { PaymentActions } from '@/components/admin/PaymentActions';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const [settings, pending, recent] = await Promise.all([
    getSettings(),
    db.booking.findMany({
      where: { status: 'AWAITING_VERIFICATION' },
      orderBy: { upiSubmittedAt: 'asc' },
      include: { stay: { select: { name: true } } },
    }),
    db.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, upiRef: { not: null } },
      orderBy: { upiVerifiedAt: 'desc' },
      take: 25,
      include: { stay: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Payments</h1>
      <p className="mt-2 max-w-[64ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Paisa seedha aapke UPI par aata hai, isliye site ko apne aap pata nahi chalta. Customer UTR daalta hai,
        aap apne bank statement se milaan karke yahan confirm karte ho.
      </p>

      {!upiConfigured(settings) && (
        <div
          className="mt-6 rounded-xl px-5 py-4 text-[14px]"
          style={{ background: 'color-mix(in srgb, var(--laterite) 14%, transparent)' }}
        >
          <strong>UPI ID set nahi hai.</strong> Jab tak <span className="data">Site settings</span> mein apna UPI
          ID nahi daaloge, customers pay nahi kar payenge.
        </div>
      )}

      <h2 className="mt-9 text-[18px] font-semibold">Verify karna baaki ({pending.length})</h2>

      {pending.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          Abhi koi payment verify karne ko nahi hai.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {pending.map((b) => (
            <article key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="data text-[15px] font-medium">{b.ref}</span>
                    <span className="chip text-[11px]">{b.stay?.name ?? 'Booking'}</span>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
                    <Row label="Guest" value={`${b.guestName} · ${b.guestPhone}`} />
                    <Row label="Email" value={b.guestEmail} />
                    <Row label="Dates" value={`${b.checkIn?.toLocaleDateString('en-IN') ?? '—'} → ${b.checkOut?.toLocaleDateString('en-IN') ?? '—'}`} />
                    <Row label="Bheja gaya" value={b.upiSubmittedAt?.toLocaleString('en-IN') ?? '—'} />
                  </dl>
                </div>

                <div className="text-right">
                  <div className="data text-[24px] font-medium">{INR(b.totalAmount)}</div>
                  <div className="eyebrow mt-2">UTR</div>
                  <div className="data text-[16px] tracking-[0.1em]">{b.upiRef}</div>
                </div>
              </div>

              <p className="mt-4 rounded-lg px-4 py-2.5 text-[12.5px]" style={{ background: 'var(--mist-deep)' }}>
                Bank ya UPI app kholiye, is UTR se {INR(b.totalAmount)} ka credit dhoondhiye. Mil jaye tabhi
                confirm kijiye.
              </p>

              <div className="mt-4">
                <PaymentActions id={b.id} />
              </div>
            </article>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="mt-10 text-[18px] font-semibold">Verify ho chuke</h2>
          <div className="card scroll-x mt-4">
            <table className="w-full text-[13.5px]" style={{ minWidth: '680px' }}>
              <thead>
                <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
                  {['Ref', 'Guest', 'UTR', 'Amount', 'Verify kab'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td className="data px-4 py-3">{b.ref}</td>
                    <td className="px-4 py-3">{b.guestName}</td>
                    <td className="data px-4 py-3">{b.upiRef}</td>
                    <td className="data px-4 py-3">{INR(b.totalAmount)}</td>
                    <td className="data px-4 py-3 text-[12.5px]">
                      {b.upiVerifiedAt?.toLocaleString('en-IN') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0" style={{ color: 'var(--basalt-soft)', minWidth: '82px' }}>{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
