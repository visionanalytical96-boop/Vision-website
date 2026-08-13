-- Company as a real entity, replacing the free-text User.companyName.
--
-- One laboratory has a QC manager, a purchase officer and a lab head, each
-- needing their own login while sharing one account, one GSTIN and one address.
-- A string on each user cannot express that, and cannot be corrected in one
-- place when the name has been typed three different ways.
--
-- Additive: companyName is kept alongside the new companyId so nothing that
-- reads it breaks. Existing names are backfilled into real Company rows and
-- linked, so no information is left behind in the string column.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gstin" TEXT,
    "industry" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Backfill: one Company per distinct non-blank companyName, then link the
-- users to it. Names are compared case-insensitively and trimmed, so
-- "Demo Labs", "demo labs " and "DEMO LABS" become one company rather than
-- three. gen_random_uuid() is built in from Postgres 13; no extension needed.
INSERT INTO "Company" ("id", "name", "slug", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  MIN(btrim("companyName")),
  -- Slug: lowercase, non-alphanumerics to hyphens, trimmed.
  btrim(regexp_replace(lower(MIN(btrim("companyName"))), '[^a-z0-9]+', '-', 'g'), '-'),
  now(),
  now()
FROM "User"
WHERE "companyName" IS NOT NULL AND btrim("companyName") <> ''
GROUP BY lower(btrim("companyName"))
ON CONFLICT ("name") DO NOTHING;

UPDATE "User" u
   SET "companyId" = c."id"
  FROM "Company" c
 WHERE u."companyName" IS NOT NULL
   AND btrim(u."companyName") <> ''
   AND lower(btrim(u."companyName")) = lower(c."name")
   AND u."companyId" IS NULL;

-- Every user who had a company name must now be linked to one. Abort rather
-- than leave records half-migrated and silently unlinked.
DO $$
DECLARE
  unlinked INT;
BEGIN
  SELECT count(*) INTO unlinked FROM "User"
   WHERE "companyName" IS NOT NULL AND btrim("companyName") <> '' AND "companyId" IS NULL;
  IF unlinked > 0 THEN
    RAISE EXCEPTION 'Backfill left % user(s) with a company name but no Company row', unlinked;
  END IF;
END $$;
