import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { hotels } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your BharatStay booking securely.',
};

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { type?: string; hotelId?: string; roomIndex?: string; amount?: string };
}) {
  const fallback = hotels[0]!;
  const hotelId = searchParams.hotelId ?? fallback.id;
  const roomIndex = Number(searchParams.roomIndex ?? 0);
  const amount = Number(searchParams.amount ?? fallback.finalPrice);

  return (
    <>
      <Header />
      <main>
        <CheckoutFlow hotelId={hotelId} roomIndex={roomIndex} baseAmount={amount} />
      </main>
      <Footer />
    </>
  );
}
