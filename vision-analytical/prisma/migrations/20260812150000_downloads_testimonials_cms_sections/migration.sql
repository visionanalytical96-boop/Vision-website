-- Additive only: new enum members, two new tables. No existing row is touched.
--
-- The new HomeSectionKey/ContentPageKey members are deliberately NOT used to
-- INSERT rows here. Postgres will not let a transaction use an enum value it
-- added itself, and Prisma runs each migration inside one. The matching
-- HomeSection/PageContent rows are created by prisma/seed.ts instead, which is
-- also where every other default content row comes from.

ALTER TYPE "HomeSectionKey" ADD VALUE 'COMPANY_OVERVIEW';
ALTER TYPE "HomeSectionKey" ADD VALUE 'FEATURED_PRODUCTS';
ALTER TYPE "HomeSectionKey" ADD VALUE 'BRANDS';
ALTER TYPE "HomeSectionKey" ADD VALUE 'INDUSTRIES';
ALTER TYPE "HomeSectionKey" ADD VALUE 'KNOWLEDGE';
ALTER TYPE "HomeSectionKey" ADD VALUE 'TESTIMONIALS';
ALTER TYPE "HomeSectionKey" ADD VALUE 'CONTACT_BAND';

ALTER TYPE "ContentPageKey" ADD VALUE 'ANNOUNCEMENT';

CREATE TYPE "DownloadKind" AS ENUM (
    'DATASHEET',
    'MANUAL',
    'BROCHURE',
    'CATALOGUE',
    'APPLICATION_NOTE',
    'CERTIFICATE',
    'SOFTWARE'
);

CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "DownloadKind" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "fileType" TEXT,
    "brandId" TEXT,
    "categoryId" TEXT,
    "requiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Download_slug_key" ON "Download"("slug");
CREATE INDEX "Download_kind_idx" ON "Download"("kind");
CREATE INDEX "Download_brandId_idx" ON "Download"("brandId");
CREATE INDEX "Download_categoryId_idx" ON "Download"("categoryId");
CREATE INDEX "Download_isPublished_idx" ON "Download"("isPublished");

ALTER TABLE "Download" ADD CONSTRAINT "Download_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Download" ADD CONSTRAINT "Download_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT,
    "company" TEXT,
    "logoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Testimonial_sortOrder_idx" ON "Testimonial"("sortOrder");
