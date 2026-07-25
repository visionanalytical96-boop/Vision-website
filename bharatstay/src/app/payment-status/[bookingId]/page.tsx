import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { formatINR, formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Payment Status' };

const STATUS_CONFIG = {
  success: { label: 'Payment Successful', tone: 'text-success-600', bg: 'bg-success-50', icon: '✅' },
  pending: { label: 'Payment Pending', tone: 'text-saffron-600', bg: 'bg-saffron-50', icon: '⏳' },
  failed: { label: 'Payment Failed', tone: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
} as const;

export default function PaymentStatusPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams: { amount?: string; method?: string; property?: string; status?: string };
}) {
  const status = (searchParams.status as keyof typeof STATUS_CONFIG) ?? 'success';
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.success;
  const amount = Number(searchParams.amount ?? 0);
  const transactionId = `TXN${params.bookingId.replace(/\D/g, '')}`;

  return (
    <>
      <Header />
      <main className="container-xl py-14">
        <div className="mx-auto max-w-xl">
          <div className={`rounded-xl2 ${config.bg} p-8 text-center`}>
            <span className="text-5xl">{config.icon}</span>
            <h1 className={`mt-3 text-2xl font-bold ${config.tone}`}>{config.label}</h1>
            <p className="mt-1 text-sm text-royal-500">
              {status === 'success'
                ? 'Your booking is confirmed. A confirmation email and ticket voucher have been sent to you.'
                : status === 'pending'
                  ? 'We are waiting for confirmation from your bank or payment provider. This can take a few minutes.'
                  : 'Your payment could not be processed. No amount has been deducted, or it will be refunded within 5-7 business days.'}
            </p>
          </div>

          <div className="card mt-6 space-y-3 p-6">
            <div className="flex justify-between text-sm"><span className="text-royal-500">Booking ID</span><span className="font-semibold text-royal-900">{params.bookingId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-royal-500">Transaction ID</span><span className="font-semibold text-royal-900">{transactionId}</span></div>
            {searchParams.property ? (
              <div className="flex justify-between text-sm"><span className="text-royal-500">Booking for</span><span className="font-semibold text-royal-900">{searchParams.property}</span></div>
            ) : null}
            <div className="flex justify-between text-sm"><span className="text-royal-500">Payment method</span><span className="font-semibold capitalize text-royal-900">{(searchParams.method ?? 'upi').replace('_', ' ')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-royal-500">Date &amp; time</span><span className="font-semibold text-royal-900">{formatDateTime(new Date().toISOString())}</span></div>
            <div className="flex justify-between border-t border-surface-border pt-3 text-base"><span className="font-semibold text-royal-700">Amount paid</span><span className="text-xl font-bold text-royal-900">{formatINR(amount)}</span></div>
          </div>

          {status === 'success' ? (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href={`/vouchers/hotel/${params.bookingId}?amount=${amount}&property=${encodeURIComponent(searchParams.property ?? '')}`} className="btn-primary justify-center">
                Download Voucher
              </Link>
              <Link href={`/vouchers/receipt/${params.bookingId}?amount=${amount}&method=${searchParams.method ?? 'upi'}`} className="btn-secondary justify-center">
                Download Receipt
              </Link>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <Link href="/dashboard/customer/bookings" className="font-semibold text-royal-700 hover:text-saffron-600">
              Go to My Bookings →
            </Link>
            <Link href="/" className="text-royal-400 hover:text-royal-600">Back to home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
