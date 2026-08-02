import { db } from '@/lib/db';
import { RestaurantTable } from '@/components/admin/RestaurantTable';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantsPage() {
  const rows = await db.restaurant.findMany({
    orderBy: [{ visible: 'desc' }, { city: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { photos: true } } },
  });

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Restaurants</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Cuisine, timings aur kharcha yahan se badlo. Photos bhi yahin upload hoti hain.
      </p>

      <RestaurantTable
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city,
          area: r.area,
          cuisine: r.cuisine,
          vegType: r.vegType,
          hours: r.hours,
          emoji: r.emoji,
          tone: r.tone,
          costForTwo: r.costForTwo,
          rating: r.rating,
          visible: r.visible,
          photoCount: r._count.photos,
        }))}
      />
    </div>
  );
}
