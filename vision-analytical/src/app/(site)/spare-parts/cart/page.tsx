import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { CartReviewForm } from '@/components/forms/CartReviewForm';
import { getCurrentUser } from '@/lib/dal';

export const metadata: Metadata = { title: 'Your Cart' };

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground">Your Cart</h1>
      <p className="mt-2 text-muted">Review your items and submit a quote request - no payment required.</p>
      <div className="mt-10">
        <CartReviewForm defaultName={user?.name} defaultEmail={user?.email} defaultPhone={user?.phone ?? undefined} />
      </div>
    </Container>
  );
}
