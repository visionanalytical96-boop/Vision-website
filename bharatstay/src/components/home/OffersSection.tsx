import { offers } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

export function OffersSection() {
  return (
    <section className="container-xl py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="section-eyebrow">Exclusive Offers</p>
          <h2 className="mt-1 text-2xl font-bold text-royal-900 sm:text-3xl">Deals you don&rsquo;t want to miss</h2>
        </div>
        <a href="/offers" className="btn-ghost hidden sm:inline-flex">View all offers →</a>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {offers.map((offer) => (
          <div key={offer.id} className="card flex flex-col overflow-hidden">
            <PlaceholderImage token={offer.image} className="h-28 w-full" emojiClassName="text-3xl" />
            <div className="flex flex-1 flex-col p-4">
              <span className="mb-2 inline-block w-fit rounded-full bg-saffron-50 px-2.5 py-1 text-xs font-bold text-saffron-700">
                {offer.discountLabel}
              </span>
              <h3 className="text-sm font-semibold text-royal-900">{offer.title}</h3>
              <p className="mt-1 flex-1 text-xs text-royal-500">{offer.description}</p>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-royal-200 bg-royal-50 px-2.5 py-1.5">
                <code className="text-xs font-bold text-royal-700">{offer.couponCode}</code>
                <span className="text-[10px] text-royal-400">Exp {formatDate(offer.expiryDate)}</span>
              </div>
              <button type="button" className="btn-primary mt-3 w-full text-xs">
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
