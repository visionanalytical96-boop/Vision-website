import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BusResults } from '@/components/buses/BusResults';

export const metadata: Metadata = {
  title: 'Bus Ticket Booking Across India',
  description: 'Compare and book AC, non-AC, sleeper and seater bus tickets across India with BharatStay.',
};

export default function BusesSearchPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <BusResults from={searchParams.from} to={searchParams.to} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
