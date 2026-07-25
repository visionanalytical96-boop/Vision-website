import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VoucherShell, VoucherRow } from '@/components/vouchers/VoucherShell';
import { formatINR, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Hotel Voucher' };

export default function HotelVoucherPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams: { amount?: string; property?: string };
}) {
  const amount = Number(searchParams.amount ?? 0);
  const property = searchParams.property || 'BharatStay Partner Property';

  return (
    <>
      <Header />
      <main>
        <VoucherShell
          title="Hotel Voucher"
          statusLabel="Booking Confirmed"
          shareText={`BharatStay hotel voucher for booking ${params.bookingId} at ${property}.`}
        >
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Booking details</h2>
            <VoucherRow label="Booking ID" value={params.bookingId} />
            <VoucherRow label="Property" value={property} />
            <VoucherRow label="Check-in" value="14 Aug 2026, from 2:00 PM" />
            <VoucherRow label="Check-out" value="17 Aug 2026, by 11:00 AM" />
            <VoucherRow label="Rooms / Guests" value="1 Room · 2 Adults" />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Guest details</h2>
            <VoucherRow label="Primary guest" value="As entered at checkout" />
            <VoucherRow label="Contact" value="Registered email &amp; phone on file" />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Payment</h2>
            <VoucherRow label="Amount paid" value={formatINR(amount)} />
            <VoucherRow label="Balance due" value={formatINR(0)} />
            <VoucherRow label="Issued on" value={formatDate(new Date().toISOString())} />
          </section>

          <section className="rounded-lg bg-royal-50 p-4 text-xs text-royal-600">
            <p className="mb-1 font-semibold text-royal-700">Important instructions</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Carry a valid government photo ID matching the booking name for check-in.</li>
              <li>Cancellation policy and property rules apply as shown at the time of booking.</li>
              <li>For emergency travel assistance, call BharatStay support 24/7 at 1800-123-4567.</li>
            </ul>
          </section>
        </VoucherShell>
      </main>
      <Footer />
    </>
  );
}
