import { db } from '@/lib/db';
import { HEARTBEAT_TIMEOUT_MS, VEHICLE_EMOJI, VEHICLE_LABEL, onlineWhere } from '@/lib/rides';
import { RiderActions } from '@/components/admin/RiderActions';
import { FareEditor } from '@/components/admin/FareEditor';

export const dynamic = 'force-dynamic';

export default async function AdminRidersPage() {
  const [riders, fares, onlineCount] = await Promise.all([
    db.rider.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' } } },
    }),
    db.fareRule.findMany({ orderBy: { vehicleType: 'asc' } }),
    db.rider.count({ where: onlineWhere() }),
  ]);

  const fresh = (seen: Date | null) => Boolean(seen && Date.now() - seen.getTime() < HEARTBEAT_TIMEOUT_MS);

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Riders</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Bike, e-bike aur auto riders. Approve karte hi rider apne phone se online jaake rides le sakta hai.
        Abhi <strong>{onlineCount}</strong> rider online hain.
      </p>

      <FareEditor
        fares={fares.map((f) => ({
          vehicleType: f.vehicleType,
          label: f.label,
          baseFare: f.baseFare,
          perKm: f.perKm,
          minFare: f.minFare,
          matchRadiusKm: f.matchRadiusKm,
          seats: f.seats,
          enabled: f.enabled,
        }))}
      />

      <h2 className="mt-10 text-[18px] font-semibold">Registrations</h2>

      {riders.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-[15px] font-medium">Abhi koi rider registered nahi</p>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Riders ko <span className="data">/rider/apply</span> ka link bhejiye.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {riders.map((r) => (
            <article key={r.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[22px]" aria-hidden>{VEHICLE_EMOJI[r.vehicleType]}</span>
                    <h3 className="text-[17px] font-semibold">{r.name}</h3>
                    <span className="chip text-[11px]">{VEHICLE_LABEL[r.vehicleType]}</span>
                    <span
                      className="chip text-[11px]"
                      style={
                        r.status === 'APPROVED'
                          ? { background: 'color-mix(in srgb, var(--monsoon) 18%, transparent)' }
                          : r.status === 'PENDING'
                            ? { background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)' }
                            : { background: 'color-mix(in srgb, var(--laterite) 14%, transparent)' }
                      }
                    >
                      {r.status}
                    </span>
                    {r.status === 'APPROVED' && (
                      <span className="chip text-[11px]" style={fresh(r.lastSeenAt) ? { background: 'var(--monsoon)', borderColor: 'var(--monsoon)', color: '#fff' } : undefined}>
                        {fresh(r.lastSeenAt) ? '● Online' : '○ Offline'}
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
                    <Row label="Gaadi" value={r.vehicleNumber} />
                    <Row label="Phone" value={r.phone} />
                    <Row label="Licence" value={r.licenceNumber ?? '—'} />
                    <Row label="Area" value={`${r.area}, ${r.city}`} />
                    <Row label="Registered" value={r.createdAt.toLocaleDateString('en-IN')} />
                    <Row label="Last seen" value={r.lastSeenAt ? r.lastSeenAt.toLocaleString('en-IN') : '—'} />
                  </dl>
                  {r.adminNote && (
                    <p className="mt-3 rounded-lg px-4 py-2.5 text-[13px]" style={{ background: 'var(--mist-deep)' }}>
                      <strong>Note:</strong> {r.adminNote}
                    </p>
                  )}
                </div>

                {r.photos.length > 0 && (
                  <div className="flex gap-2">
                    {r.photos.slice(0, 2).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t p-5">
                <RiderActions id={r.id} status={r.status} />
              </div>
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
      <dt className="shrink-0" style={{ color: 'var(--basalt-soft)', minWidth: '72px' }}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
