/**
 * Seeds the catalogue from src/content/*.json and creates the admin account.
 *
 * Idempotent: every row is upserted on its slug, so running this against an
 * existing database refreshes the seed content without touching anything the
 * admin has since added through the panel.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'src/content', f), 'utf8'));

const coords = load('coords.json');
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

const at = (place) => {
  const c = coords[place];
  return c ? { lat: c[0], lng: c[1] } : { lat: null, lng: null };
};

const STAY_TYPE = {
  Hotel: 'HOTEL',
  Resort: 'RESORT',
  Villa: 'VILLA',
  Homestay: 'HOMESTAY',
  'Farm Stay': 'FARM_STAY',
};

/** Derives the display fields the standalone app used to compute on the fly. */
function stayFrom(s, i) {
  const area = s.area || s.city;
  const disc = s.disc ?? 10 + (i * 7) % 35;
  const price = s.price ?? Math.round(s.base * (1 - disc / 100));
  return {
    slug: slugify(`${s.name}-${s.city}`),
    name: s.name,
    type: STAY_TYPE[s.type] ?? 'HOTEL',
    city: s.city,
    area,
    address: s.address || `${area}, ${s.city}, Maharashtra`,
    star: s.star ?? 3,
    tone: s.tone ?? 'forest',
    room: s.room,
    meal: s.meal,
    amenities: s.amen ?? [],
    basePrice: s.base,
    price,
    taxPct: 12,
    rating: s.rating ?? +(3.7 + ((i * 3) % 13) / 10).toFixed(1),
    reviewCount: s.reviews ?? 40 + (i * 37) % 900,
    freeCancel: s.freeCancel ?? i % 3 !== 0,
    payAtHotel: s.payAtHotel ?? i % 4 === 0,
    couple: s.couple ?? i % 2 === 0,
    family: s.family ?? i % 3 !== 1,
    sort: i,
    ...at(s.city),
  };
}

function restaurantFrom(r, i) {
  const area = r.area || r.city;
  return {
    slug: slugify(`${r.name}-${r.city}`),
    name: r.name,
    city: r.city,
    area,
    address: r.address || `${area}, ${r.city}, Maharashtra`,
    cuisine: r.cuisine,
    vegType: r.veg,
    hours: r.hours || '11:00 AM – 11:00 PM',
    emoji: r.emoji || '🍽️',
    tone: r.tone || 'saffron',
    costForTwo: r.for2,
    rating: r.rating ?? 4.0,
    sort: i,
    ...at(r.city),
  };
}

async function main() {
  // ---- destinations
  const dests = [...load('destinations.json'), ...load('extra-destinations.json')];
  for (const [i, d] of dests.entries()) {
    const data = {
      name: d.name, state: d.state, tone: d.tone, emoji: d.emoji,
      desc: d.desc, price: d.price, count: d.count, sort: i, ...at(d.name),
    };
    await prisma.destination.upsert({ where: { slug: slugify(d.name) }, create: { slug: slugify(d.name), ...data }, update: data });
  }
  console.log(`destinations  ${dests.length}`);

  // ---- stays
  const stays = [...load('stays.json'), ...load('extra-stays.json')];
  for (const [i, s] of stays.entries()) {
    const { slug, ...data } = stayFrom(s, i);
    await prisma.stay.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`stays         ${stays.length}`);

  // ---- restaurants
  const rests = [...load('restaurants.json'), ...load('extra-restaurants.json')];
  for (const [i, r] of rests.entries()) {
    const { slug, ...data } = restaurantFrom(r, i);
    await prisma.restaurant.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`restaurants   ${rests.length}`);

  // ---- packages
  const pkgs = load('packages.json');
  for (const [i, p] of pkgs.entries()) {
    const data = {
      title: p.title, dest: p.dest, tone: p.tone, emoji: p.emoji, nights: p.n, days: p.d,
      hotel: p.hotel, meal: p.meal, transport: p.transport, sights: p.sights, price: p.price, sort: i,
    };
    const slug = slugify(p.title);
    await prisma.package.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`packages      ${pkgs.length}`);

  // ---- activities
  const acts = load('activities.json');
  for (const [i, a] of acts.entries()) {
    const data = { title: a.title, city: a.city, tone: a.tone, emoji: a.emoji, hours: a.hrs, category: a.cat, price: a.price, sort: i };
    const slug = slugify(a.title);
    await prisma.activity.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`activities    ${acts.length}`);

  // ---- cabs
  const cabs = load('cabs.json');
  for (const [i, c] of cabs.entries()) {
    const data = { name: c.name, icon: c.icon, seats: c.seats, bags: c.bags, perKm: c.perKm, allowance: c.allow, category: c.cat, sort: i };
    const slug = slugify(c.name);
    await prisma.cab.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`cabs          ${cabs.length}`);

  // ---- weekend planner
  const wk = load('weekend.json');
  for (const [i, s] of wk.spots.entries()) {
    const data = { name: s.name, place: s.place, scene: s.scene, tone: s.tone, dist: s.dist, tag: s.tag, desc: s.desc, sort: i, ...at(s.name) };
    const slug = slugify(s.name);
    await prisma.weekendSpot.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  for (const [i, p] of wk.plans.entries()) {
    const data = { title: p.title, price: p.price, per: p.per, steps: p.steps, sort: i };
    const slug = slugify(p.title);
    await prisma.weekendPlan.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  }
  console.log(`weekend       ${wk.spots.length} spots, ${wk.plans.length} plans`);

  // ---- reviews
  const reviews = load('reviews.json');
  for (const r of reviews) {
    const existing = await prisma.review.findFirst({ where: { name: r.name, text: r.text } });
    if (!existing) {
      await prisma.review.create({ data: { name: r.name, city: r.city, stars: r.stars, kind: r.kind, text: r.text, tone: r.tone, emoji: r.emoji } });
    }
  }
  console.log(`reviews       ${reviews.length}`);

  // ---- fares for the bike/auto ride service
  const fares = [
    ['BIKE', 'Bike', 20, 8, 30, 6, 1],
    ['EBIKE', 'E-bike', 20, 7, 30, 6, 1],
    ['AUTO', 'Auto', 30, 14, 40, 7, 3],
    ['CAB', 'Cab (sedan)', 60, 18, 100, 10, 4],
    ['CAB_XL', 'Cab XL (SUV)', 90, 24, 150, 12, 6],
  ];
  for (const [vehicleType, label, baseFare, perKm, minFare, matchRadiusKm, seats] of fares) {
    await prisma.fareRule.upsert({
      where: { vehicleType },
      create: { vehicleType, label, baseFare, perKm, minFare, matchRadiusKm, seats },
      update: { label, seats },
    });
  }
  console.log(`fares         ${fares.length}`);

  // ---- which services the site offers (admin can switch these off)
  const services = [
    ['rides', 'Bike & Auto Rides'],
    ['stays', 'Hotels, Villas & Farmhouses'],
    ['restaurants', 'Restaurants & Dining'],
    ['weekend', 'Badlapur → Karjat Weekend'],
    ['packages', 'Holiday Packages'],
    ['activities', 'Activities & Adventure'],
    ['cabs', 'Cabs & Transfers'],
    ['map', 'Map View'],
  ];
  for (const [i, [key, label]] of services.entries()) {
    await prisma.serviceToggle.upsert({ where: { key }, create: { key, label, sort: i }, update: { label, sort: i } });
  }
  console.log(`services      ${services.length}`);

  // ---- editable site copy
  const settings = {
    brandA: 'Bharat',
    brandB: 'Stay',
    tagline: 'Maharashtra ke stays, restaurants aur weekend trips',
    heroTitle: 'Maharashtra, ghar ke paas se shuru',
    heroSubtitle: 'Badlapur se Karjat, Lonavala se Konkan — farmhouse, villa, hotel aur asli Maharashtrian khana, sab ek jagah.',
    supportEmail: 'support@bharatstay.example',
    gstin: '',
    city: 'Badlapur, Maharashtra',
    dataNotice: 'Prices aur timings sample data hain — booking se pehle property se confirm karein.',
    adminNotes: '',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  console.log(`settings      ${Object.keys(settings).length}`);

  // ---- admin account
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  // Passwords that have ever been written down somewhere public are not
  // passwords. Refusing them here is the only place that reliably stops a
  // throwaway value from becoming the live admin login.
  const BANNED = new Set(['bharat@123', 'admin', 'admin123', 'password', 'changeme', '12345678']);

  if (!email || !password) {
    console.warn('! ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account creation.');
  } else if (BANNED.has(password.toLowerCase()) || password.length < 12) {
    throw new Error(
      'ADMIN_PASSWORD kamzor hai. Kam se kam 12 akshar ka naya password rakhiye ' +
        '(banane ke liye: openssl rand -base64 24). Purana demo password ab nahi chalega.',
    );
  } else {
    const passwordHash = await hash(password);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
      update: { passwordHash, role: 'ADMIN' },
    });
    console.log(`admin         ${email}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
