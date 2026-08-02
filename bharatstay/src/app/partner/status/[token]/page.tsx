import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Rail } from '@/components/Rail';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Application status', robots: { index: false } };

const FLOW = ['Bheja gaya', 'Review mein', 'Faisla'];

export default async function PartnerStatusPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { new?: string };
}) {
  const app = await db.partnerApplication.findUnique({
    where: { publicToken: params.token },
    include: { photos: { select: { id: true }, orderBy: { sort: 'asc' } } },
  });
  if (!app) notFound();

  const decided = app.status === 'APPROVED' || app.status === 'REJECTED';
  const stops = [
    { label: FLOW[0]!, note: app.createdAt.toLocaleDateString('en-IN'), done: true },
    { label: FLOW[1]!, note: app.status === 'NEEDS_INFO' ? 'info chahiye' : 'admin ke paas', done: true, current: !decided },
    { label: FLOW[2]!, note: decided ? app.status.toLowerCase() : 'pending', current: decided },
  ];

  const tone: Record<string, { bg: string; fg: string; title: string; body: string }> = {
    PENDING: {
      bg: 'color-mix(in srgb, var(--turmeric) 16%, transparent)',
      fg: 'var(--ink)',
      title: 'Review chal raha hai',
      body: 'Admin aapki application dekh rahe hain. Faisla hote hi is page par dikh jayega.',
    },
    NEEDS_INFO: {
      bg: 'color-mix(in srgb, var(--turmeric) 22%, transparent)',
      fg: 'var(--ink)',
      title: 'Thodi aur jaankari chahiye',
      body: app.adminNote || 'Admin ne kuch aur details maangi hain.',
    },
    APPROVED: {
      bg: 'color-mix(in srgb, var(--monsoon) 18%, transparent)',
      fg: 'var(--ink)',
      title: 'Approve ho gaya',
      body: 'Aapki listing ab site par live hai.',
    },
    REJECTED: {
      bg: 'color-mix(in srgb, var(--laterite) 14%, transparent)',
      fg: 'var(--ink)',
      title: 'Abhi list nahi kar paye',
      body: app.adminNote || 'Admin ne yeh application abhi accept nahi ki.',
    },
  };
  const state = tone[app.status]!;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        {searchParams.new && (
          <div
            className="mb-8 rounded-xl px-5 py-4 text-[14px]"
            style={{ background: 'color-mix(in srgb, var(--monsoon) 16%, transparent)' }}
          >
            <strong>Application bhej di gayi.</strong> Is page ka link save kar lijiye — isi se aap status dekh
            sakte hain.
          </div>
        )}

        <p className="eyebrow">Application · {app.kind === 'STAY' ? 'Stay' : 'Restaurant'}</p>
        <h1 className="display mt-3 text-[clamp(28px,5vw,44px)]">{app.businessName}</h1>
        <p className="mt-2 text-[14.5px]" style={{ color: 'var(--basalt)' }}>
          {app.area} · {app.city}
        </p>

        <div className="card mt-8 p-5 sm:p-6">
          <Rail stops={stops} />
        </div>

        <div className="mt-6 rounded-xl px-5 py-4" style={{ background: state.bg, color: state.fg }}>
          <div className="text-[15px] font-semibold">{state.title}</div>
          <p className="mt-1 text-[14px] leading-relaxed">{state.body}</p>
        </div>

        <div className="card mt-6 divide-y overflow-hidden">
          {(
            [
              ['Owner', app.ownerName],
              ['Email', app.email],
              ['Address', app.address],
              app.kind === 'STAY'
                ? ['Per night', app.price ? INR(app.price) : '—']
                : ['Cost for two', app.costForTwo ? INR(app.costForTwo) : '—'],
              ['Photos', String(app.photos.length)],
              ['Bheja gaya', app.createdAt.toLocaleString('en-IN')],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-5 py-3 text-[14px]">
              <span style={{ color: 'var(--basalt-soft)' }}>{k}</span>
              <span className="break-words">{v}</span>
            </div>
          ))}
        </div>

        {app.photos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {app.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={`/api/photos/${p.id}`}
                alt=""
                className="card aspect-square w-full object-cover"
              />
            ))}
          </div>
        )}

        <p className="mt-10 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          Koi sawaal ho to{' '}
          <Link href="/partner/apply" className="font-semibold" style={{ color: 'var(--laterite)' }}>
            nayi application
          </Link>{' '}
          bhi bhej sakte hain.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
