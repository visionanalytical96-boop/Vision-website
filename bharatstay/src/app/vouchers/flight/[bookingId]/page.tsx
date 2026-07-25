import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VoucherShell, VoucherRow } from '@/components/vouchers/VoucherShell';
import { flights } from '@/lib/mock-data';
import { formatINR, durationLabel } from '@/lib/utils';

export const metadata: Metadata = { title: 'Flight E-Ticket' };

export default function FlightVoucherPage({ params }: { params: { bookingId: string } }) {
  const flight = flights[0]!;

  return (
    <>
      <Header />
      <main>
        <VoucherShell
          title="Flight E-Ticket"
          statusLabel="Ticket Confirmed"
          shareText={`BharatStay flight e-ticket for booking ${params.bookingId} — ${flight.airline} ${flight.flightNumber}.`}
        >
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Flight details</h2>
            <VoucherRow label="Booking ID" value={params.bookingId} />
            <VoucherRow label="Airline" value={`${flight.airlineLogo} ${flight.airline} · ${flight.flightNumber}`} />
            <VoucherRow label="Route" value={`${flight.fromCity} (${flight.fromCode}) → ${flight.toCity} (${flight.toCode})`} />
            <VoucherRow label="Departure" value={flight.departureTime} />
            <VoucherRow label="Arrival" value={flight.arrivalTime} />
            <VoucherRow label="Duration" value={durationLabel(flight.durationMinutes)} />
            <VoucherRow label="Cabin class" value={flight.cabinClass} />
            <VoucherRow label="Baggage" value={`${flight.baggageKg}kg check-in + ${flight.cabinBaggageKg}kg cabin`} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Passenger</h2>
            <VoucherRow label="Passenger name" value="As entered at checkout" />
            <VoucherRow label="Fare type" value={flight.refundable ? 'Refundable' : 'Non-refundable'} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-royal-400">Payment</h2>
            <VoucherRow label="Amount paid" value={formatINR(flight.price)} />
          </section>

          <section className="rounded-lg bg-royal-50 p-4 text-xs text-royal-600">
            <p className="mb-1 font-semibold text-royal-700">Important instructions</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Reach the airport at least 2 hours before departure for domestic flights.</li>
              <li>Carry a valid photo ID for security check-in.</li>
              <li>For emergency travel assistance, call BharatStay support 24/7 at 1800-123-4567.</li>
            </ul>
          </section>
        </VoucherShell>
      </main>
      <Footer />
    </>
  );
}
