const POINTS: { title: string; icon: string; desc: string }[] = [
  { title: 'Secure Payments', icon: '🔒', desc: 'PCI-DSS-ready checkout with UPI, cards, net banking and wallets.' },
  { title: 'Verified Properties', icon: '✅', desc: 'Every listing is manually verified before it goes live.' },
  { title: 'Transparent Pricing', icon: '🧾', desc: 'No hidden charges — taxes and fees shown upfront.' },
  { title: 'Instant Confirmation', icon: '⚡', desc: 'Get your booking confirmed and voucher issued in seconds.' },
  { title: 'Easy Cancellations', icon: '↩️', desc: 'Free cancellation on most bookings, hassle-free refunds.' },
  { title: '24/7 Support', icon: '💬', desc: 'Round-the-clock help via chat, WhatsApp, call and email.' },
  { title: 'GST Invoices', icon: '📄', desc: 'Auto-generated GST-compliant invoices for every booking.' },
  { title: 'Digital Vouchers', icon: '📲', desc: 'Paperless tickets and vouchers with QR verification.' },
];

export function WhyChooseUs() {
  return (
    <section className="container-xl py-14">
      <div className="mb-8 text-center">
        <p className="section-eyebrow">Why Choose BharatStay</p>
        <h2 className="mt-1 text-2xl font-bold text-royal-900 sm:text-3xl">Built for the way India travels</h2>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-xl2 border border-surface-border bg-white p-5 text-center shadow-card">
            <span className="text-3xl">{p.icon}</span>
            <h3 className="mt-3 text-sm font-semibold text-royal-900">{p.title}</h3>
            <p className="mt-1 text-xs text-royal-500">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
