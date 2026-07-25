'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Hotel } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { hotels } from '@/lib/mock-data';

const FAQS = [
  { q: 'What is the check-in and check-out time?', a: 'Check-in starts at 2:00 PM and check-out is by 11:00 AM. Early check-in/late check-out is subject to availability.' },
  { q: 'Is breakfast included?', a: 'This depends on the meal plan selected during booking — Room Only, Breakfast Included, or All Meals Included.' },
  { q: 'Can I cancel my booking for free?', a: 'Most bookings are free to cancel up to 24–48 hours before check-in. Check the room-specific cancellation policy at checkout.' },
  { q: 'Is ID proof required at check-in?', a: 'Yes, a valid government-issued photo ID is required for all guests at check-in.' },
];

function buildRoomOptions(hotel: Hotel) {
  return [
    { name: hotel.roomType, mealPlan: hotel.mealPlan, price: hotel.finalPrice, refundable: hotel.freeCancellation },
    { name: `Premium ${hotel.roomType}`, mealPlan: 'Breakfast & Dinner', price: Math.round(hotel.finalPrice * 1.25), refundable: true },
    { name: `Executive Suite`, mealPlan: 'All Meals Included', price: Math.round(hotel.finalPrice * 1.6), refundable: true },
  ];
}

export function HotelDetailClient({ hotel }: { hotel: Hotel }) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const rooms = useMemo(() => buildRoomOptions(hotel), [hotel]);
  const room = rooms[selectedRoom]!;
  const discount = couponApplied ? Math.round(room.price * 0.1) : 0;
  const taxes = Math.round((room.price - discount) * 0.12);
  const total = room.price - discount + taxes;

  const similarProperties = hotels.filter((h) => h.city === hotel.city && h.id !== hotel.id).slice(0, 3);

  return (
    <div className="container-xl py-8">
      {/* Gallery */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <PlaceholderImage token={hotel.images[activeImage] ?? hotel.images[0]!} className="h-64 rounded-xl2 sm:col-span-2 sm:row-span-2 sm:h-full" emojiClassName="text-5xl" />
        {hotel.images.slice(0, 2).map((img, i) => (
          <button key={i} type="button" onClick={() => setActiveImage(i)} className="hidden sm:block">
            <PlaceholderImage token={img} className="h-full rounded-xl2" emojiClassName="text-3xl" />
          </button>
        ))}
        <div className="relative hidden sm:block">
          <PlaceholderImage token={hotel.images[0]!} className="h-full rounded-xl2" emojiClassName="text-3xl" />
          <span className="absolute inset-0 flex items-center justify-center rounded-xl2 bg-black/50 text-sm font-semibold text-white">
            360° view (placeholder)
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-royal-900">{hotel.name}</h1>
              <span className="text-saffron-500">{'★'.repeat(hotel.starRating)}</span>
              {hotel.isVerified ? <span className="badge-verified">✓ Verified Property</span> : null}
            </div>
            <p className="mt-1 text-sm text-royal-500">{hotel.address}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-lg bg-royal-700 px-2.5 py-1 text-sm font-bold text-white">{hotel.customerRating}/5</span>
              <span className="text-sm text-royal-500">{hotel.reviewCount} verified reviews</span>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`} target="_blank" rel="noreferrer" className="text-sm text-royal-600 underline">
                View on map
              </a>
            </div>
          </div>

          {/* Description */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">About this property</h2>
            <p className="mt-2 text-sm leading-relaxed text-royal-600">{hotel.description}</p>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">Amenities</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hotel.amenities.map((a) => (
                <span key={a} className="flex items-center gap-2 rounded-lg bg-royal-50 px-3 py-2 text-sm text-royal-700">
                  ✓ {a}
                </span>
              ))}
            </div>
          </section>

          {/* Room options */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">Choose your room</h2>
            <div className="mt-3 space-y-3">
              {rooms.map((r, i) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setSelectedRoom(i)}
                  className={`flex w-full flex-col items-start justify-between gap-2 rounded-xl2 border p-4 text-left sm:flex-row sm:items-center ${
                    selectedRoom === i ? 'border-royal-700 bg-royal-50' : 'border-surface-border'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-royal-900">{r.name}</p>
                    <p className="text-xs text-royal-500">{r.mealPlan} · {r.refundable ? 'Free cancellation' : 'Non-refundable'}</p>
                  </div>
                  <p className="text-lg font-bold text-royal-900">{formatINR(r.price)} <span className="text-xs font-normal text-royal-400">/ night</span></p>
                </button>
              ))}
            </div>
          </section>

          {/* Policies */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">Policies</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-royal-400">Check-in / Check-out</dt>
                <dd className="text-sm text-royal-700">{hotel.policies.checkIn} / {hotel.policies.checkOut}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-royal-400">Cancellation policy</dt>
                <dd className="text-sm text-royal-700">
                  {hotel.freeCancellation ? 'Free cancellation up to 48 hours before check-in.' : 'Non-refundable booking — no cancellation after payment.'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-royal-400">Child policy</dt>
                <dd className="text-sm text-royal-700">{hotel.policies.childPolicy}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-royal-400">Extra bed charges</dt>
                <dd className="text-sm text-royal-700">{hotel.policies.extraBedCharge}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-royal-400">Couple &amp; guest policy</dt>
                <dd className="text-sm text-royal-700">{hotel.policies.couplePolicy}</dd>
              </div>
            </dl>
          </section>

          {/* Nearby attractions */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">Nearby attractions</h2>
            <ul className="mt-3 space-y-1.5">
              {hotel.nearbyAttractions.map((a) => (
                <li key={a.name} className="flex justify-between text-sm text-royal-600">
                  <span>{a.name}</span>
                  <span className="text-royal-400">{a.distanceKm} km</span>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQs */}
          <section>
            <h2 className="text-lg font-semibold text-royal-900">Frequently asked questions</h2>
            <div className="mt-3 divide-y divide-surface-border rounded-xl2 border border-surface-border">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group p-4">
                  <summary className="cursor-pointer text-sm font-medium text-royal-800 marker:content-none">
                    <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                    {faq.q}
                  </summary>
                  <p className="mt-2 pl-5 text-sm text-royal-500">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Similar properties */}
          {similarProperties.length ? (
            <section>
              <h2 className="text-lg font-semibold text-royal-900">Similar properties in {hotel.city}</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {similarProperties.map((s) => (
                  <Link key={s.id} href={`/hotels/${s.id}`} className="card overflow-hidden">
                    <PlaceholderImage token={s.images[0] ?? 'royal:🏨'} className="h-28 w-full" emojiClassName="text-2xl" />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-royal-900">{s.name}</p>
                      <p className="text-xs text-royal-500">{formatINR(s.finalPrice)} / night</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Price breakdown / booking widget */}
        <aside className="card sticky top-24 h-fit space-y-4 p-5">
          <div>
            <p className="text-xs text-royal-400 line-through">{formatINR(room.price + Math.round(room.price * 0.15))}</p>
            <p className="text-2xl font-bold text-royal-900">{formatINR(room.price)}</p>
            <p className="text-xs text-royal-400">per night, {room.mealPlan}</p>
          </div>

          <div className="space-y-1 border-t border-surface-border pt-3 text-sm">
            <div className="flex justify-between text-royal-600">
              <span>Room price</span>
              <span>{formatINR(room.price)}</span>
            </div>
            {couponApplied ? (
              <div className="flex justify-between text-success-600">
                <span>Coupon discount</span>
                <span>-{formatINR(discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-royal-600">
              <span>Taxes &amp; convenience fee</span>
              <span>{formatINR(taxes)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-2 text-base font-bold text-royal-900">
              <span>Payable amount</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>

          <div>
            {couponApplied ? (
              <p className="badge-success">✓ Coupon STAY25 applied</p>
            ) : (
              <div className="flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Coupon code"
                  className="input-field text-sm"
                />
                <button type="button" onClick={() => setCouponApplied(coupon.trim().length > 0)} className="btn-secondary shrink-0 text-sm">
                  Apply
                </button>
              </div>
            )}
          </div>

          <Link href={`/checkout?type=hotel&hotelId=${hotel.id}&roomIndex=${selectedRoom}&amount=${total}`} className="btn-primary w-full">
            Book Now
          </Link>
          <p className="text-center text-[11px] text-royal-400">You won&rsquo;t be charged yet</p>
        </aside>
      </div>
    </div>
  );
}
