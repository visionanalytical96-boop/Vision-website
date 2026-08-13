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
  ContentStatus,
} from '../src/generated/prisma/client';
import { generateReferenceNumber } from '../src/lib/reference-number';
import { INSTRUMENT_CATEGORIES } from './seed-data';
import { SPARE_PART_CATEGORIES } from './seed-data-spare-parts';
import { REFURBISHED_CATEGORIES } from './seed-data-refurbished';
import { BLOG_POSTS } from './seed-data-blog';
import { INSTRUMENT_MODELS } from './seed-data-instrument-models';
import { FEATURE_FLAGS, FEATURE_FLAG_KEYS } from '../src/lib/features';
import { KNOWLEDGE_TOPIC_SEEDS } from '../src/lib/knowledge-topics';
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
  DEFAULT_COMPANY_OVERVIEW_CONTENT,
  DEFAULT_FEATURED_PRODUCTS_CONTENT,
  DEFAULT_BRANDS_SECTION_CONTENT,
  DEFAULT_INDUSTRIES_CONTENT,
  DEFAULT_KNOWLEDGE_CONTENT,
  DEFAULT_TESTIMONIALS_CONTENT,
  DEFAULT_CONTACT_BAND_CONTENT,
  DEFAULT_ANNOUNCEMENT_CONTENT,
} from '../src/lib/cms/defaults';

// Bootstraps the first Admin account. Safe to re-run: does nothing unless
// SEED_ADMIN_PASSWORD is set, and skips if the account already exists - so
// there is never a default/known admin password shipped in source control.
// Returns the admin's id (existing or newly created) so it can author seed
// blog posts, or null if no admin exists yet to attribute them to.
async function seedAdmin(prisma: PrismaClient): Promise<{ id: string } | null> {
  // Normalised the same way loginSchema normalises the submitted email
  // (trim + lowercase). Without this, a SEED_ADMIN_EMAIL containing any
  // uppercase creates an account that login can never match - the lookup
  // is case-sensitive, so a correct password still returns "Invalid email
  // or password".
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@visionanalytical.co.in').trim().toLowerCase();
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
/// The manufacturers Vision Analytical sells, services or stocks parts for.
/// Idempotent by slug so re-running the seed never duplicates or overwrites
/// admin-edited copy - only name and sort order are kept in sync.
const BRANDS = [
  { slug: 'waters', name: 'Waters', sortOrder: 10 },
  { slug: 'shimadzu', name: 'Shimadzu', sortOrder: 20 },
  { slug: 'agilent-technologies', name: 'Agilent Technologies', sortOrder: 30 },
  { slug: 'thermo-scientific', name: 'Thermo Scientific', sortOrder: 40 },
  { slug: 'perkinelmer', name: 'PerkinElmer', sortOrder: 50 },
  { slug: 'sciex', name: 'SCIEX', sortOrder: 60 },
  { slug: 'restek', name: 'Restek', sortOrder: 70 },
  { slug: 'hitachi', name: 'Hitachi', sortOrder: 80 },
  { slug: 'younglin', name: 'Younglin', sortOrder: 90 },
  { slug: 'jasco', name: 'Jasco', sortOrder: 100 },
];

async function seedBrands(prisma: PrismaClient): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();
  for (const brand of BRANDS) {
    const saved = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, sortOrder: brand.sortOrder },
      create: { slug: brand.slug, name: brand.name, sortOrder: brand.sortOrder },
    });
    bySlug.set(saved.name, saved.id);
  }
  console.log(`Seeded ${BRANDS.length} brands.`);
  return bySlug;
}

async function seedInstrumentCatalog(prisma: PrismaClient, brandIds: Map<string, string>) {
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
          brandId: product.brand ? (brandIds.get(product.brand) ?? null) : null,
          description: product.description,
          categoryId: savedCategory.id,
        },
        create: {
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          brandId: product.brand ? (brandIds.get(product.brand) ?? null) : null,
          description: product.description,
          kind: ProductKind.INSTRUMENT,
          categoryId: savedCategory.id,
          images: [],
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
async function seedSparePartsCatalog(prisma: PrismaClient, brandIds: Map<string, string>) {
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
    const savedPart = await prisma.product.upsert({
      where: { sku: part.sku },
      update: {
        name: part.name,
        description: part.description,
        categoryId: savedCategory.id,
      },
      create: {
        sku: part.sku,
        slug: part.slug,
        name: part.name,
        description: part.description,
        kind: ProductKind.SPARE_PART,
        categoryId: savedCategory.id,
        images: [],
        stockStatus,
        stockQuantity: stockStatus === StockStatus.LOW_STOCK ? 3 : 25,
        priceMinor: null,
      },
    });

    // Brand-wide compatibility (no model): these representative parts are
    // universal fittings. Model-specific claims are an admin's job.
    for (const brandName of part.compatibleBrands) {
      const brandId = requireBrandId(brandIds, brandName);
      const existing = await prisma.productCompatibility.findFirst({
        where: { productId: savedPart.id, brandId, instrumentModelId: null },
      });
      if (!existing) {
        await prisma.productCompatibility.create({ data: { productId: savedPart.id, brandId } });
      }
    }
  }

  console.log(`Seeded ${SPARE_PART_CATEGORIES.length} spare part categories.`);
}

// Starter instrument models, so the parts finder has something to search.
// Created only when missing, so admin edits and deletions survive a re-run.
async function seedInstrumentModels(prisma: PrismaClient, brandIds: Map<string, string>) {
  const categories = await prisma.category.findMany({
    where: { kind: CategoryKind.INSTRUMENT },
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  let created = 0;
  for (const model of INSTRUMENT_MODELS) {
    const brand = BRANDS.find((candidate) => candidate.slug === model.brandSlug);
    if (!brand) {
      throw new Error(
        `Instrument model "${model.name}" references brand slug "${model.brandSlug}", which is not in BRANDS.`,
      );
    }
    const brandId = requireBrandId(brandIds, brand.name);

    const existing = await prisma.instrumentModel.findUnique({
      where: { brandId_slug: { brandId, slug: model.slug } },
    });
    if (existing) continue;

    await prisma.instrumentModel.create({
      data: {
        brandId,
        name: model.name,
        slug: model.slug,
        description: model.description ?? null,
        categoryId: model.categorySlug ? (categoryIdBySlug.get(model.categorySlug) ?? null) : null,
      },
    });
    created += 1;
  }

  console.log(`Seeded instrument models (${created} new, ${INSTRUMENT_MODELS.length - created} already present).`);
}

// Refurbished instruments: one validated, warranty-backed unit per category.
function requireBrandId(brandIds: Map<string, string>, name: string): string {
  const id = brandIds.get(name);
  if (!id) {
    throw new Error(
      `Seed data references brand "${name}", which is not in the BRANDS list. Add it there first.`,
    );
  }
  return id;
}

async function seedRefurbishedInstruments(prisma: PrismaClient, brandIds: Map<string, string>) {
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
        brandId: requireBrandId(brandIds, instrument.brand),
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
        brandId: requireBrandId(brandIds, instrument.brand),
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
/**
 * The subject areas the knowledge base is organised by.
 *
 * Upserted by slug and never overwritten, so renaming a topic in the admin
 * survives a re-seed. Where a topic matches an instrument category we link
 * them, which is what lets a topic page offer "browse HPLC instruments"
 * without a second copy of the category tree.
 */
async function seedKnowledgeTopics(prisma: PrismaClient): Promise<Map<string, string>> {
  const categories = await prisma.category.findMany({
    where: { kind: CategoryKind.INSTRUMENT },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const topicIds = new Map<string, string>();

  for (const [index, topic] of KNOWLEDGE_TOPIC_SEEDS.entries()) {
    const saved = await prisma.knowledgeTopic.upsert({
      where: { slug: topic.slug },
      update: {},
      create: {
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        icon: topic.icon,
        // A topic whose category doesn't exist still gets created - the link is
        // a convenience, not a requirement.
        categoryId: topic.categorySlug ? (categoryBySlug.get(topic.categorySlug) ?? null) : null,
        sortOrder: index,
      },
    });
    topicIds.set(topic.slug, saved.id);
  }

  console.log(`Seeded ${KNOWLEDGE_TOPIC_SEEDS.length} knowledge topics.`);
  return topicIds;
}

async function seedBlogPosts(prisma: PrismaClient, authorId: string, topicIds: Map<string, string>) {
  for (const post of BLOG_POSTS) {
    const topicId = post.topicSlug ? (topicIds.get(post.topicSlug) ?? null) : null;
    await prisma.knowledgeArticle.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        kind: post.kind,
        topicId,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        kind: post.kind,
        topicId,
        authorId,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`Seeded ${BLOG_POSTS.length} knowledge articles.`);
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

/**
 * Creates any homepage section the database doesn't have yet, and slots it
 * into the running order without disturbing the admin's own arrangement.
 *
 * A new release adds sections in the middle of the canonical order, so a plain
 * upsert with a hardcoded sortOrder would collide with the numbers an existing
 * install already uses. Instead: keep the current rows in their current
 * relative order, drop each new section in after its nearest canonical
 * predecessor, then renumber the whole list. Only the integers move, never the
 * order an admin chose.
 */
async function seedHomeSectionOrder(
  prisma: PrismaClient,
  canonical: Array<{ key: HomeSectionKey; content: object }>,
) {
  const existing = await prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } });
  const existingKeys = new Set(existing.map((section) => section.key));

  const order: HomeSectionKey[] = existing.map((section) => section.key);
  for (const [index, { key }] of canonical.entries()) {
    if (existingKeys.has(key)) continue;

    // Nearest canonical predecessor that's actually present decides the slot;
    // with none present (fresh database) the section goes to the end, which
    // reproduces the canonical order exactly.
    let insertAt = order.length;
    for (let back = index - 1; back >= 0; back -= 1) {
      const position = order.indexOf(canonical[back].key);
      if (position !== -1) {
        insertAt = position + 1;
        break;
      }
    }
    order.splice(insertAt, 0, key);
    existingKeys.add(key);
  }

  const contentByKey = new Map(canonical.map(({ key, content }) => [key, content]));
  for (const [sortOrder, key] of order.entries()) {
    await prisma.homeSection.upsert({
      where: { key },
      // Content is never overwritten - an admin's edits outrank the defaults.
      update: { sortOrder },
      create: { key, sortOrder, content: contentByKey.get(key) ?? {} },
    });
  }
}

// Feature flags: the registry holds the defaults, so a row only exists once
// someone has changed one. Seeding them up front gives the admin page real
// rows to show and makes the current state visible in the database.
async function seedFeatureFlags(prisma: PrismaClient) {
  for (const key of FEATURE_FLAG_KEYS) {
    const meta = FEATURE_FLAGS[key];
    await prisma.featureFlag.upsert({
      where: { key },
      // Never overwrite an admin's choice - only keep the copy in sync.
      update: { label: meta.label, description: meta.description, group: meta.group, sortOrder: meta.sortOrder },
      create: {
        key,
        label: meta.label,
        description: meta.description,
        group: meta.group,
        sortOrder: meta.sortOrder,
        isEnabled: meta.defaultEnabled,
      },
    });
  }
  console.log(`Seeded ${FEATURE_FLAG_KEYS.length} feature flags.`);
}

// Site CMS: homepage sections, other page content, site settings and theme.
// Upserts so it's safe to re-run - existing admin edits are never
// overwritten, only missing rows get the launch-day defaults.
async function seedCms(prisma: PrismaClient) {
  // The launch-day running order of the homepage.
  const homeSections: Array<{ key: HomeSectionKey; content: object }> = [
    { key: HomeSectionKey.HERO, content: DEFAULT_HERO_CONTENT },
    { key: HomeSectionKey.COMPANY_OVERVIEW, content: DEFAULT_COMPANY_OVERVIEW_CONTENT },
    { key: HomeSectionKey.CATEGORIES, content: DEFAULT_CATEGORIES_CONTENT },
    { key: HomeSectionKey.FEATURED_PRODUCTS, content: DEFAULT_FEATURED_PRODUCTS_CONTENT },
    { key: HomeSectionKey.BRANDS, content: DEFAULT_BRANDS_SECTION_CONTENT },
    { key: HomeSectionKey.LIFECYCLE, content: DEFAULT_LIFECYCLE_CONTENT },
    { key: HomeSectionKey.INDUSTRIES, content: DEFAULT_INDUSTRIES_CONTENT },
    { key: HomeSectionKey.WHY_US, content: DEFAULT_WHY_US_CONTENT },
    { key: HomeSectionKey.KNOWLEDGE, content: DEFAULT_KNOWLEDGE_CONTENT },
    { key: HomeSectionKey.TESTIMONIALS, content: DEFAULT_TESTIMONIALS_CONTENT },
    { key: HomeSectionKey.CONTACT_BAND, content: DEFAULT_CONTACT_BAND_CONTENT },
    { key: HomeSectionKey.CTA, content: DEFAULT_CTA_CONTENT },
  ];
  await seedHomeSectionOrder(prisma, homeSections);

  const pageContents: Array<{ page: ContentPageKey; content: object }> = [
    { page: ContentPageKey.ABOUT, content: DEFAULT_ABOUT_CONTENT },
    { page: ContentPageKey.SERVICES, content: DEFAULT_SERVICES_CONTENT },
    { page: ContentPageKey.CONTACT, content: DEFAULT_CONTACT_CONTENT },
    { page: ContentPageKey.ANNOUNCEMENT, content: DEFAULT_ANNOUNCEMENT_CONTENT },
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

// Team reference data: the lists an HR page is unusable without.
//
// Deliberately no employees. Staff records are real people with real joining
// dates and phone numbers - inventing them would put fiction in front of
// whoever opens the page first. Departments, leave types and the attendance
// rule are structure, not claims about anyone, so they are safe to ship.
async function seedTeamDefaults(prisma: PrismaClient) {
  const departments: Array<{ name: string; slug: string; description: string; designations: string[] }> = [
    {
      name: 'Sales',
      slug: 'sales',
      description: 'Enquiries, quotations and order closure.',
      designations: ['Sales Executive', 'Sales Manager', 'Business Development Executive'],
    },
    {
      name: 'Service',
      slug: 'service',
      description: 'Installation, breakdown calls, AMC visits and calibration.',
      designations: ['Service Engineer', 'Senior Service Engineer', 'Service Manager'],
    },
    {
      name: 'Accounts',
      slug: 'accounts',
      description: 'Invoicing, payments, GST and payroll.',
      designations: ['Accounts Executive', 'Accounts Manager'],
    },
    {
      name: 'Warehouse',
      slug: 'warehouse',
      description: 'Stock, dispatch and inward material.',
      designations: ['Store Keeper', 'Dispatch Executive', 'Warehouse Manager'],
    },
    {
      name: 'Administration',
      slug: 'administration',
      description: 'HR, office administration and management.',
      designations: ['HR Executive', 'Office Administrator', 'Director'],
    },
  ];

  for (const [index, dept] of departments.entries()) {
    const saved = await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: { name: dept.name, slug: dept.slug, description: dept.description, sortOrder: index },
    });

    for (const [position, name] of dept.designations.entries()) {
      await prisma.designation.upsert({
        where: { name_departmentId: { name, departmentId: saved.id } },
        update: {},
        create: { name, departmentId: saved.id, sortOrder: position },
      });
    }
  }

  // Starting quotas. Entitlements differ by state and by company policy, so
  // these are defaults to edit in Team → Settings, not a statutory statement.
  const leaveTypes = [
    { name: 'Casual Leave', code: 'CL', annualQuota: 12, isPaid: true, requiresAttachment: false },
    { name: 'Sick Leave', code: 'SL', annualQuota: 12, isPaid: true, requiresAttachment: false },
    { name: 'Earned Leave', code: 'EL', annualQuota: 15, isPaid: true, requiresAttachment: false },
    { name: 'Leave Without Pay', code: 'LWP', annualQuota: null, isPaid: false, requiresAttachment: false },
  ];
  for (const [index, type] of leaveTypes.entries()) {
    await prisma.leaveType.upsert({
      where: { code: type.code },
      update: {},
      create: { ...type, sortOrder: index },
    });
  }

  // One active policy to start from. Every attendance calculation reads this,
  // so the module has to work before anyone has visited the settings page.
  if ((await prisma.attendanceRule.count()) === 0) {
    await prisma.attendanceRule.create({ data: { name: 'Default' } });
  }

  // Only the three national holidays with fixed dates. Festival dates follow
  // the lunar calendar and shift every year - guessing them would put wrong
  // dates in a calendar people plan leave against.
  const year = new Date().getFullYear();
  const nationalHolidays = [
    { month: 1, day: 26, name: 'Republic Day' },
    { month: 8, day: 15, name: 'Independence Day' },
    { month: 10, day: 2, name: 'Gandhi Jayanti' },
  ];
  for (const holiday of nationalHolidays) {
    const date = new Date(Date.UTC(year, holiday.month - 1, holiday.day));
    await prisma.holiday.upsert({
      where: { date_name: { date, name: holiday.name } },
      update: {},
      create: { date, name: holiday.name },
    });
  }

  console.log(
    `Seeded team defaults: ${departments.length} departments, ${leaveTypes.length} leave types, ` +
      `an attendance rule and ${nationalHolidays.length} national holidays for ${year}. No employees - add them in Team → Employees.`,
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  const admin = await seedAdmin(prisma);
  const brandIds = await seedBrands(prisma);
  await seedInstrumentCatalog(prisma, brandIds);
  await seedSparePartsCatalog(prisma, brandIds);
  await seedInstrumentModels(prisma, brandIds);
  await seedRefurbishedInstruments(prisma, brandIds);

  const topicIds = await seedKnowledgeTopics(prisma);

  if (admin) {
    await seedBlogPosts(prisma, admin.id, topicIds);
  } else {
    console.log('Skipping blog post seed - no admin user available to author them.');
  }

  await seedDemoData(prisma);
  await seedCms(prisma);
  await seedFeatureFlags(prisma);
  await seedTeamDefaults(prisma);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
