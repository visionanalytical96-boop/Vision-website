'use client';

import { useState } from 'react';
import { reviews } from '@/lib/mock-data';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const review = reviews[index]!;

  function prev() {
    setIndex((i) => (i - 1 + reviews.length) % reviews.length);
  }
  function next() {
    setIndex((i) => (i + 1) % reviews.length);
  }

  return (
    <section className="bg-royal-900 py-14 text-white">
      <div className="container-xl">
        <div className="mb-8 text-center">
          <p className="section-eyebrow text-saffron-300">Customer Reviews</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Loved by travellers across India</h2>
        </div>

        <div className="mx-auto max-w-2xl rounded-xl2 bg-white/5 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <PlaceholderImage token={review.photo} className="h-14 w-14 shrink-0 rounded-full" emojiClassName="text-2xl right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2" />
            <div>
              <p className="font-semibold">{review.customerName}</p>
              <p className="text-xs text-royal-200">{review.location} · {review.bookingType}</p>
            </div>
            {review.isVerified ? (
              <span className="ml-auto rounded-full bg-success-500/20 px-2.5 py-1 text-[10px] font-semibold text-success-100">
                Verified Booking
              </span>
            ) : null}
          </div>
          <div className="mt-4 text-saffron-300" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}
            <span className="text-white/20">{'★'.repeat(5 - review.rating)}</span>
          </div>
          <p className="mt-3 text-sm text-royal-100">&ldquo;{review.review}&rdquo;</p>

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={prev} aria-label="Previous review" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
              ←
            </button>
            <div className="flex gap-1.5">
              {reviews.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-saffron-400' : 'w-1.5 bg-white/30'}`}
                />
              ))}
            </div>
            <button type="button" onClick={next} aria-label="Next review" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
