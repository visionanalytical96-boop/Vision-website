import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { activities } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export const metadata: Metadata = {
  title: 'Local Sightseeing & Activities',
  description: 'Book curated local activities, tours and adventure experiences across India with BharatStay.',
};

export default function ActivitiesPage() {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <div className="container-xl py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-royal-900">Local Sightseeing &amp; Activities</h1>
            <p className="text-sm text-royal-500">{activities.length} curated experiences across India</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {activities.map((act) => (
              <div key={act.id} className="card flex flex-col overflow-hidden">
                <PlaceholderImage token={act.image} label={act.city} className="h-32 w-full" emojiClassName="text-3xl" />
                <div className="flex flex-1 flex-col p-4">
                  <span className="w-fit rounded-full bg-royal-50 px-2 py-0.5 text-[11px] font-semibold text-royal-600">{act.category}</span>
                  <h3 className="mt-2 text-sm font-semibold text-royal-900">{act.title}</h3>
                  <p className="mt-1 text-xs text-royal-500">{act.city} · ~{act.durationHours}h</p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-base font-bold text-royal-900">{formatINR(act.pricePerPerson)}</p>
                    <a href={`/checkout?type=activity&amount=${act.pricePerPerson}`} className="btn-primary text-xs">Book</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
