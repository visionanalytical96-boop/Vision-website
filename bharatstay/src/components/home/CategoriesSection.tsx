import Link from 'next/link';

const CATEGORIES: { name: string; icon: string; token: string }[] = [
  { name: 'Hotels', icon: '🏨', token: 'Hotel' },
  { name: 'Resorts', icon: '🏝️', token: 'Resort' },
  { name: 'Villas', icon: '🏡', token: 'Villa' },
  { name: 'Homestays', icon: '🛏️', token: 'Homestay' },
  { name: 'Farm Stays', icon: '🌾', token: 'Farm Stay' },
  { name: 'Beach Stays', icon: '🏖️', token: 'Beach Stay' },
  { name: 'Mountain Stays', icon: '⛰️', token: 'Mountain Stay' },
  { name: 'Heritage', icon: '🏰', token: 'Heritage' },
  { name: 'Budget Stays', icon: '💰', token: 'Budget' },
  { name: 'Luxury Stays', icon: '👑', token: 'Luxury' },
];

export function CategoriesSection() {
  return (
    <section className="container-xl py-14">
      <div className="mb-8">
        <p className="section-eyebrow">Property Categories</p>
        <h2 className="mt-1 text-2xl font-bold text-royal-900 sm:text-3xl">Find your kind of stay</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            href={`/hotels?propertyType=${encodeURIComponent(cat.token)}`}
            className="card flex flex-col items-center gap-2 px-4 py-6 text-center"
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="text-sm font-semibold text-royal-800">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
