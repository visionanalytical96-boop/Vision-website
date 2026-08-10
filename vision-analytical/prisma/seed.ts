import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  Role,
  CategoryKind,
  ProductKind,
  StockStatus,
  OrderStatus,
  QuoteStatus,
  InvoiceStatus,
  AmcType,
  AmcStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  Priority,
  HomeSectionKey,
  ContentPageKey,
} from '../src/generated/prisma/client';
import { generateReferenceNumber } from '../src/lib/reference-number';
import { INSTRUMENT_CATEGORIES } from './seed-data';
import { SPARE_PART_CATEGORIES } from './seed-data-spare-parts';
import { REFURBISHED_CATEGORIES } from './seed-data-refurbished';
import { BLOG_POSTS } from './seed-data-blog';
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_CATEGORIES_CONTENT,
  DEFAULT_LIFECYCLE_CONTENT,
  DEFAULT_WHY_US_CONTENT,
  DEFAULT_CTA_CONTENT,
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_SERVICES_CONTENT,
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_HEADER_CONTENT,
  DEFAULT_FOOTER_CONTENT,
} from '../src/lib/cms/defaults';

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

// Optional sample transactional data (customer, engineer, order, quote,
// service request, AMC contract, invoice) for local development/demos.
// Never runs unless explicitly opted into - this is not real customer data.
async function seedDemoData(prisma: PrismaClient) {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('SEED_DEMO_DATA is not "true" - skipping demo customer/transactional data.');
    return;
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Demo1234!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const customer = await prisma.user.upsert({
    where: { email: 'demo.customer@example.com' },
    update: {},
    create: {
      email: 'demo.customer@example.com',
      name: 'Demo Customer',
      companyName: 'Demo Labs Pvt Ltd',
      phone: '9876500001',
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'demo.engineer@example.com' },
    update: {},
    create: {
      email: 'demo.engineer@example.com',
      name: 'Demo Engineer',
      phone: '9876500002',
      passwordHash,
      role: Role.ENGINEER,
    },
  });

  const lamp = await prisma.product.findUnique({ where: { sku: 'SP-LAMP-001' } });
  const column = await prisma.product.findUnique({ where: { sku: 'SP-COL-001' } });

  if (!lamp || !column) {
    console.warn('Demo data: spare parts not found - run the catalog seed first. Skipping order/quote seed.');
    return;
  }

  let order = await prisma.order.findFirst({ where: { customerId: customer.id } });
  if (!order) {
    const address = {
      label: 'Lab',
      line1: 'Demo Labs Pvt Ltd, MIDC Industrial Area',
      city: 'Ambarnath',
      state: 'Maharashtra',
      postalCode: '421501',
      country: 'India',
    };

    order = await prisma.order.create({
      data: {
        orderNumber: generateReferenceNumber('ORD'),
        customerId: customer.id,
        status: OrderStatus.DELIVERED,
        subtotalMinor: 450000 + 800000,
        totalMinor: 450000 + 800000,
        shippingAddress: address,
        billingAddress: address,
        items: {
          create: [
            {
              productId: lamp.id,
              nameSnapshot: lamp.name,
              skuSnapshot: lamp.sku,
              unitPriceMinor: 450000,
              quantity: 1,
              lineTotalMinor: 450000,
            },
            {
              productId: column.id,
              nameSnapshot: column.name,
              skuSnapshot: column.sku,
              unitPriceMinor: 800000,
              quantity: 1,
              lineTotalMinor: 800000,
            },
          ],
        },
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: generateReferenceNumber('INV'),
        customerId: customer.id,
        orderId: order.id,
        amountMinor: order.totalMinor,
        status: InvoiceStatus.PAID,
        dueAt: order.createdAt,
      },
    });
  }

  const existingQuote = await prisma.quote.findFirst({ where: { customerId: customer.id } });
  if (!existingQuote) {
    await prisma.quote.create({
      data: {
        quoteNumber: generateReferenceNumber('QT'),
        customerId: customer.id,
        contactName: customer.name,
        contactEmail: customer.email,
        contactPhone: customer.phone,
        status: QuoteStatus.SENT,
        totalMinor: 125000,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        items: {
          create: [{ productId: lamp.id, description: lamp.name, quantity: 2, unitPriceMinor: 62500 }],
        },
      },
    });
  }

  let amc = await prisma.amcContract.findFirst({ where: { customerId: customer.id } });
  if (!amc) {
    amc = await prisma.amcContract.create({
      data: {
        contractNumber: generateReferenceNumber('AMC'),
        customerId: customer.id,
        type: AmcType.AMC,
        instrumentDescription: 'Shimadzu LC-2030C Plus (S/N DEMO-0001)',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        visitsIncluded: 4,
        visitsUsed: 1,
        priceMinor: 3500000,
        status: AmcStatus.ACTIVE,
      },
    });
  }

  const existingServiceRequest = await prisma.serviceRequest.findFirst({ where: { customerId: customer.id } });
  if (!existingServiceRequest) {
    await prisma.serviceRequest.create({
      data: {
        ticketNumber: generateReferenceNumber('SR'),
        customerId: customer.id,
        type: ServiceRequestType.PREVENTIVE_MAINTENANCE,
        priority: Priority.NORMAL,
        status: ServiceRequestStatus.ASSIGNED,
        instrumentDescription: 'Shimadzu LC-2030C Plus (S/N DEMO-0001)',
        description: 'Scheduled preventive maintenance visit under AMC.',
        assignedEngineerId: engineer.id,
        amcContractId: amc.id,
      },
    });
  }

  console.log('Seeded demo customer (demo.customer@example.com) and demo engineer (demo.engineer@example.com).');
}

// Site CMS: homepage sections, other page content, site settings and theme.
// Upserts so it's safe to re-run - existing admin edits are never
// overwritten, only missing rows get the launch-day defaults.
async function seedCms(prisma: PrismaClient) {
  const homeSections: Array<{ key: HomeSectionKey; sortOrder: number; content: object }> = [
    { key: HomeSectionKey.HERO, sortOrder: 0, content: DEFAULT_HERO_CONTENT },
    { key: HomeSectionKey.CATEGORIES, sortOrder: 1, content: DEFAULT_CATEGORIES_CONTENT },
    { key: HomeSectionKey.LIFECYCLE, sortOrder: 2, content: DEFAULT_LIFECYCLE_CONTENT },
    { key: HomeSectionKey.WHY_US, sortOrder: 3, content: DEFAULT_WHY_US_CONTENT },
    { key: HomeSectionKey.CTA, sortOrder: 4, content: DEFAULT_CTA_CONTENT },
  ];
  for (const section of homeSections) {
    await prisma.homeSection.upsert({
      where: { key: section.key },
      update: {},
      create: { key: section.key, sortOrder: section.sortOrder, content: section.content },
    });
  }

  const pageContents: Array<{ page: ContentPageKey; content: object }> = [
    { page: ContentPageKey.ABOUT, content: DEFAULT_ABOUT_CONTENT },
    { page: ContentPageKey.SERVICES, content: DEFAULT_SERVICES_CONTENT },
    { page: ContentPageKey.CONTACT, content: DEFAULT_CONTACT_CONTENT },
    { page: ContentPageKey.HEADER, content: DEFAULT_HEADER_CONTENT },
    { page: ContentPageKey.FOOTER, content: DEFAULT_FOOTER_CONTENT },
  ];
  for (const pageContent of pageContents) {
    await prisma.pageContent.upsert({
      where: { page: pageContent.page },
      update: {},
      create: { page: pageContent.page, content: pageContent.content },
    });
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      companyName: 'Vision Analytical',
      addressLine: 'Ambarnath',
      city: 'Ambarnath',
      state: 'Maharashtra',
      country: 'India',
    },
  });

  await prisma.themeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      primaryColor: '#2563eb',
      secondaryColor: '#22d3ee',
      fontHeading: 'syne',
      fontBody: 'space-grotesk',
      buttonStyle: 'rounded',
      animationsEnabled: true,
    },
  });

  console.log('Seeded site CMS defaults (homepage sections, page content, site & theme settings).');
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

  await seedDemoData(prisma);
  await seedCms(prisma);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
