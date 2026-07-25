import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { HotelResults } from '@/components/hotels/HotelResults';

export const metadata: Metadata = {
  title: 'Hotels, Resorts, Villas & Homestays in India',
  description: 'Search and compare verified hotels, resorts, villas, homestays and farm-stays across India on BharatStay.',
};

export default function HotelsSearchPage({
  searchParams,
}: {
  searchParams: { destination?: string; propertyType?: string };
}) {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <HotelResults destination={searchParams.destination} propertyType={searchParams.propertyType} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
