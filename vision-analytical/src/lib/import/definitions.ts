import 'server-only';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { defineImport, type AnyImportDefinition } from '@/lib/import/types';
import { toBoolean, toNumber, toMinorAmount, toDate, toList } from '@/lib/import/columns';
import { normaliseErrorCode } from '@/lib/article-kinds';
import {
  CategoryKind,
  ProductKind,
  StockStatus,
  ArticleKind,
  ContentStatus,
  DownloadKind,
  ErrorSeverity,
  Role,
} from '@/generated/prisma/enums';

/**
 * The importable entities.
 *
 * Each definition owns its columns, its validation and its writers. Adding an
 * entity means adding one definition here — the pipeline, the preview, the
 * templates and the admin screen all read from this registry and need no
 * change.
 */

// --- Shared helpers -----------------------------------------------------------

/** Case-insensitive lookup map, because nobody types brand names consistently. */
function byName<T extends { id: string; name: string }>(rows: T[]): Map<string, string> {
  return new Map(rows.map((row) => [row.name.trim().toLowerCase(), row.id]));
}

function required(row: Record<string, string>, key: string, label: string, errors: string[]): string {
  const value = row[key]?.trim() ?? '';
  if (value === '') errors.push(`${label} is required.`);
  return value;
}

/** Resolves a name to an id, recording a helpful error when it is unknown. */
function lookup(
  map: Map<string, string>,
  value: string,
  label: string,
  errors: string[],
  { optional = false } = {},
): string | null {
  const text = value.trim();
  if (text === '') {
    if (!optional) errors.push(`${label} is required.`);
    return null;
  }
  const id = map.get(text.toLowerCase());
  if (!id) errors.push(`${label} "${text}" does not exist. Create it first, or correct the spelling.`);
  return id ?? null;
}

function parseEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
  fallback: T,
  errors: string[],
): T {
  const text = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (text === '') return fallback;
  const match = allowed.find((option) => option === text);
  if (!match) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}. Got "${value}".`);
    return fallback;
  }
  return match;
}

// --- Products and spare parts -------------------------------------------------

interface ProductValue {
  sku: string;
  slug: string;
  name: string;
  kind: ProductKind;
  categoryId: string;
  brandId: string | null;
  description: string;
  priceMinor: number | null;
  stockStatus: StockStatus;
  stockQuantity: number;
  isPublished: boolean;
}

interface CatalogueContext {
  categories: Map<string, string>;
  brands: Map<string, string>;
}

function productColumns(categoryWord: string) {
  return [
    { key: 'sku', label: 'SKU', required: true, description: 'Your unique code for this item.', example: 'VA-HPLC-001', aliases: ['code', 'part number', 'part no', 'item code'] },
    { key: 'name', label: 'Name', required: true, description: 'Product name as customers should see it.', example: 'Alliance e2695 Separations Module' },
    { key: 'category', label: 'Category', required: true, description: `${categoryWord} category name. Must already exist.`, example: 'HPLC', aliases: ['technique'] },
    { key: 'brand', label: 'Brand', required: false, description: 'Manufacturer name. Must already exist.', example: 'Waters', aliases: ['make', 'manufacturer'] },
    { key: 'description', label: 'Description', required: true, description: 'What it is. Shown on the product page.', example: 'Integrated separations module with column heater.' },
    { key: 'price', label: 'Price (₹)', required: false, description: 'Leave blank for price-on-request.', example: '125000', aliases: ['mrp', 'rate', 'amount'] },
    { key: 'stockStatus', label: 'Stock status', required: false, description: 'IN_STOCK, LOW_STOCK, OUT_OF_STOCK or MADE_TO_ORDER.', example: 'IN_STOCK' },
    { key: 'stockQuantity', label: 'Stock quantity', required: false, description: 'Whole number. Defaults to 0.', example: '4', aliases: ['qty', 'quantity'] },
    { key: 'slug', label: 'Slug', required: false, description: 'URL segment. Generated from the name if blank.', example: 'alliance-e2695' },
    { key: 'isPublished', label: 'Published', required: false, description: 'yes or no. Defaults to yes.', example: 'yes', aliases: ['active', 'visible'] },
  ];
}

function productDefinition(key: string, label: string, kind: ProductKind, categoryKind: CategoryKind) {
  return defineImport<ProductValue, CatalogueContext>({
    key,
    label,
    description: `${label} matched by SKU. An existing SKU is updated, a new one is created.`,
    duplicateBy: 'SKU',
    columns: productColumns(categoryKind === CategoryKind.INSTRUMENT ? 'Instrument' : 'Spare part'),

    async loadContext() {
      const [categories, brands] = await Promise.all([
        prisma.category.findMany({ where: { kind: categoryKind }, select: { id: true, name: true } }),
        prisma.brand.findMany({ select: { id: true, name: true } }),
      ]);
      return { categories: byName(categories), brands: byName(brands) };
    },

    validateRow(row, context) {
      const errors: string[] = [];
      const sku = required(row, 'sku', 'SKU', errors);
      const name = required(row, 'name', 'Name', errors);
      const description = required(row, 'description', 'Description', errors);
      const categoryId = lookup(context.categories, row.category ?? '', 'Category', errors);
      const brandId = lookup(context.brands, row.brand ?? '', 'Brand', errors, { optional: true });

      const stockQuantity = row.stockQuantity?.trim() ? toNumber(row.stockQuantity) : 0;
      if (stockQuantity === null) errors.push('Stock quantity must be a number.');

      const priceMinor = row.price?.trim() ? toMinorAmount(row.price) : null;
      if (row.price?.trim() && priceMinor === null) errors.push('Price must be a number.');

      const stockStatus = parseEnum(
        row.stockStatus ?? '',
        Object.values(StockStatus),
        'Stock status',
        StockStatus.IN_STOCK,
        errors,
      );

      if (errors.length > 0) return { ok: false, errors };

      return {
        ok: true,
        key: sku.toLowerCase(),
        value: {
          sku,
          slug: row.slug?.trim() ? slugify(row.slug) : slugify(name),
          name,
          kind,
          categoryId: categoryId as string,
          brandId,
          description,
          priceMinor,
          stockStatus,
          stockQuantity: stockQuantity ?? 0,
          isPublished: toBoolean(row.isPublished ?? '', true),
        },
      };
    },

    async findExisting(keys) {
      const rows = await prisma.product.findMany({
        where: { sku: { in: keys } },
        select: { id: true, sku: true },
      });
      return new Map(rows.map((row) => [row.sku.toLowerCase(), row.id]));
    },

    async create(tx, value) {
      // A slug clash is not a duplicate product: two brands legitimately have a
      // "1260 Infinity". Suffix rather than reject the row.
      const clash = await tx.product.findUnique({ where: { slug: value.slug }, select: { id: true } });
      const slug = clash ? `${value.slug}-${value.sku.toLowerCase()}` : value.slug;
      const created = await tx.product.create({ data: { ...value, slug, images: [] } });
      return created.id;
    },

    async update(tx, id, value) {
      // Slug is left alone on update: changing it breaks existing links and any
      // search engine result already pointing at the page.
      const { slug: _slug, sku: _sku, ...rest } = value;
      await tx.product.update({ where: { id }, data: rest });
    },
  });
}

// --- Instrument models --------------------------------------------------------

interface ModelValue {
  brandId: string;
  name: string;
  slug: string;
  categoryId: string | null;
  description: string | null;
  isPublished: boolean;
}

const instrumentModels = defineImport<ModelValue, CatalogueContext>({
  key: 'instrument-models',
  label: 'Instrument models',
  description: 'The instruments customers own. Spare parts map to these, and the parts finder searches them.',
  duplicateBy: 'brand + model name',
  columns: [
    { key: 'brand', label: 'Brand', required: true, description: 'Manufacturer name. Must already exist.', example: 'Waters', aliases: ['make', 'manufacturer'] },
    { key: 'name', label: 'Model name', required: true, description: 'As printed on the instrument.', example: 'Alliance e2695', aliases: ['model'] },
    { key: 'category', label: 'Technique', required: false, description: 'Instrument category name.', example: 'HPLC' },
    { key: 'description', label: 'Description', required: false, description: 'Optional note.', example: 'Separations module' },
    { key: 'slug', label: 'Slug', required: false, description: 'Generated from the name if blank.', example: 'alliance-e2695' },
    { key: 'isPublished', label: 'Published', required: false, description: 'yes or no. Defaults to yes.', example: 'yes' },
  ],

  async loadContext() {
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ where: { kind: CategoryKind.INSTRUMENT }, select: { id: true, name: true } }),
      prisma.brand.findMany({ select: { id: true, name: true } }),
    ]);
    return { categories: byName(categories), brands: byName(brands) };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const name = required(row, 'name', 'Model name', errors);
    const brandId = lookup(context.brands, row.brand ?? '', 'Brand', errors);
    const categoryId = lookup(context.categories, row.category ?? '', 'Technique', errors, { optional: true });
    if (errors.length > 0) return { ok: false, errors };

    const slug = row.slug?.trim() ? slugify(row.slug) : slugify(name);
    return {
      ok: true,
      // Unique per brand, matching the database constraint.
      key: `${brandId}|${slug}`,
      value: {
        brandId: brandId as string,
        name,
        slug,
        categoryId,
        description: row.description?.trim() || null,
        isPublished: toBoolean(row.isPublished ?? '', true),
      },
    };
  },

  async findExisting() {
    const rows = await prisma.instrumentModel.findMany({ select: { id: true, brandId: true, slug: true } });
    return new Map(rows.map((row) => [`${row.brandId}|${row.slug}`, row.id]));
  },

  async create(tx, value) {
    const created = await tx.instrumentModel.create({ data: value });
    return created.id;
  },

  async update(tx, id, value) {
    const { slug: _slug, brandId: _brandId, ...rest } = value;
    await tx.instrumentModel.update({ where: { id }, data: rest });
  },
});

// --- Companies ----------------------------------------------------------------

interface CompanyValue {
  name: string;
  slug: string;
  gstin: string | null;
  industry: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
}

const companies = defineImport<CompanyValue, null>({
  key: 'companies',
  label: 'Companies',
  description: 'Customer organisations — laboratories, hospitals, plants. Contacts are linked to these.',
  duplicateBy: 'company name',
  columns: [
    { key: 'name', label: 'Company name', required: true, description: 'The organisation name.', example: 'Sunrise Analytical Labs Pvt Ltd', aliases: ['company', 'organisation', 'organization'] },
    { key: 'gstin', label: 'GSTIN', required: false, description: 'GST identification number.', example: '27AABCU9603R1ZX', aliases: ['gst', 'gst number'] },
    { key: 'industry', label: 'Industry', required: false, description: 'Pharma, food, environmental, academic…', example: 'Pharmaceutical' },
    { key: 'addressLine', label: 'Address', required: false, description: 'Street address.', example: 'Plot 12, MIDC Phase II', aliases: ['address line'] },
    { key: 'city', label: 'City', required: false, description: '', example: 'Ambarnath' },
    { key: 'state', label: 'State', required: false, description: '', example: 'Maharashtra' },
    { key: 'postalCode', label: 'PIN code', required: false, description: '', example: '421501', aliases: ['pin', 'pincode', 'zip'] },
    { key: 'phone', label: 'Phone', required: false, description: '', example: '022 12345678' },
    { key: 'email', label: 'Email', required: false, description: 'General enquiry address.', example: 'lab@example.com' },
    { key: 'website', label: 'Website', required: false, description: '', example: 'https://example.com' },
    { key: 'notes', label: 'Notes', required: false, description: 'Internal notes.', example: '' },
    { key: 'isActive', label: 'Active', required: false, description: 'yes or no. Defaults to yes.', example: 'yes' },
  ],

  async loadContext() {
    return null;
  },

  validateRow(row) {
    const errors: string[] = [];
    const name = required(row, 'name', 'Company name', errors);
    const email = row.email?.trim() ?? '';
    if (email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`"${email}" is not a valid email address.`);
    if (errors.length > 0) return { ok: false, errors };

    return {
      ok: true,
      key: name.toLowerCase(),
      value: {
        name,
        slug: slugify(name),
        gstin: row.gstin?.trim() || null,
        industry: row.industry?.trim() || null,
        addressLine: row.addressLine?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        postalCode: row.postalCode?.trim() || null,
        phone: row.phone?.trim() || null,
        email: email || null,
        website: row.website?.trim() || null,
        notes: row.notes?.trim() || null,
        isActive: toBoolean(row.isActive ?? '', true),
      },
    };
  },

  async findExisting(keys) {
    const rows = await prisma.company.findMany({
      where: { name: { in: keys, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
  },

  async create(tx, value) {
    const clash = await tx.company.findUnique({ where: { slug: value.slug }, select: { id: true } });
    const created = await tx.company.create({
      data: { ...value, slug: clash ? `${value.slug}-${Date.now().toString(36)}` : value.slug },
    });
    return created.id;
  },

  async update(tx, id, value) {
    const { slug: _slug, ...rest } = value;
    await tx.company.update({ where: { id }, data: rest });
  },
});

// --- Customers ----------------------------------------------------------------

interface CustomerValue {
  email: string;
  name: string;
  phone: string | null;
  companyName: string | null;
  companyId: string | null;
  isActive: boolean;
}

const customers = defineImport<CustomerValue, { companies: Map<string, string> }>({
  key: 'customers',
  label: 'Customers',
  description:
    'Customer contacts. Imported accounts have no password — each person sets one through "forgot password", so no known credential is ever created.',
  duplicateBy: 'email address',
  columns: [
    { key: 'email', label: 'Email', required: true, description: 'Their login. Must be unique.', example: 'qc@sunriselabs.com' },
    { key: 'name', label: 'Full name', required: true, description: '', example: 'Priya Sharma', aliases: ['contact name', 'contact person'] },
    { key: 'phone', label: 'Phone', required: false, description: '', example: '9820011223', aliases: ['mobile'] },
    { key: 'company', label: 'Company', required: false, description: 'Links to a company of this name if one exists.', example: 'Sunrise Analytical Labs Pvt Ltd', aliases: ['organisation', 'company name'] },
    { key: 'isActive', label: 'Active', required: false, description: 'yes or no. Defaults to yes.', example: 'yes' },
  ],

  async loadContext() {
    const rows = await prisma.company.findMany({ select: { id: true, name: true } });
    return { companies: byName(rows) };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const email = required(row, 'email', 'Email', errors).toLowerCase();
    const name = required(row, 'name', 'Full name', errors);
    if (email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`"${email}" is not a valid email address.`);

    const companyName = row.company?.trim() ?? '';
    // A company that doesn't exist is not an error: the name is kept on the
    // contact and can be linked later, rather than failing the whole import.
    const companyId = companyName === '' ? null : (context.companies.get(companyName.toLowerCase()) ?? null);

    if (errors.length > 0) return { ok: false, errors };

    return {
      ok: true,
      key: email,
      value: {
        email,
        name,
        phone: row.phone?.trim() || null,
        companyName: companyName || null,
        companyId,
        isActive: toBoolean(row.isActive ?? '', true),
      },
    };
  },

  async findExisting(keys) {
    const rows = await prisma.user.findMany({ where: { email: { in: keys } }, select: { id: true, email: true } });
    return new Map(rows.map((row) => [row.email.toLowerCase(), row.id]));
  },

  async create(tx, value) {
    // An unusable bcrypt-shaped hash: the account cannot be logged into until
    // the person sets a password themselves. Never a shared default.
    const created = await tx.user.create({
      data: { ...value, role: Role.CUSTOMER, passwordHash: 'imported-no-password-set' },
    });
    return created.id;
  },

  async update(tx, id, value) {
    // Email is the key and the password is untouched: an import must never
    // change how someone signs in.
    const { email: _email, ...rest } = value;
    await tx.user.update({ where: { id }, data: rest });
  },
});

// --- Knowledge articles -------------------------------------------------------

interface ArticleValue {
  slug: string;
  title: string;
  kind: ArticleKind;
  topicId: string | null;
  excerpt: string;
  content: string;
  status: ContentStatus;
  errorCode: string | null;
  tagNames: string[];
}

const knowledgeArticles = defineImport<ArticleValue, { topics: Map<string, string>; authorId: string | null }>({
  key: 'knowledge-articles',
  label: 'Knowledge articles',
  description: 'Articles, guides, FAQs and troubleshooting content, matched by slug.',
  duplicateBy: 'slug',
  columns: [
    { key: 'title', label: 'Title', required: true, description: '', example: 'Diagnosing HPLC baseline noise' },
    { key: 'kind', label: 'Type', required: false, description: `One of: ${Object.values(ArticleKind).join(', ')}.`, example: 'TROUBLESHOOTING', aliases: ['article type'] },
    { key: 'topic', label: 'Topic', required: false, description: 'Subject area name, e.g. HPLC.', example: 'HPLC', aliases: ['technique', 'category'] },
    { key: 'excerpt', label: 'Summary', required: true, description: 'One or two sentences, shown in listings.', example: 'A checklist for tracking down a drifting baseline.' },
    { key: 'content', label: 'Content', required: true, description: 'The full article body.', example: 'Start at the detector…' },
    { key: 'status', label: 'Status', required: false, description: `One of: ${Object.values(ContentStatus).join(', ')}. Defaults to DRAFT.`, example: 'PUBLISHED' },
    { key: 'errorCode', label: 'Error code', required: false, description: 'If the article explains one specific code.', example: 'E-1201' },
    { key: 'tags', label: 'Tags', required: false, description: 'Comma separated.', example: 'baseline, pump' },
    { key: 'slug', label: 'Slug', required: false, description: 'Generated from the title if blank.', example: 'hplc-baseline-noise' },
  ],

  async loadContext() {
    const [topics, admin] = await Promise.all([
      prisma.knowledgeTopic.findMany({ select: { id: true, name: true } }),
      prisma.user.findFirst({ where: { role: Role.ADMIN, isActive: true }, select: { id: true } }),
    ]);
    return { topics: byName(topics), authorId: admin?.id ?? null };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const title = required(row, 'title', 'Title', errors);
    const excerpt = required(row, 'excerpt', 'Summary', errors);
    const content = required(row, 'content', 'Content', errors);
    const topicId = lookup(context.topics, row.topic ?? '', 'Topic', errors, { optional: true });

    const kind = parseEnum(row.kind ?? '', Object.values(ArticleKind), 'Type', ArticleKind.ARTICLE, errors);
    const status = parseEnum(row.status ?? '', Object.values(ContentStatus), 'Status', ContentStatus.DRAFT, errors);

    if (context.authorId === null) {
      errors.push('No active admin account exists to attribute the article to.');
    }
    if (errors.length > 0) return { ok: false, errors };

    const slug = row.slug?.trim() ? slugify(row.slug) : slugify(title);
    return {
      ok: true,
      key: slug,
      value: {
        slug,
        title,
        kind,
        topicId,
        excerpt,
        content,
        status,
        errorCode: row.errorCode?.trim() || null,
        tagNames: toList(row.tags ?? ''),
      },
    };
  },

  async findExisting(keys) {
    const rows = await prisma.knowledgeArticle.findMany({
      where: { slug: { in: keys } },
      select: { id: true, slug: true },
    });
    return new Map(rows.map((row) => [row.slug, row.id]));
  },

  async create(tx, value) {
    const admin = await tx.user.findFirst({ where: { role: Role.ADMIN, isActive: true }, select: { id: true } });
    const { tagNames, ...rest } = value;
    const created = await tx.knowledgeArticle.create({
      data: {
        ...rest,
        authorId: admin?.id as string,
        publishedAt: value.status === ContentStatus.PUBLISHED ? new Date() : null,
      },
    });
    await writeTags(tx, created.id, tagNames);
    return created.id;
  },

  async update(tx, id, value) {
    const { tagNames, slug: _slug, ...rest } = value;
    await tx.knowledgeArticle.update({ where: { id }, data: rest });
    await writeTags(tx, id, tagNames);
  },
});

async function writeTags(tx: Parameters<AnyImportDefinition['create']>[0], articleId: string, names: string[]) {
  if (names.length === 0) return;
  const ids: string[] = [];
  for (const name of names) {
    const tag = await tx.tag.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    ids.push(tag.id);
  }
  await tx.knowledgeArticleTag.deleteMany({ where: { articleId } });
  await tx.knowledgeArticleTag.createMany({ data: ids.map((tagId) => ({ articleId, tagId })) });
}

// --- Downloads ----------------------------------------------------------------

interface DownloadValue {
  slug: string;
  title: string;
  description: string | null;
  kind: DownloadKind;
  fileUrl: string;
  brandId: string | null;
  topicId: string | null;
  requiresLogin: boolean;
  isPublished: boolean;
}

const downloads = defineImport<DownloadValue, { brands: Map<string, string>; topics: Map<string, string> }>({
  key: 'downloads',
  label: 'Downloads',
  description: 'Manuals, datasheets, brochures and certificates, matched by slug.',
  duplicateBy: 'slug',
  columns: [
    { key: 'title', label: 'Title', required: true, description: '', example: 'Alliance e2695 Operator Manual' },
    { key: 'kind', label: 'Type', required: true, description: `One of: ${Object.values(DownloadKind).join(', ')}.`, example: 'MANUAL' },
    { key: 'fileUrl', label: 'File URL', required: true, description: 'Path or link to the file.', example: '/uploads/downloads/manual.pdf', aliases: ['url', 'file', 'link'] },
    { key: 'description', label: 'Description', required: false, description: '', example: 'Full operating manual, revision C.' },
    { key: 'brand', label: 'Brand', required: false, description: 'Manufacturer name.', example: 'Waters' },
    { key: 'topic', label: 'Topic', required: false, description: 'Subject area, e.g. HPLC.', example: 'HPLC' },
    { key: 'requiresLogin', label: 'Login required', required: false, description: 'yes or no. Defaults to no.', example: 'no' },
    { key: 'isPublished', label: 'Published', required: false, description: 'yes or no. Defaults to yes.', example: 'yes' },
    { key: 'slug', label: 'Slug', required: false, description: 'Generated from the title if blank.', example: 'alliance-e2695-manual' },
  ],

  async loadContext() {
    const [brands, topics] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.knowledgeTopic.findMany({ select: { id: true, name: true } }),
    ]);
    return { brands: byName(brands), topics: byName(topics) };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const title = required(row, 'title', 'Title', errors);
    const fileUrl = required(row, 'fileUrl', 'File URL', errors);
    const kind = parseEnum(row.kind ?? '', Object.values(DownloadKind), 'Type', DownloadKind.MANUAL, errors);
    const brandId = lookup(context.brands, row.brand ?? '', 'Brand', errors, { optional: true });
    const topicId = lookup(context.topics, row.topic ?? '', 'Topic', errors, { optional: true });

    // A file reference that points nowhere becomes a broken download nobody
    // notices until a customer clicks it.
    if (fileUrl !== '' && !/^(https?:\/\/|\/)/.test(fileUrl)) {
      errors.push('File URL must start with "/" or "http".');
    }
    if (errors.length > 0) return { ok: false, errors };

    const slug = row.slug?.trim() ? slugify(row.slug) : slugify(title);
    return {
      ok: true,
      key: slug,
      value: {
        slug,
        title,
        description: row.description?.trim() || null,
        kind,
        fileUrl,
        brandId,
        topicId,
        requiresLogin: toBoolean(row.requiresLogin ?? '', false),
        isPublished: toBoolean(row.isPublished ?? '', true),
      },
    };
  },

  async findExisting(keys) {
    const rows = await prisma.download.findMany({ where: { slug: { in: keys } }, select: { id: true, slug: true } });
    return new Map(rows.map((row) => [row.slug, row.id]));
  },

  async create(tx, value) {
    const created = await tx.download.create({ data: value });
    return created.id;
  },

  async update(tx, id, value) {
    const { slug: _slug, ...rest } = value;
    await tx.download.update({ where: { id }, data: rest });
  },
});

// --- Error codes --------------------------------------------------------------

interface ErrorCodeValue {
  code: string;
  normalisedCode: string;
  brandId: string | null;
  instrumentModelId: string | null;
  topicId: string | null;
  title: string;
  description: string | null;
  possibleCauses: string | null;
  recommendedSolution: string | null;
  severity: ErrorSeverity;
  status: ContentStatus;
}

interface ErrorCodeContext {
  brands: Map<string, string>;
  topics: Map<string, string>;
  /** Keyed "brandid|modelname" — model names are only unique within a brand. */
  models: Map<string, string>;
}

const errorCodes = defineImport<ErrorCodeValue, ErrorCodeContext>({
  key: 'error-codes',
  label: 'Error codes',
  description: 'Manufacturer error codes with cause and fix. The same code means different things on different instruments, so identity is code + brand + model.',
  duplicateBy: 'code + brand + model',
  columns: [
    { key: 'code', label: 'Code', required: true, description: 'As printed on the instrument.', example: 'E-1201' },
    { key: 'title', label: 'Meaning', required: true, description: 'Short description of what the code means.', example: 'Pump pressure below lower limit' },
    { key: 'brand', label: 'Brand', required: false, description: 'Manufacturer name.', example: 'Waters' },
    { key: 'model', label: 'Instrument model', required: false, description: 'Model name. Requires the brand.', example: 'Alliance e2695' },
    { key: 'topic', label: 'Topic', required: false, description: 'Subject area, e.g. HPLC.', example: 'HPLC' },
    { key: 'description', label: 'Description', required: false, description: 'Fuller explanation.', example: '' },
    { key: 'possibleCauses', label: 'Possible causes', required: false, description: 'What usually causes it.', example: 'Leak at the pump head; air in the line.', aliases: ['cause', 'causes'] },
    { key: 'recommendedSolution', label: 'Recommended solution', required: false, description: 'What to do about it.', example: 'Purge the pump, then check fittings.', aliases: ['solution', 'fix', 'remedy'] },
    { key: 'severity', label: 'Severity', required: false, description: `One of: ${Object.values(ErrorSeverity).join(', ')}. Defaults to MEDIUM.`, example: 'HIGH' },
    { key: 'status', label: 'Status', required: false, description: 'Defaults to PUBLISHED.', example: 'PUBLISHED' },
  ],

  async loadContext() {
    const [brands, topics, models] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.knowledgeTopic.findMany({ select: { id: true, name: true } }),
      prisma.instrumentModel.findMany({ select: { id: true, name: true, brandId: true } }),
    ]);
    return {
      brands: byName(brands),
      topics: byName(topics),
      models: new Map(models.map((m) => [`${m.brandId}|${m.name.trim().toLowerCase()}`, m.id])),
    };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const code = required(row, 'code', 'Code', errors);
    const title = required(row, 'title', 'Meaning', errors);
    const brandId = lookup(context.brands, row.brand ?? '', 'Brand', errors, { optional: true });
    const topicId = lookup(context.topics, row.topic ?? '', 'Topic', errors, { optional: true });

    let instrumentModelId: string | null = null;
    const modelName = row.model?.trim() ?? '';
    if (modelName !== '') {
      if (!brandId) {
        errors.push('An instrument model needs its brand as well, since model names repeat across manufacturers.');
      } else {
        instrumentModelId = context.models.get(`${brandId}|${modelName.toLowerCase()}`) ?? null;
        if (!instrumentModelId) errors.push(`Instrument model "${modelName}" does not exist for that brand.`);
      }
    }

    const severity = parseEnum(row.severity ?? '', Object.values(ErrorSeverity), 'Severity', ErrorSeverity.MEDIUM, errors);
    const status = parseEnum(row.status ?? '', Object.values(ContentStatus), 'Status', ContentStatus.PUBLISHED, errors);
    if (errors.length > 0) return { ok: false, errors };

    const normalisedCode = normaliseErrorCode(code);
    return {
      ok: true,
      // Mirrors the COALESCE unique index in the database.
      key: `${normalisedCode}|${brandId ?? ''}|${instrumentModelId ?? ''}`,
      value: {
        code,
        normalisedCode,
        brandId,
        instrumentModelId,
        topicId,
        title,
        description: row.description?.trim() || null,
        possibleCauses: row.possibleCauses?.trim() || null,
        recommendedSolution: row.recommendedSolution?.trim() || null,
        severity,
        status,
      },
    };
  },

  async findExisting() {
    const rows = await prisma.errorCode.findMany({
      select: { id: true, normalisedCode: true, brandId: true, instrumentModelId: true },
    });
    return new Map(
      rows.map((row) => [`${row.normalisedCode}|${row.brandId ?? ''}|${row.instrumentModelId ?? ''}`, row.id]),
    );
  },

  async create(tx, value) {
    const created = await tx.errorCode.create({ data: value });
    return created.id;
  },

  async update(tx, id, value) {
    await tx.errorCode.update({ where: { id }, data: value });
  },
});

// --- Service reports ----------------------------------------------------------

interface ServiceReportValue {
  serviceRequestId: string;
  engineerId: string;
  workPerformed: string;
  partsUsed: string[];
  reportedAt: Date;
}

const serviceReports = defineImport<
  ServiceReportValue,
  { requests: Map<string, string>; engineers: Map<string, string> }
>({
  key: 'service-reports',
  label: 'Service reports',
  description:
    'Completed job write-ups. Each attaches to an existing service request by its ticket number — a report with no job is a claim about work nobody can trace.',
  duplicateBy: 'ticket number + report date',
  columns: [
    { key: 'ticketNumber', label: 'Ticket number', required: true, description: 'The service request this report belongs to. Must already exist.', example: 'SR-2026-0042', aliases: ['ticket', 'service request'] },
    { key: 'engineerEmail', label: 'Engineer email', required: true, description: 'Which engineer did the work. Must be an existing engineer account.', example: 'engineer@visionanalytical.co.in', aliases: ['engineer'] },
    { key: 'workPerformed', label: 'Work performed', required: true, description: 'What was done on site.', example: 'Replaced pump seals, purged system, verified pressure.' },
    { key: 'partsUsed', label: 'Parts used', required: false, description: 'Comma separated part names or SKUs.', example: 'VA-SEAL-01, VA-FRIT-02' },
    { key: 'reportedAt', label: 'Report date', required: false, description: 'dd/mm/yyyy or yyyy-mm-dd. Defaults to today.', example: '12/08/2026', aliases: ['date'] },
  ],

  async loadContext() {
    const [requests, engineers] = await Promise.all([
      prisma.serviceRequest.findMany({ select: { id: true, ticketNumber: true } }),
      prisma.user.findMany({ where: { role: Role.ENGINEER }, select: { id: true, email: true } }),
    ]);
    return {
      requests: new Map(requests.map((r) => [r.ticketNumber.trim().toLowerCase(), r.id])),
      engineers: new Map(engineers.map((e) => [e.email.toLowerCase(), e.id])),
    };
  },

  validateRow(row, context) {
    const errors: string[] = [];
    const ticket = required(row, 'ticketNumber', 'Ticket number', errors);
    const engineerEmail = required(row, 'engineerEmail', 'Engineer email', errors).toLowerCase();
    const workPerformed = required(row, 'workPerformed', 'Work performed', errors);

    const serviceRequestId = ticket === '' ? null : (context.requests.get(ticket.toLowerCase()) ?? null);
    if (ticket !== '' && !serviceRequestId) {
      errors.push(`No service request with ticket number "${ticket}". Import the service requests first.`);
    }
    const engineerId = engineerEmail === '' ? null : (context.engineers.get(engineerEmail) ?? null);
    if (engineerEmail !== '' && !engineerId) {
      errors.push(`"${engineerEmail}" is not an engineer account.`);
    }

    const reportedAt = row.reportedAt?.trim() ? toDate(row.reportedAt) : new Date();
    if (row.reportedAt?.trim() && reportedAt === null) {
      errors.push(`Could not read the report date "${row.reportedAt}". Use dd/mm/yyyy or yyyy-mm-dd.`);
    }
    if (errors.length > 0) return { ok: false, errors };

    return {
      ok: true,
      key: `${serviceRequestId}|${(reportedAt as Date).toISOString().slice(0, 10)}`,
      value: {
        serviceRequestId: serviceRequestId as string,
        engineerId: engineerId as string,
        workPerformed,
        partsUsed: toList(row.partsUsed ?? ''),
        reportedAt: reportedAt as Date,
      },
    };
  },

  async findExisting() {
    const rows = await prisma.serviceReport.findMany({
      select: { id: true, serviceRequestId: true, reportedAt: true },
    });
    return new Map(
      rows.map((row) => [`${row.serviceRequestId}|${row.reportedAt.toISOString().slice(0, 10)}`, row.id]),
    );
  },

  async create(tx, value) {
    const created = await tx.serviceReport.create({ data: { ...value, partsUsed: value.partsUsed, photos: [] } });
    return created.id;
  },

  async update(tx, id, value) {
    await tx.serviceReport.update({
      where: { id },
      data: { workPerformed: value.workPerformed, partsUsed: value.partsUsed, engineerId: value.engineerId },
    });
  },
});

// --- Registry -----------------------------------------------------------------

export const IMPORT_DEFINITIONS: AnyImportDefinition[] = [
  productDefinition('products', 'Products', ProductKind.INSTRUMENT, CategoryKind.INSTRUMENT),
  productDefinition('spare-parts', 'Spare parts', ProductKind.SPARE_PART, CategoryKind.SPARE_PART),
  instrumentModels,
  companies,
  customers,
  knowledgeArticles,
  downloads,
  errorCodes,
  serviceReports,
];

export function getImportDefinition(key: string): AnyImportDefinition | null {
  return IMPORT_DEFINITIONS.find((definition) => definition.key === key) ?? null;
}
