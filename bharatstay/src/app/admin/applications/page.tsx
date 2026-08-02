import { db } from '@/lib/db';
import { INR } from '@/lib/format';
import { ApplicationActions } from '@/components/admin/ApplicationActions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Review baaki',
  NEEDS_INFO: 'Info maangi',
  APPROVED: 'Live',
  REJECTED: 'Reject',
};

export default async function AdminApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const filter = searchParams.status ?? 'open';
  const where =
    filter === 'all'
      ? {}
      : filter === 'open'
        ? { status: { in: ['PENDING' as const, 'NEEDS_INFO' as const] } }
        : { status: filter as 'APPROVED' | 'REJECTED' };

  const applications = await db.partnerApplication.findMany({
    where,
    include: { photos: { select: { id: true }, orderBy: { sort: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Applications</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Owners jo form bharte hain woh yahan aate hain. Approve karne par listing turant site par live ho jaati
        hai — photos ke saath.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ['open', 'Review baaki'],
            ['APPROVED', 'Approved'],
            ['REJECTED', 'Rejected'],
            ['all', 'Sab'],
          ] as const
        ).map(([value, label]) => (
          <a key={value} href={`/admin/applications?status=${value}`} className={`chip ${filter === value ? 'chip-on' : ''}`}>
            {label}
          </a>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-[15px] font-medium">Is filter mein koi application nahi</p>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Owners ko <span className="data">/partner/apply</span> ka link bhejiye — form bharte hi yahan dikh jayega.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {applications.map((a) => (
            <article key={a.id} id={a.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold">{a.businessName}</h2>
                    <span className="chip text-[11px]">{a.kind === 'STAY' ? 'Stay' : 'Restaurant'}</span>
                    <span
                      className="chip text-[11px]"
                      style={
                        a.status === 'APPROVED'
                          ? { background: 'color-mix(in srgb, var(--monsoon) 18%, transparent)', color: 'var(--ink)' }
                          : a.status === 'REJECTED'
                            ? { background: 'color-mix(in srgb, var(--laterite) 14%, transparent)', color: 'var(--ink)' }
                            : { background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)', color: 'var(--ink)' }
                      }
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px]" style={{ color: 'var(--basalt-soft)' }}>
                    {a.area} · {a.city} · {a.createdAt.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="data text-[20px] font-medium">
                    {a.kind === 'STAY' ? INR(a.price ?? 0) : INR(a.costForTwo ?? 0)}
                  </div>
                  <div className="text-[11.5px]" style={{ color: 'var(--basalt-soft)' }}>
                    {a.kind === 'STAY' ? 'per night' : 'for two'}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-[14px] leading-relaxed">{a.description}</p>

                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
                    <Row label="Owner" value={a.ownerName} />
                    <Row label="Email" value={a.email} />
                    <Row label="Phone" value={a.phone} />
                    <Row label="Address" value={a.address} />
                    {a.kind === 'STAY' ? (
                      <>
                        <Row label="Rooms" value={a.rooms ? String(a.rooms) : '—'} />
                        <Row label="Max guests" value={a.maxGuests ? String(a.maxGuests) : '—'} />
                        <Row label="Room" value={a.roomName ?? '—'} />
                        <Row label="Khana" value={a.mealPlan ?? '—'} />
                      </>
                    ) : (
                      <>
                        <Row label="Cuisine" value={a.cuisine ?? '—'} />
                        <Row label="Veg type" value={a.vegType ?? '—'} />
                        <Row label="Timings" value={a.hours ?? '—'} />
                      </>
                    )}
                  </dl>

                  {a.amenities.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {a.amenities.map((am) => (
                        <span key={am} className="chip text-[11.5px]">
                          {am}
                        </span>
                      ))}
                    </div>
                  )}

                  {a.adminNote && (
                    <p className="mt-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--mist-deep)' }}>
                      <strong>Aapka note:</strong> {a.adminNote}
                    </p>
                  )}
                </div>

                <div>
                  {a.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {a.photos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.id}
                          src={`/api/photos/${p.id}`}
                          alt=""
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex h-full min-h-[120px] items-center justify-center rounded-lg text-[13px]"
                      style={{ background: 'var(--mist-deep)', color: 'var(--basalt-soft)' }}
                    >
                      Koi photo nahi bheji
                    </div>
                  )}
                </div>
              </div>

              {a.status !== 'APPROVED' && (
                <div className="border-t p-5">
                  <ApplicationActions
                    id={a.id}
                    kind={a.kind}
                    defaultPrice={a.kind === 'STAY' ? a.price ?? 0 : a.costForTwo ?? 0}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0" style={{ color: 'var(--basalt-soft)', minWidth: '76px' }}>
        {label}
      </dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
