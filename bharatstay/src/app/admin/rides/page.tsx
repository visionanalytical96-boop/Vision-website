import { db } from '@/lib/db';
import { INR } from '@/lib/format';
import { VEHICLE_EMOJI, VEHICLE_LABEL, onlineWhere } from '@/lib/rides';
import { BeltMap } from '@/components/BeltMap';

export const dynamic = 'force-dynamic';

export default async function AdminRidesPage() {
  const [rides, online, live] = await Promise.all([
    db.ride.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { rider: { select: { name: true } } } }),
    db.rider.findMany({ where: onlineWhere(), select: { id: true, name: true, lat: true, lng: true, vehicleType: true } }),
    db.ride.findMany({
      where: { status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'ONGOING'] } },
      select: { ref: true, pickupLat: true, pickupLng: true },
    }),
  ]);

  const pins = [
    ...online.map((r) => ({ lat: r.lat!, lng: r.lng!, label: `${VEHICLE_EMOJI[r.vehicleType]} ${r.name}`, kind: 'rider' as const })),
    ...live.map((r) => ({ lat: r.pickupLat, lng: r.pickupLng, label: r.ref, kind: 'pickup' as const })),
  ];

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Rides</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        {online.length} rider online · {live.length} ride chal rahi hain.
      </p>

      {pins.length > 0 && (
        <div className="card mt-6 p-4">
          <BeltMap pins={pins} />
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Peela = online rider, hara = chalu ride ka pickup. Har 30 second mein page refresh karke taaza dekh sakte hain.
          </p>
        </div>
      )}

      {rides.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          Abhi tak koi ride nahi hui.
        </div>
      ) : (
        <div className="card scroll-x mt-6">
          <table className="w-full text-[13.5px]" style={{ minWidth: '860px' }}>
            <thead>
              <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
                {['Ref', 'Gaadi', 'Customer', 'Rider', 'Raasta', 'Kiraya', 'Status', 'Kab'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rides.map((r) => (
                <tr key={r.id}>
                  <td className="data px-4 py-3">{r.ref}</td>
                  <td className="px-4 py-3">{VEHICLE_EMOJI[r.vehicleType]} {VEHICLE_LABEL[r.vehicleType]}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.customerName}</div>
                    <div className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>{r.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3">{r.rider?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[12.5px]">
                    {r.pickupLabel}
                    <span style={{ color: 'var(--basalt-soft)' }}> → </span>
                    {r.dropLabel}
                  </td>
                  <td className="data px-4 py-3">{INR(r.fare)}</td>
                  <td className="px-4 py-3"><span className="chip text-[11px]">{r.status}</span></td>
                  <td className="data px-4 py-3 text-[12px]">{r.createdAt.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
