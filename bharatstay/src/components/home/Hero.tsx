'use client';

import { useState } from 'react';
import { HotelSearchForm } from './search-forms/HotelSearchForm';
import { FlightSearchForm } from './search-forms/FlightSearchForm';
import { BusSearchForm } from './search-forms/BusSearchForm';
import { CabSearchForm } from './search-forms/CabSearchForm';
import { PackageSearchForm } from './search-forms/PackageSearchForm';

const TABS = [
  { key: 'hotels', label: 'Hotels', icon: '🏨' },
  { key: 'flights', label: 'Flights', icon: '✈️' },
  { key: 'buses', label: 'Buses', icon: '🚌' },
  { key: 'trains', label: 'Trains', icon: '🚆' },
  { key: 'cabs', label: 'Cabs', icon: '🚕' },
  { key: 'packages', label: 'Packages', icon: '🧳' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function Hero() {
  const [activeTab, setActiveTab] = useState<TabKey>('hotels');

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-royal-900 via-royal-800 to-royal-700 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-saffron-500 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-success-500 blur-3xl" />
      </div>

      <div className="container-xl relative py-14 sm:py-20">
        <p className="section-eyebrow text-saffron-300">India&rsquo;s Complete Travel Booking Platform</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Where Would You Like to Go?
        </h1>
        <p className="mt-3 max-w-xl text-royal-100">
          Hotels, resorts, villas &amp; homestays · flights · buses · trains · cabs · holiday packages — book it all with BharatStay.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl2 bg-white text-royal-900 shadow-card-hover">
          <div className="flex overflow-x-auto border-b border-surface-border">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'border-b-2 border-saffron-500 text-royal-900'
                    : 'text-royal-400 hover:text-royal-700'
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'hotels' ? <HotelSearchForm /> : null}
            {activeTab === 'flights' ? <FlightSearchForm /> : null}
            {activeTab === 'buses' ? <BusSearchForm /> : null}
            {activeTab === 'cabs' ? <CabSearchForm /> : null}
            {activeTab === 'packages' ? <PackageSearchForm /> : null}
            {activeTab === 'trains' ? (
              <div className="flex flex-col items-start gap-3 rounded-lg bg-royal-50 p-4 text-sm text-royal-700 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Train search connects to IRCTC-authorised partners for live availability. This is a readiness
                  placeholder — no booking is made here yet.
                </p>
                <button type="button" className="btn-secondary shrink-0" disabled>
                  Coming soon
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
