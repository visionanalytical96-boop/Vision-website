import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VoucherShell, VoucherRow } from '@/components/vouchers/VoucherShell';
import { formatINR, formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Payment Receipt' };

export default function ReceiptPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams: { amount?: string; method?: string };
}) {
  const total = Number(searchParams.amount ?? 0);
  const base = Math.round(total / 1.12);
  const taxes = total - base;
  const receiptNumber = `RCPT-${params.bookingId.replace(/\D/g, '')}`;
  const transactionId = `TXN${params.bookingId.replace(/\D/g, '')}`;

  return (
    <>
      <Header />
      <main>
        <VoucherShell
          title="Payment Receipt"
          statusLabel="Payment Successful"
          shareText={`BharatStay payment receipt ${receiptNumber} for booking ${params.bookingId} — ${formatINR(total)} paid.`}
        >
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Receipt details</h2>
            <VoucherRow label="Receipt number" value={receiptNumber} />
            <VoucherRow label="Booking ID" value={params.bookingId} />
            <VoucherRow label="Transaction ID" value={transactionId} />
            <VoucherRow label="Payment gateway reference" value={`PG-${transactionId}`} />
            <VoucherRow label="Payment date &amp; time" value={formatDateTime(new Date().toISOString())} />
            <VoucherRow label="Payment method" value={(searchParams.method ?? 'UPI').toUpperCase()} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Customer</h2>
            <VoucherRow label="Name / Email / Phone" value="As entered at checkout" />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Amount breakdown</h2>
            <VoucherRow label="Base amount" value={formatINR(base)} />
            <VoucherRow label="Taxes &amp; convenience fee" value={formatINR(taxes)} />
            <VoucherRow label="Total paid" value={<span className="text-base font-bold">{formatINR(total)}</span>} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">GST details</h2>
            <VoucherRow label="GSTIN" value="27ABCDE1234F1Z5" />
            <VoucherRow label="Place of supply" value="Maharashtra" />
          </section>
        </VoucherShell>
      </main>
      <Footer />
    </>
  );
}
