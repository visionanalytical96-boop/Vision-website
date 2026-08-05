import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, CategoryKind, ProductKind, StockStatus } from '../src/generated/prisma/client';
import { INSTRUMENT_CATEGORIES } from './seed-data';
import { SPARE_PART_CATEGORIES } from './seed-data-spare-parts';

// Bootstraps the first Admin account. Safe to re-run: does nothing unless
// SEED_ADMIN_PASSWORD is set, and skips if the account already exists - so
// there is never a default/known admin password shipped in source control.
async function seedAdmin(prisma: PrismaClient) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@visionanalytical.co.in';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn(
      'SEED_ADMIN_PASSWORD is not set - skipping admin bootstrap.\n' +
        'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD and re-run `npx prisma db seed` to create the first admin account.',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user ${adminEmail} already exists - skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: { email: adminEmail, name: 'Administrator', passwordHash, role: Role.ADMIN },
  });

  console.log(`Created admin user: ${adminEmail}`);
}

// Reference catalog data (categories + a couple of instruments per category).
// Idempotent: upserts by slug/sku so it's safe to re-run alongside migrations.
async function seedInstrumentCatalog(prisma: PrismaClient) {
  for (const category of INSTRUMENT_CATEGORIES) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        kind: CategoryKind.INSTRUMENT,
      },
    });

    for (const product of category.products) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          brand: product.brand,
          description: product.description,
          categoryId: savedCategory.id,
        },
        create: {
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          description: product.description,
          kind: ProductKind.INSTRUMENT,
          categoryId: savedCategory.id,
          images: [],
          compatibleBrands: [],
          stockStatus: StockStatus.MADE_TO_ORDER,
          priceMinor: null,
        },
      });
    }
  }

  console.log(`Seeded ${INSTRUMENT_CATEGORIES.length} instrument categories.`);
}

// Spare parts: one representative part per part-type category, so the store
// has a real, browsable catalog across every filter facet the UI exposes.
async function seedSparePartsCatalog(prisma: PrismaClient) {
  let index = 0;
  for (const category of SPARE_PART_CATEGORIES) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: {
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
        kind: CategoryKind.SPARE_PART,
      },
    });

    const stockStatus = index % 5 === 0 ? StockStatus.LOW_STOCK : StockStatus.IN_STOCK;
    index += 1;

    const part = category.part;
    await prisma.product.upsert({
      where: { sku: part.sku },
      update: {
        name: part.name,
        description: part.description,
        compatibleBrands: part.compatibleBrands,
        categoryId: savedCategory.id,
      },
      create: {
        sku: part.sku,
        slug: part.slug,
        name: part.name,
        description: part.description,
        compatibleBrands: part.compatibleBrands,
        kind: ProductKind.SPARE_PART,
        categoryId: savedCategory.id,
        images: [],
        stockStatus,
        stockQuantity: stockStatus === StockStatus.LOW_STOCK ? 3 : 25,
        priceMinor: null,
      },
    });
  }

  console.log(`Seeded ${SPARE_PART_CATEGORIES.length} spare part categories.`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  await seedAdmin(prisma);
  await seedInstrumentCatalog(prisma);
  await seedSparePartsCatalog(prisma);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
