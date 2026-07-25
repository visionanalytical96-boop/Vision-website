'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Hotel } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [compared, setCompared] = useState(false);

  return (
    <div className="card flex flex-col overflow-hidden sm:flex-row">
      <div className="relative sm:w-64 sm:shrink-0">
        <PlaceholderImage token={hotel.images[0] ?? 'royal:🏨'} className="h-48 w-full sm:h-full" emojiClassName="text-4xl" />
        <button
          type="button"
          onClick={() => setWishlisted((v) => !v)}
          aria-label="Add to wishlist"
          aria-pressed={wishlisted}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow ${wishlisted ? 'text-saffron-600' : 'text-royal-500'}`}
        >
          {wishlisted ? '♥' : '♡'}
        </button>
        {hotel.isVerified ? (
          <span className="badge-verified absolute left-3 top-3 bg-white/95">✓ Verified</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-royal-900">{hotel.name}</h3>
                <span className="text-xs text-saffron-500">{'★'.repeat(hotel.starRating)}</span>
              </div>
              <p className="mt-0.5 text-xs text-royal-500">
                {hotel.city}, {hotel.state} · {hotel.distanceFromCentreKm} km from centre ·{' '}
                <a href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`} target="_blank" rel="noreferrer" className="underline hover:text-royal-700">
                  View on map
                </a>
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-royal-700 px-2.5 py-1 text-white">
              <span className="text-sm font-bold">{hotel.customerRating}</span>
              <span className="text-[10px]">/5 ({hotel.reviewCount})</span>
            </div>
          </div>

          <p className="mt-2 text-xs text-royal-500">
            {hotel.roomType} · {hotel.mealPlan}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-royal-50 px-2 py-0.5 text-[11px] text-royal-600">
                {a}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
            {hotel.freeCancellation ? <span className="text-success-600">✓ Free cancellation</span> : null}
            {hotel.payAtHotel ? <span className="text-royal-500">✓ Pay at hotel</span> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-surface-border pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompared((v) => !v)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${compared ? 'border-royal-700 bg-royal-50 text-royal-700' : 'border-surface-border text-royal-500'}`}
            >
              {compared ? '✓ Added to compare' : '+ Compare'}
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs text-royal-400 line-through">{formatINR(hotel.originalPrice)}</p>
            <p className="text-xl font-bold text-royal-900">
              {formatINR(hotel.finalPrice)}{' '}
              <span className="text-xs font-semibold text-success-600">({hotel.discountPercent}% off)</span>
            </p>
            <p className="text-[11px] text-royal-400">+{formatINR(hotel.taxesAndFees)} taxes &amp; fees / night</p>
            <Link href={`/hotels/${hotel.id}`} className="btn-primary mt-2 inline-flex text-xs">
              View Rooms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
