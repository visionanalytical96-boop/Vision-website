import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CheckoutForm } from '@/components/CheckoutForm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ stay?: string; in?: string; out?: string; guests?: string; rooms?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  if (!searchParams.stay) redirect('/stays');

  const stay = await db.stay.findUnique({ where: { slug: searchParams.stay } });
  if (!stay || !stay.visible) notFound();

  const session = await getSession();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="eyebrow">Booking</p>
        <h1 className="display mt-3 text-[clamp(28px,5vw,44px)]">{stay.name}</h1>
        <p className="mt-2 text-[14.5px]" style={{ color: 'var(--basalt)' }}>
          {stay.area}, {stay.city}
        </p>

        <CheckoutForm
          staySlug={stay.slug}
          price={stay.price}
          taxPct={stay.taxPct}
          defaults={{
            checkIn: searchParams.in ?? '',
            checkOut: searchParams.out ?? '',
            guests: Number(searchParams.guests ?? 2),
            rooms: Number(searchParams.rooms ?? 1),
            name: session?.name ?? '',
            phone: session?.phone ?? '',
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
