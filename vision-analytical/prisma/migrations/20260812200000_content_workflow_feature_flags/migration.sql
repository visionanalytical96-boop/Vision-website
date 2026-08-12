-- Promote BlogPost.isPublished from a two-state boolean to the editorial
-- workflow, and add feature flags.
--
-- Hand-written: the generated diff would drop isPublished and lose which posts
-- were live. This backfills status from it, asserts nothing was lost, then
-- drops the column.

CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "BlogPost" ADD COLUMN "status" "ContentStatus";
ALTER TABLE "BlogPost" ADD COLUMN "publishAt" TIMESTAMP(3);
ALTER TABLE "BlogPost" ADD COLUMN "reviewNote" TEXT;

UPDATE "BlogPost" SET "status" = CASE WHEN "isPublished" THEN 'PUBLISHED'::"ContentStatus" ELSE 'DRAFT'::"ContentStatus" END;

-- A post that was live keeps its publish moment; NOT NULL below doubles as the
-- assertion that every row was assigned a status.
DO $$
DECLARE
    unassigned INTEGER;
    was_published INTEGER;
    now_published INTEGER;
BEGIN
    SELECT count(*) INTO unassigned FROM "BlogPost" WHERE "status" IS NULL;
    IF unassigned > 0 THEN
        RAISE EXCEPTION 'Content workflow backfill left % post(s) without a status', unassigned;
    END IF;

    SELECT count(*) INTO was_published FROM "BlogPost" WHERE "isPublished";
    SELECT count(*) INTO now_published FROM "BlogPost" WHERE "status" = 'PUBLISHED';
    IF was_published <> now_published THEN
        RAISE EXCEPTION 'Published count changed during backfill: % before, % after', was_published, now_published;
    END IF;
END $$;

ALTER TABLE "BlogPost" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "BlogPost" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP INDEX IF EXISTS "BlogPost_isPublished_idx";
ALTER TABLE "BlogPost" DROP COLUMN "isPublished";

CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");
CREATE INDEX "BlogPost_publishAt_idx" ON "BlogPost"("publishAt");

CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "FeatureFlag_group_sortOrder_idx" ON "FeatureFlag"("group", "sortOrder");
