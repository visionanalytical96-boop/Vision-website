import Link from 'next/link';
import type { Photo, Restaurant } from '@/generated/prisma/client';
import { Cover } from './Cover';
import { INR } from '@/lib/format';

export type RestaurantWithPhotos = Restaurant & { photos: Pick<Photo, 'id'>[] };

export function RestaurantCard({ restaurant: r, index = 0 }: { restaurant: RestaurantWithPhotos; index?: number }) {
  return (
    <Link href={`/restaurants/${r.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: 'var(--mist-deep)' }}>
        <Cover photoId={r.photos[0]?.id} tone={r.tone} alt={r.name} seed={index + 3} />
        <span className="absolute bottom-3 left-3 text-[30px] leading-none drop-shadow" aria-hidden>
          {r.emoji}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15.5px] font-semibold leading-snug">{r.name}</h3>
          <span
            className="data shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium"
            style={{ background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)', color: 'var(--ink)' }}
          >
            ★ {r.rating.toFixed(1)}
          </span>
        </div>

        <p className="mt-1 text-[13px]" style={{ color: 'var(--basalt)' }}>
          {r.cuisine}
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
          {r.area}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip text-[11.5px]">{r.vegType}</span>
        </div>

        <div className="mt-4 flex items-end justify-between border-t pt-3">
          <div>
            <span className="data text-[16px] font-medium">{INR(r.costForTwo)}</span>
            <span className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              {' '}
              for two
            </span>
          </div>
          <span className="data text-[11.5px]" style={{ color: 'var(--basalt-soft)' }}>
            {r.hours.split(',')[0]}
          </span>
        </div>
      </div>
    </Link>
  );
}
