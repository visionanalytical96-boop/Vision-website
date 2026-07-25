import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { hotelById } from '@/lib/mock-data';
import { HotelDetailClient } from '@/components/hotels/HotelDetailClient';

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const hotel = hotelById(params.id);
  if (!hotel) return { title: 'Property not found' };
  return {
    title: `${hotel.name} — ${hotel.city}`,
    description: hotel.description,
  };
}

export default function HotelDetailPage({ params }: { params: { id: string } }) {
  const hotel = hotelById(params.id);
  if (!hotel) notFound();

  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <HotelDetailClient hotel={hotel} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
