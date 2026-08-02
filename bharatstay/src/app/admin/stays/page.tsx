import { db } from '@/lib/db';
import { StayTable } from '@/components/admin/StayTable';

export const dynamic = 'force-dynamic';

export default async function AdminStaysPage() {
  const stays = await db.stay.findMany({
    orderBy: [{ visible: 'desc' }, { city: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { photos: true } } },
  });

  return (
    <div>
      <h1 className="display text-[clamp(26px,4vw,38px)]">Stays</h1>
      <p className="mt-2 max-w-[62ch] text-[14px]" style={{ color: 'var(--basalt)' }}>
        Yahan price badlo, photos jodo, ya nayi property add karo. Save karte hi change site par sab visitors ko
        dikh jayega.
      </p>

      <StayTable
        stays={stays.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          city: s.city,
          area: s.area,
          room: s.room,
          meal: s.meal,
          tone: s.tone,
          star: s.star,
          price: s.price,
          basePrice: s.basePrice,
          rating: s.rating,
          visible: s.visible,
          amenities: s.amenities,
          photoCount: s._count.photos,
        }))}
      />
    </div>
  );
}
