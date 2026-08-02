import { db } from '@/lib/db';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      bookings: { select: { totalAmount: true, status: true } },
    },
  });

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Customers</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Jo log OTP se login karte hain woh yahan aate hain. Yeh asli customer data hai — ise sambhaal kar rakhein
        aur bina zaroorat kisi ke saath share na karein.
      </p>

      {customers.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          Abhi tak koi customer login nahi hua.
        </div>
      ) : (
        <div className="card scroll-x mt-6">
          <table className="w-full text-[13.5px]" style={{ minWidth: '680px' }}>
            <thead>
              <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
                {['Naam', 'Phone', 'Bookings', 'Kitna kharch', 'Joined', 'Last login'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => {
                const paid = c.bookings
                  .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
                  .reduce((sum, b) => sum + b.totalAmount, 0);
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="data px-4 py-3">{c.phone ?? '—'}</td>
                    <td className="data px-4 py-3">{c.bookings.length}</td>
                    <td className="data px-4 py-3">{INR(paid)}</td>
                    <td className="data px-4 py-3 text-[12.5px]">{c.createdAt.toLocaleDateString('en-IN')}</td>
                    <td className="data px-4 py-3 text-[12.5px]">
                      {c.lastLoginAt ? c.lastLoginAt.toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
