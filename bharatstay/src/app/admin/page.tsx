import Link from 'next/link';
import { db } from '@/lib/db';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [stays, restaurants, pending, bookings, customers, revenue, recentApps, recentLogs] = await Promise.all([
    db.stay.count({ where: { visible: true } }),
    db.restaurant.count({ where: { visible: true } }),
    db.partnerApplication.count({ where: { status: { in: ['PENDING', 'NEEDS_INFO'] } } }),
    db.booking.count(),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    db.partnerApplication.findMany({
      where: { status: { in: ['PENDING', 'NEEDS_INFO'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);

  const stats: [string, string, string?][] = [
    ['Live stays', String(stays), '/admin/stays'],
    ['Live restaurants', String(restaurants), '/admin/restaurants'],
    ['Applications waiting', String(pending), '/admin/applications'],
    ['Bookings', String(bookings), '/admin/bookings'],
    ['Customers', String(customers), '/admin/customers'],
    ['Confirmed revenue', INR(revenue._sum.totalAmount ?? 0)],
  ];

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Overview</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        Site par abhi kya chal raha hai.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value, href]) => {
          const inner = (
            <>
              <div className="eyebrow">{label}</div>
              <div className="data mt-2 text-[30px] font-medium">{value}</div>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="card card-hover block p-5">
              {inner}
            </Link>
          ) : (
            <div key={label} className="card p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold">Review ke liye applications</h2>
            <Link href="/admin/applications" className="text-[13px] font-semibold" style={{ color: 'var(--laterite)' }}>
              Sab dekho →
            </Link>
          </div>
          {recentApps.length === 0 ? (
            <div className="card p-6 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
              Abhi koi application pending nahi hai. Naye owners ko{' '}
              <span className="data">/partner/apply</span> ka link bhejiye.
            </div>
          ) : (
            <ul className="card divide-y overflow-hidden">
              {recentApps.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/applications#${a.id}`} className="block px-5 py-3 hover:bg-[var(--mist-deep)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14.5px] font-medium">{a.businessName}</span>
                      <span className="chip text-[11px]">{a.status}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
                      {a.kind === 'STAY' ? 'Stay' : 'Restaurant'} · {a.city} · {a.createdAt.toLocaleDateString('en-IN')}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[17px] font-semibold">Recent activity</h2>
          {recentLogs.length === 0 ? (
            <div className="card p-6 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
              Abhi tak koi activity nahi.
            </div>
          ) : (
            <ul className="card divide-y overflow-hidden">
              {recentLogs.map((l) => (
                <li key={l.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="data text-[12.5px]" style={{ color: 'var(--monsoon)' }}>
                      {l.action}
                    </span>
                    <span className="data text-[11.5px]" style={{ color: 'var(--basalt-soft)' }}>
                      {l.createdAt.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13.5px]">{l.detail ?? l.entity}</div>
                  <div className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {l.actorName}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
