'use client';

import { useState } from 'react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubscribed(true);
  }

  return (
    <section className="bg-surface-muted py-14">
      <div className="container-xl">
        <div className="mx-auto max-w-2xl rounded-xl2 border border-surface-border bg-white p-8 text-center shadow-card">
          <p className="section-eyebrow">Stay in the Loop</p>
          <h2 className="mt-1 text-2xl font-bold text-royal-900">
            Travel deals, price-drop alerts &amp; festival packages
          </h2>
          <p className="mt-2 text-sm text-royal-500">
            Subscribe for weekend travel offers, booking reminders and exclusive festive packages via email or WhatsApp.
          </p>

          {subscribed ? (
            <p className="badge-success mx-auto mt-6 w-fit">✓ You&rsquo;re subscribed! Check your inbox soon.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary shrink-0">
                Subscribe
              </button>
            </form>
          )}
          <p className="mt-3 text-[11px] text-royal-400">
            By subscribing you agree to receive updates via email and WhatsApp. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
