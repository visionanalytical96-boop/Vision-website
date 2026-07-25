import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export const metadata: Metadata = {
  title: 'Train Search — Coming Soon',
  description: 'BharatStay train search connects to IRCTC-authorised partners for live availability.',
};

export default function TrainsPage() {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">
        <div className="container-xl py-16">
          <div className="mx-auto max-w-xl rounded-xl2 border border-dashed border-royal-200 bg-royal-50 p-8 text-center">
            <span className="text-4xl">🚆</span>
            <h1 className="mt-3 text-xl font-bold text-royal-900">Train search is on the way</h1>
            <p className="mt-2 text-sm text-royal-600">
              BharatStay&rsquo;s train search will connect to IRCTC-authorised data partners for live seat availability
              and booking redirection. This page is a readiness placeholder — no live train inventory is connected yet.
            </p>
            <a href="/hotels" className="btn-primary mt-5 inline-flex">Explore Hotels Instead</a>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
