import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FlightResults } from '@/components/flights/FlightResults';

export const metadata: Metadata = {
  title: 'Flight Booking — Domestic Flights Across India',
  description: 'Compare and book domestic flights across India with BharatStay.',
};

export default function FlightsSearchPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <FlightResults from={searchParams.from} to={searchParams.to} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
