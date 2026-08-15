-- Promote compatibility from a free-text array to real rows, and add
-- structured specifications plus product-attached documents.
--
-- Hand-written rather than generated: the generated diff would DROP
-- Product.compatibleBrands and lose every value. This creates a Brand for any
-- name that doesn't have one yet, converts each array entry into a
-- ProductCompatibility row, asserts nothing was dropped, and only then drops
-- the column.

CREATE TABLE "InstrumentModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstrumentModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstrumentModel_brandId_slug_key" ON "InstrumentModel"("brandId", "slug");
CREATE INDEX "InstrumentModel_brandId_idx" ON "InstrumentModel"("brandId");
CREATE INDEX "InstrumentModel_categoryId_idx" ON "InstrumentModel"("categoryId");

ALTER TABLE "InstrumentModel" ADD CONSTRAINT "InstrumentModel_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstrumentModel" ADD CONSTRAINT "InstrumentModel_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductCompatibility" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "instrumentModelId" TEXT,
    "note" TEXT,
    CONSTRAINT "ProductCompatibility_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductCompatibility_productId_idx" ON "ProductCompatibility"("productId");
CREATE INDEX "ProductCompatibility_brandId_idx" ON "ProductCompatibility"("brandId");
CREATE INDEX "ProductCompatibility_instrumentModelId_idx" ON "ProductCompatibility"("instrumentModelId");

-- Partial uniques rather than one composite: Postgres treats NULLs as
-- distinct, so a plain unique on (productId, brandId, instrumentModelId)
-- would happily allow the same brand-wide claim twice.
CREATE UNIQUE INDEX "ProductCompatibility_product_brand_key"
    ON "ProductCompatibility"("productId", "brandId") WHERE "instrumentModelId" IS NULL;
CREATE UNIQUE INDEX "ProductCompatibility_product_model_key"
    ON "ProductCompatibility"("productId", "instrumentModelId") WHERE "instrumentModelId" IS NOT NULL;

ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "ProductCompatibility_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "ProductCompatibility_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "ProductCompatibility_instrumentModelId_fkey"
    FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProductSpecification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "group" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductSpecification_productId_idx" ON "ProductSpecification"("productId");

ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Documents can now hang off a product.
ALTER TABLE "Download" ADD COLUMN "productId" TEXT;
CREATE INDEX "Download_productId_idx" ON "Download"("productId");
ALTER TABLE "Download" ADD CONSTRAINT "Download_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --- Backfill ---------------------------------------------------------------

-- Any compatibility brand without a Brand row gets one, so no value is lost to
-- a failed lookup.
INSERT INTO "Brand" ("id", "name", "slug", "updatedAt")
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    names.name,
    trim(both '-' from regexp_replace(lower(names.name), '[^a-z0-9]+', '-', 'g')),
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT trim(unnest("compatibleBrands")) AS name FROM "Product"
) AS names
WHERE names.name <> ''
  AND NOT EXISTS (SELECT 1 FROM "Brand" b WHERE lower(b.name) = lower(names.name));

-- One brand-wide compatibility row per (product, brand) pair.
INSERT INTO "ProductCompatibility" ("id", "productId", "brandId")
SELECT DISTINCT
    replace(gen_random_uuid()::text, '-', ''),
    src."productId",
    b."id"
FROM (
    SELECT p."id" AS "productId", trim(unnest(p."compatibleBrands")) AS "brandName"
    FROM "Product" p
) AS src
JOIN "Brand" b ON lower(b."name") = lower(src."brandName")
WHERE src."brandName" <> '';

-- Assert the conversion was lossless before the column goes: every distinct
-- (product, brand) pair that existed must now have a row.
DO $$
DECLARE
    expected INTEGER;
    actual INTEGER;
BEGIN
    SELECT count(*) INTO expected FROM (
        SELECT DISTINCT p."id", lower(trim(unnest(p."compatibleBrands"))) AS n
        FROM "Product" p
    ) AS pairs WHERE pairs.n <> '';

    SELECT count(*) INTO actual FROM "ProductCompatibility" WHERE "instrumentModelId" IS NULL;

    IF actual < expected THEN
        RAISE EXCEPTION 'Compatibility backfill lost rows: expected %, got %', expected, actual;
    END IF;
END $$;

ALTER TABLE "Product" DROP COLUMN "compatibleBrands";
