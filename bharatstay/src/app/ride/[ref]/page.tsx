import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { RideTracker } from '@/components/RideTracker';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your ride', robots: { index: false } };

export default async function RideTrackPage({ params: paramsPromise }: { params: Promise<{ ref: string }> }) {
  const params = await paramsPromise;
  const exists = await db.ride.findUnique({ where: { ref: params.ref }, select: { id: true } });
  if (!exists) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <RideTracker refCode={params.ref} />
      </main>
      <SiteFooter />
    </>
  );
}
