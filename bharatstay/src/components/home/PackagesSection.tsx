import Link from 'next/link';
import { packages } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export function PackagesSection() {
  return (
    <section className="bg-surface-muted py-14">
      <div className="container-xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Trending Holiday Packages</p>
            <h2 className="mt-1 text-2xl font-bold text-royal-900 sm:text-3xl">Curated trips, zero hassle</h2>
          </div>
          <Link href="/packages" className="btn-ghost hidden sm:inline-flex">View all packages →</Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.slice(0, 6).map((pkg) => (
            <div key={pkg.id} className="card flex flex-col overflow-hidden">
              <PlaceholderImage token={pkg.image} label={pkg.destination} className="h-40 w-full" emojiClassName="text-4xl" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-semibold text-royal-900">{pkg.title}</h3>
                <p className="mt-1 text-xs font-medium text-royal-500">
                  {pkg.nights}N / {pkg.days}D · {pkg.hotelCategory}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-royal-500">
                  <li>🍽️ {pkg.mealPlan}</li>
                  <li>🚐 {pkg.transport}</li>
                  <li>📍 {pkg.sightseeing.join(', ')}</li>
                </ul>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-royal-400">Per person</p>
                    <p className="text-lg font-bold text-royal-900">{formatINR(pkg.pricePerPerson)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary text-xs">Enquire</button>
                    <button type="button" className="btn-primary text-xs">Book Now</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
