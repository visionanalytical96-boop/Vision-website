export function AppPromoSection() {
  return (
    <section className="container-xl py-14">
      <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-xl2 bg-gradient-to-br from-royal-800 to-royal-900 p-8 text-white sm:p-12 lg:grid-cols-2">
        <div>
          <p className="section-eyebrow text-saffron-300">BharatStay Mobile App</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Book on the go, travel with confidence</h2>
          <ul className="mt-4 space-y-2 text-sm text-royal-100">
            <li>📥 App-only offers and early access to deals</li>
            <li>🔔 Real-time booking &amp; price-drop alerts</li>
            <li>🎟️ Digital ticket wallet — all your vouchers, offline access</li>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold">
              <span>▶️</span> Get it on Google Play
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold">
              <span>🍎</span> Download on the App Store
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-2xl text-royal-900" aria-label="QR code placeholder">
              ▦
            </div>
            <p className="text-xs text-royal-200">Scan the QR code to download the BharatStay app</p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-3">
          <div className="h-64 w-32 rounded-2xl border-4 border-white/20 bg-white/10 shadow-card" />
          <div className="h-72 w-36 rounded-2xl border-4 border-white/20 bg-white/10 shadow-card" />
          <div className="h-64 w-32 rounded-2xl border-4 border-white/20 bg-white/10 shadow-card" />
        </div>
      </div>
    </section>
  );
}
