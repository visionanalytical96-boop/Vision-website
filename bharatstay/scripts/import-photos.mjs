/**
 * Imports the photo pack into the database and attaches each shot to the
 * destination and the stays of the city it belongs to. Re-running is safe:
 * a file already imported (same name) is skipped rather than duplicated.
 */
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'photos');

/** Which city each file belongs to, taken from its filename. */
const CITY_OF = {
  '01_badlapur_barvi_dam': 'Badlapur',
  '02_matheran_waterfall': 'Matheran',
  '03_lonavala_mist': 'Lonavala',
  '04_mahabaleshwar_hills': 'Mahabaleshwar',
  '05_panchgani_view': 'Panchgani',
  '06_ratnagiri_sunset': 'Ratnagiri',
  '07_ganpatipule_beach_temple': 'Ganpatipule',
  '08_tarkarli_beach': 'Tarkarli',
  '09_shirdi_temple': 'Shirdi',
  '10_malshej_ghat': 'Malshej Ghat',
};

const ALT = {
  Badlapur: 'Barvi Dam, Badlapur',
  Matheran: 'Matheran ka waterfall',
  Lonavala: 'Lonavala ki dhund',
  Mahabaleshwar: 'Mahabaleshwar ki pahaadiyan',
  Panchgani: 'Panchgani ka nazara',
  Ratnagiri: 'Ratnagiri ka sunset',
  Ganpatipule: 'Ganpatipule beach aur mandir',
  Tarkarli: 'Tarkarli beach',
  Shirdi: 'Shirdi mandir',
  'Malshej Ghat': 'Malshej Ghat',
};

const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();

for (const file of files) {
  const stem = file.replace(/\.[^.]+$/, '');
  const city = CITY_OF[stem];
  if (!city) {
    console.log(`skip   ${file} — kis sheher ka hai pata nahi`);
    continue;
  }

  const alt = ALT[city] ?? city;
  if (await prisma.photo.findFirst({ where: { alt }, select: { id: true } })) {
    console.log(`have   ${file}`);
    continue;
  }

  const input = await readFile(resolve(dir, file));
  const out = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const base = { data: out.data, mimeType: 'image/webp', width: out.info.width, height: out.info.height, bytes: out.info.size, alt };

  // Attach to every stay in that city, so the city actually looks photographed.
  const stays = await prisma.stay.findMany({ where: { city }, select: { id: true } });
  for (const stay of stays) await prisma.photo.create({ data: { ...base, stayId: stay.id, sort: 0 } });

  const rests = await prisma.restaurant.findMany({ where: { city }, select: { id: true }, take: 3 });
  for (const r of rests) await prisma.photo.create({ data: { ...base, restaurantId: r.id, sort: 0 } });

  console.log(`import ${file} -> ${city}: ${stays.length} stays, ${rests.length} restaurants (${Math.round(out.info.size / 1024)} KB)`);
}

await prisma.$disconnect();
