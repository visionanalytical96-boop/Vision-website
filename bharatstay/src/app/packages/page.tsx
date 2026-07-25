import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { packages } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export const metadata: Metadata = {
  title: 'Holiday Packages — Curated Trips Across India',
  description: 'Browse curated holiday packages across India with hotels, transport and sightseeing included.',
};

export default function PackagesPage({
  searchParams,
}: {
  searchParams: { destination?: string };
}) {
  const filtered = searchParams.destination
    ? packages.filter((p) => p.destination.toLowerCase().includes(searchParams.destination!.toLowerCase()))
    : packages;

  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <div className="container-xl py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-royal-900">Holiday Packages</h1>
            <p className="text-sm text-royal-500">{filtered.length} curated packages found</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pkg) => (
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
                      <a href={`/checkout?type=package&amount=${pkg.pricePerPerson}`} className="btn-primary text-xs">Book Now</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="card p-10 text-center text-sm text-royal-500 sm:col-span-2 lg:col-span-3">
                No packages found for this destination.
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
