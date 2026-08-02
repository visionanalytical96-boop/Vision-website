import Link from 'next/link';
import type { Photo, Stay } from '@prisma/client';
import { Cover } from './Cover';
import { INR, stayTypeLabel } from '@/lib/format';

export type StayWithPhotos = Stay & { photos: Pick<Photo, 'id'>[] };

export function StayCard({ stay, index = 0 }: { stay: StayWithPhotos; index?: number }) {
  const off = stay.basePrice > stay.price ? Math.round((1 - stay.price / stay.basePrice) * 100) : 0;

  return (
    <Link href={`/stays/${stay.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--mist-deep)' }}>
        <Cover photoId={stay.photos[0]?.id} tone={stay.tone} alt={stay.name} seed={index} />
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: 'var(--paper)', color: 'var(--ink)' }}
        >
          {stayTypeLabel(stay.type)}
        </span>
        {off > 0 && (
          <span
            className="data absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: 'var(--laterite)', color: '#fff' }}
          >
            {off}% off
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15.5px] font-semibold leading-snug">{stay.name}</h3>
          <span
            className="data shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium"
            style={{ background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)', color: 'var(--ink)' }}
          >
            ★ {stay.rating.toFixed(1)}
          </span>
        </div>

        <p className="mt-1 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          {stay.area}
        </p>

        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--basalt)' }}>
          {stay.room} · {stay.meal}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {stay.freeCancel && <span className="chip text-[11.5px]">Free cancellation</span>}
          {stay.payAtHotel && <span className="chip text-[11.5px]">Pay at property</span>}
        </div>

        <div className="mt-4 flex items-end justify-between border-t pt-3">
          <div>
            {off > 0 && (
              <span className="data mr-2 text-[12.5px] line-through" style={{ color: 'var(--basalt-soft)' }}>
                {INR(stay.basePrice)}
              </span>
            )}
            <span className="data text-[18px] font-medium">{INR(stay.price)}</span>
            <span className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              {' '}
              / night
            </span>
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--laterite)' }}>
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
