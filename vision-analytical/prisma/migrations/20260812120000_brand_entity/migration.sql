-- Promote `brand` from a free-text column to a first-class Brand entity.
-- Hand-written rather than generated: the generated diff would DROP the brand
-- columns and lose every existing value. This backfills first, then drops.

CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "website" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX "Brand_sortOrder_idx" ON "Brand"("sortOrder");

-- One Brand row per distinct value already present on either table.
INSERT INTO "Brand" ("id", "name", "slug", "updatedAt")
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    src.name,
    trim(both '-' from regexp_replace(lower(src.name), '[^a-z0-9]+', '-', 'g')),
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT btrim("brand") AS name FROM "Product"
     WHERE "brand" IS NOT NULL AND btrim("brand") <> ''
    UNION
    SELECT DISTINCT btrim("brand") FROM "RefurbishedInstrument"
     WHERE "brand" IS NOT NULL AND btrim("brand") <> ''
) AS src;

-- Product: optional brand.
ALTER TABLE "Product" ADD COLUMN "brandId" TEXT;
UPDATE "Product" p SET "brandId" = b."id" FROM "Brand" b WHERE btrim(p."brand") = b."name";
ALTER TABLE "Product" DROP COLUMN "brand";
ALTER TABLE "Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId")
    REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- RefurbishedInstrument: brand is required, so backfill before enforcing NOT NULL.
ALTER TABLE "RefurbishedInstrument" ADD COLUMN "brandId" TEXT;
UPDATE "RefurbishedInstrument" r SET "brandId" = b."id"
  FROM "Brand" b WHERE btrim(r."brand") = b."name";
ALTER TABLE "RefurbishedInstrument" ALTER COLUMN "brandId" SET NOT NULL;
ALTER TABLE "RefurbishedInstrument" DROP COLUMN "brand";
ALTER TABLE "RefurbishedInstrument"
    ADD CONSTRAINT "RefurbishedInstrument_brandId_fkey" FOREIGN KEY ("brandId")
    REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RefurbishedInstrument_brandId_idx" ON "RefurbishedInstrument"("brandId");
