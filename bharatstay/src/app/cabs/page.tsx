import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { CabResults } from '@/components/cabs/CabResults';

export const metadata: Metadata = {
  title: 'Cab & Airport Transfer Booking',
  description: 'Book local, outstation and airport transfer cabs across India with BharatStay.',
};

export default function CabsSearchPage({
  searchParams,
}: {
  searchParams: { tripCategory?: string; pickup?: string; drop?: string };
}) {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <CabResults tripCategory={searchParams.tripCategory} pickup={searchParams.pickup} drop={searchParams.drop} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
