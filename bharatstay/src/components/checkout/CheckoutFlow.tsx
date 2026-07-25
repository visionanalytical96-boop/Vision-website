'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hotelById } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';

const STEPS = ['Review', 'Guest Details', 'Add-ons', 'Coupon & GST', 'Payment'] as const;

const ADDONS = [
  { key: 'breakfast', label: 'Breakfast upgrade', price: 600 },
  { key: 'earlyCheckin', label: 'Early check-in (subject to availability)', price: 800 },
  { key: 'airportPickup', label: 'Airport pickup transfer', price: 900 },
  { key: 'insurance', label: 'Travel insurance', price: 249 },
];

const PAYMENT_METHODS = [
  { key: 'upi', label: 'UPI', icon: '📱' },
  { key: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { key: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { key: 'wallet', label: 'Wallet', icon: '👛' },
  { key: 'emi', label: 'EMI', icon: '🧾' },
  { key: 'paylater', label: 'Pay Later', icon: '⏳' },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: '🏧' },
  { key: 'payment_link', label: 'Payment Link', icon: '🔗' },
];

function generateBookingRef(): string {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `BST-${new Date().getFullYear()}-${rand}`;
}

export function CheckoutFlow({ hotelId, roomIndex, baseAmount }: { hotelId?: string; roomIndex: number; baseAmount: number }) {
  const router = useRouter();
  const hotel = hotelId ? hotelById(hotelId) : undefined;
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);

  const [guest, setGuest] = useState({ title: 'Mr', firstName: '', lastName: '', email: '', phone: '', idProof: '' });
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [needsGst, setNeedsGst] = useState(false);
  const [gstDetails, setGstDetails] = useState({ companyName: '', gstin: '' });
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const addonsTotal = useMemo(
    () => ADDONS.reduce((sum, a) => sum + (addons[a.key] ? a.price : 0), 0),
    [addons],
  );
  const discount = couponApplied ? Math.round(baseAmount * 0.05) : 0;
  const subtotal = baseAmount + addonsTotal - discount;
  const gstAmount = needsGst ? Math.round(subtotal * 0.18) : Math.round(subtotal * 0.12);
  const total = subtotal + gstAmount;

  function canProceed(): boolean {
    if (step === 1) return guest.firstName.trim().length > 0 && guest.email.trim().length > 0 && guest.phone.trim().length > 0;
    return true;
  }

  function handlePay() {
    setProcessing(true);
    const bookingRef = generateBookingRef();
    window.setTimeout(() => {
      router.push(
        `/payment-status/${bookingRef}?amount=${total}&method=${paymentMethod}&property=${encodeURIComponent(hotel?.name ?? 'BharatStay Booking')}&status=success`,
      );
    }, 1200);
  }

  return (
    <div className="container-xl grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        {/* Stepper */}
        <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                i === step ? 'bg-royal-700 text-white' : i < step ? 'bg-success-50 text-success-700' : 'bg-surface-muted text-royal-400'
              }`}
            >
              <span>{i < step ? '✓' : i + 1}</span> {label}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold text-royal-900">Review your booking</h2>
            {hotel ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-muted p-4">
                <div>
                  <p className="font-semibold text-royal-900">{hotel.name}</p>
                  <p className="text-sm text-royal-500">{hotel.city}, {hotel.state} · Room {roomIndex + 1} selection</p>
                </div>
                <p className="text-lg font-bold text-royal-900">{formatINR(baseAmount)}</p>
              </div>
            ) : (
              <p className="text-sm text-royal-500">Booking summary will appear here once you select a property.</p>
            )}
            <button type="button" className="btn-primary" onClick={() => setStep(1)}>Continue</button>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold text-royal-900">Guest / traveller details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="title">Title</label>
                <select id="title" className="input-field" value={guest.title} onChange={(e) => setGuest({ ...guest, title: e.target.value })}>
                  <option>Mr</option>
                  <option>Mrs</option>
                  <option>Ms</option>
                  <option>Dr</option>
                </select>
              </div>
              <div />
              <div>
                <label className="field-label" htmlFor="firstName">First name</label>
                <input id="firstName" className="input-field" value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="field-label" htmlFor="lastName">Last name</label>
                <input id="lastName" className="input-field" value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="email">Email address</label>
                <input id="email" type="email" className="input-field" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required />
              </div>
              <div>
                <label className="field-label" htmlFor="phone">Phone number</label>
                <input id="phone" type="tel" className="input-field" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="idProof">Government ID proof number (for check-in)</label>
                <input id="idProof" className="input-field" value={guest.idProof} onChange={(e) => setGuest({ ...guest, idProof: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={!canProceed()} onClick={() => setStep(2)}>Continue</button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold text-royal-900">Add-ons</h2>
            <div className="space-y-2">
              {ADDONS.map((a) => (
                <label key={a.key} className="flex items-center justify-between rounded-lg border border-surface-border p-3 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(addons[a.key])}
                      onChange={(e) => setAddons({ ...addons, [a.key]: e.target.checked })}
                      className="h-4 w-4 rounded border-surface-border text-royal-700"
                    />
                    {a.label}
                  </span>
                  <span className="font-semibold text-royal-700">+{formatINR(a.price)}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>Continue</button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold text-royal-900">Coupon &amp; GST details</h2>
            <div>
              <label className="field-label" htmlFor="coupon">Have a coupon code?</label>
              {couponApplied ? (
                <p className="badge-success">✓ Coupon {coupon.toUpperCase()} applied — 5% off</p>
              ) : (
                <div className="flex gap-2">
                  <input id="coupon" className="input-field" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="e.g. STAY25" />
                  <button type="button" className="btn-secondary shrink-0" onClick={() => setCouponApplied(coupon.trim().length > 0)}>
                    Apply
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-royal-700">
                <input type="checkbox" checked={needsGst} onChange={(e) => setNeedsGst(e.target.checked)} className="h-4 w-4 rounded border-surface-border text-royal-700" />
                I need a business GST invoice
              </label>
              {needsGst ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="companyName">Company name</label>
                    <input id="companyName" className="input-field" value={gstDetails.companyName} onChange={(e) => setGstDetails({ ...gstDetails, companyName: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="gstin">GSTIN</label>
                    <input id="gstin" className="input-field" value={gstDetails.gstin} onChange={(e) => setGstDetails({ ...gstDetails, gstin: e.target.value })} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="btn-primary" onClick={() => setStep(4)}>Continue to Payment</button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold text-royal-900">Choose payment method</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium ${
                    paymentMethod === m.key ? 'border-royal-700 bg-royal-50 text-royal-900' : 'border-surface-border text-royal-600'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-royal-400">
              Payments are processed by a PCI-DSS-compliant gateway (Razorpay/Cashfree/PayU/Stripe-ready). No card or bank details are stored by BharatStay.
            </p>
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button type="button" className="btn-primary disabled:opacity-60" disabled={processing} onClick={handlePay}>
                {processing ? 'Processing…' : `Pay ${formatINR(total)}`}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Sticky summary */}
      <aside className="card sticky top-24 h-fit space-y-3 p-5">
        <h3 className="text-sm font-bold text-royal-900">Price Summary</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-royal-600"><span>Base amount</span><span>{formatINR(baseAmount)}</span></div>
          {addonsTotal > 0 ? <div className="flex justify-between text-royal-600"><span>Add-ons</span><span>{formatINR(addonsTotal)}</span></div> : null}
          {discount > 0 ? <div className="flex justify-between text-success-600"><span>Coupon discount</span><span>-{formatINR(discount)}</span></div> : null}
          <div className="flex justify-between text-royal-600"><span>{needsGst ? 'GST (18%)' : 'Taxes & fees (12%)'}</span><span>{formatINR(gstAmount)}</span></div>
          <div className="flex justify-between border-t border-surface-border pt-2 text-base font-bold text-royal-900"><span>Total payable</span><span>{formatINR(total)}</span></div>
        </div>
      </aside>
    </div>
  );
}
