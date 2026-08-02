import { db } from '@/lib/db';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { stay: { select: { name: true } }, package: { select: { title: true } } },
  });

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Bookings</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        Site par jo bookings hui hain.
      </p>

      {bookings.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          Abhi tak koi booking nahi hui.
        </div>
      ) : (
        <div className="card scroll-x mt-6">
          <table className="w-full text-[13.5px]" style={{ minWidth: '760px' }}>
            <thead>
              <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
                {['Ref', 'Guest', 'Kya', 'Dates', 'Total', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="data px-4 py-3">{b.ref}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.guestName}</div>
                    <div className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>{b.guestPhone}</div>
                  </td>
                  <td className="px-4 py-3">{b.stay?.name ?? b.package?.title ?? '—'}</td>
                  <td className="data px-4 py-3 text-[12.5px]">
                    {b.checkIn ? b.checkIn.toLocaleDateString('en-IN') : '—'}
                    {b.checkOut ? ` → ${b.checkOut.toLocaleDateString('en-IN')}` : ''}
                  </td>
                  <td className="data px-4 py-3">{INR(b.totalAmount)}</td>
                  <td className="px-4 py-3"><span className="chip text-[11px]">{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
