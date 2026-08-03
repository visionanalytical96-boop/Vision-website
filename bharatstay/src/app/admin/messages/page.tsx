import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages', robots: { index: false } };

export default async function AdminMessagesPage() {
  await requireAdminPage();

  const [messages, subscribers, subscriberCount] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    db.newsletterSignup.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    db.newsletterSignup.count(),
  ]);

  return (
    <div>
      <h1 className="display text-[clamp(24px,4vw,34px)]">Messages</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        Contact form se aaye messages aur newsletter ke subscribers. Jawab apne email se dijiye — site
        se mail nahi jaata.
      </p>

      <section className="mt-8">
        <h2 className="text-[17px] font-semibold">Contact messages ({messages.length})</h2>
        {messages.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
            Abhi koi message nahi aaya.
          </p>
        ) : (
          <ul className="card mt-4 divide-y overflow-hidden">
            {messages.map((m) => (
              <li key={m.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[15px] font-semibold">{m.subject}</span>
                  <span className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {m.createdAt.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="data mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
                  {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                  {m.phone ? ` · ${m.phone}` : ''}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[14px]" style={{ color: 'var(--basalt)' }}>
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[17px] font-semibold">Newsletter ({subscriberCount})</h2>
        {subscribers.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
            Abhi koi subscriber nahi.
          </p>
        ) : (
          <>
            <ul className="card mt-4 divide-y overflow-hidden text-[14px]">
              {subscribers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                  <span className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {s.createdAt.toLocaleDateString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
            {/* Copy-paste beats a CSV download when the list is this small. */}
            <details className="mt-4">
              <summary className="cursor-pointer text-[13.5px]">Saare emails ek line mein (copy karne ke liye)</summary>
              <textarea
                readOnly
                rows={3}
                className="mt-3 w-full rounded-lg p-3 text-[12.5px]"
                style={{ background: 'var(--mist-deep)', border: '1px solid var(--line)' }}
                value={subscribers.map((s) => s.email).join(', ')}
              />
            </details>
          </>
        )}
      </section>
    </div>
  );
}
