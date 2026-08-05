import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, CategoryKind, ProductKind, StockStatus } from '../src/generated/prisma/client';
import { INSTRUMENT_CATEGORIES } from './seed-data';
import { SPARE_PART_CATEGORIES } from './seed-data-spare-parts';
import { REFURBISHED_CATEGORIES } from './seed-data-refurbished';
import { BLOG_POSTS } from './seed-data-blog';

// Bootstraps the first Admin account. Safe to re-run: does nothing unless
// SEED_ADMIN_PASSWORD is set, and skips if the account already exists - so
// there is never a default/known admin password shipped in source control.
// Returns the admin's id (existing or newly created) so it can author seed
// blog posts, or null if no admin exists yet to attribute them to.
async function seedAdmin(prisma: PrismaClient): Promise<{ id: string } | null> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@visionanalytical.co.in';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user ${adminEmail} already exists - skipping.`);
    return { id: existing.id };
  }

  if (!adminPassword) {
    console.warn(
      'SEED_ADMIN_PASSWORD is not set - skipping admin bootstrap.\n' +
        'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD and re-run `npx prisma db seed` to create the first admin account.',
    );
    return null;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: { email: adminEmail, name: 'Administrator', passwordHash, role: Role.ADMIN },
  });

  console.log(`Created admin user: ${adminEmail}`);
  return { id: admin.id };
}

// Reference catalog data (categories + a couple of instruments per category).
// Idempotent: upserts by slug/sku so it's safe to re-run alongside migrations.
async function seedInstrumentCatalog(prisma: PrismaClient) {
  for (const category of INSTRUMENT_CATEGORIES) {
    const savedCategory = await prisma.category.upsert({
      where: { slug_kind: { slug: category.slug, kind: CategoryKind.INSTRUMENT } },
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
      where: { slug_kind: { slug: category.slug, kind: CategoryKind.SPARE_PART } },
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

// Refurbished instruments: one validated, warranty-backed unit per category.
async function seedRefurbishedInstruments(prisma: PrismaClient) {
  for (const category of REFURBISHED_CATEGORIES) {
    const savedCategory = await prisma.category.upsert({
      where: { slug_kind: { slug: category.slug, kind: CategoryKind.REFURBISHED } },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: {
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
        kind: CategoryKind.REFURBISHED,
      },
    });

    const instrument = category.instrument;
    await prisma.refurbishedInstrument.upsert({
      where: { slug: instrument.slug },
      update: {
        name: instrument.name,
        brand: instrument.brand,
        model: instrument.model,
        condition: instrument.condition,
        includedAccessories: instrument.includedAccessories,
        warrantyMonths: instrument.warrantyMonths,
        description: instrument.description,
        categoryId: savedCategory.id,
      },
      create: {
        slug: instrument.slug,
        name: instrument.name,
        brand: instrument.brand,
        model: instrument.model,
        condition: instrument.condition,
        includedAccessories: instrument.includedAccessories,
        warrantyMonths: instrument.warrantyMonths,
        description: instrument.description,
        categoryId: savedCategory.id,
        images: [],
        stockStatus: StockStatus.IN_STOCK,
        priceMinor: null,
      },
    });
  }

  console.log(`Seeded ${REFURBISHED_CATEGORIES.length} refurbished instrument categories.`);
}

// Knowledge Center content, attributed to the admin account.
async function seedBlogPosts(prisma: PrismaClient, authorId: string) {
  for (const post of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        authorId,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`Seeded ${BLOG_POSTS.length} blog posts.`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  const admin = await seedAdmin(prisma);
  await seedInstrumentCatalog(prisma);
  await seedSparePartsCatalog(prisma);
  await seedRefurbishedInstruments(prisma);

  if (admin) {
    await seedBlogPosts(prisma, admin.id);
  } else {
    console.log('Skipping blog post seed - no admin user available to author them.');
  }

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
