import { db } from '@/lib/db';
import { ServiceToggles } from '@/components/admin/ServiceToggles';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  const services = await db.serviceToggle.findMany({ orderBy: { sort: 'asc' } });

  return (
    <div className="max-w-3xl">
      <h1 className="display text-[clamp(26px,4vw,38px)]">Services</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        Site kaunsi service deta hai, yeh yahan se tay karo. Band ki hui service navigation, search aur home page
        se turant hat jaati hai — listings delete nahi hoti, bas chhup jaati hai.
      </p>

      <ServiceToggles services={services} />
    </div>
  );
}
