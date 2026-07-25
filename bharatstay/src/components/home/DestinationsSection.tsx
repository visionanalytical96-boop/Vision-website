import Link from 'next/link';
import { destinations } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export function DestinationsSection() {
  return (
    <section className="bg-surface-muted py-14">
      <div className="container-xl">
        <div className="mb-8">
          <p className="section-eyebrow">Popular Indian Destinations</p>
          <h2 className="mt-1 text-2xl font-bold text-royal-900 sm:text-3xl">Explore India, your way</h2>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {destinations.map((dest) => (
            <div key={dest.id} className="card overflow-hidden">
              <PlaceholderImage token={dest.image} label={dest.name} className="h-32 w-full" emojiClassName="text-3xl" />
              <div className="p-3">
                <p className="text-xs text-royal-500">{dest.hotelCount} hotels &amp; stays</p>
                <p className="mt-1 text-sm font-semibold text-royal-900">From {formatINR(dest.startingPrice)}</p>
                <p className="mt-1 line-clamp-2 text-xs text-royal-400">{dest.description}</p>
                <Link
                  href={`/hotels?destination=${encodeURIComponent(dest.name)}`}
                  className="mt-3 inline-flex text-xs font-semibold text-royal-700 hover:text-saffron-600"
                >
                  View properties →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
