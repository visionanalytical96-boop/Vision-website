-- Knowledge Center: topics, article types, tags, revisions, error codes,
-- service cases, the troubleshooting wizard and a search log.
--
-- One destructive change: BlogPost.category is dropped. It conflated *what a
-- piece is* with *what it is about* - "TROUBLESHOOTING" was both a category and
-- a kind - which left no way to file a troubleshooting guide under HPLC. Kind
-- now carries the content type and the new topicId carries the subject.
--
-- The column is backfilled into `kind` before it is dropped, and the backfill
-- asserts it left nothing behind rather than trusting itself.

-- Promote the old category into `kind` wherever `kind` still holds its default
-- and the category said something `kind` did not. Rows already carrying a real
-- kind (VIDEO, CASE_STUDY, ERROR_CODE) keep it - the category was redundant
-- there. TECHNICAL_ARTICLE maps to ARTICLE, which is where it already is.
UPDATE "BlogPost" SET "kind" = 'TROUBLESHOOTING'
  WHERE "kind" = 'ARTICLE' AND "category" = 'TROUBLESHOOTING';
UPDATE "BlogPost" SET "kind" = 'FAQ'
  WHERE "kind" = 'ARTICLE' AND "category" = 'FAQ';
UPDATE "BlogPost" SET "kind" = 'GUIDE'
  WHERE "kind" = 'ARTICLE' AND "category" = 'INSTRUMENT_GUIDE';

-- Abort rather than drop a column that still carries meaning.
DO $$
DECLARE
  unmapped INT;
BEGIN
  SELECT count(*) INTO unmapped FROM "BlogPost"
   WHERE "kind" = 'ARTICLE'
     AND "category" IN ('TROUBLESHOOTING', 'FAQ', 'INSTRUMENT_GUIDE');
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'Refusing to drop category: % row(s) would lose their only classification', unmapped;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ArticleKind" ADD VALUE 'APPLICATION_NOTE';
ALTER TYPE "ArticleKind" ADD VALUE 'INSTALLATION_GUIDE';
ALTER TYPE "ArticleKind" ADD VALUE 'MAINTENANCE_GUIDE';
ALTER TYPE "ArticleKind" ADD VALUE 'CALIBRATION_GUIDE';
ALTER TYPE "ArticleKind" ADD VALUE 'TRAINING_GUIDE';
ALTER TYPE "ArticleKind" ADD VALUE 'BEST_PRACTICE';
ALTER TYPE "ArticleKind" ADD VALUE 'RELEASE_NOTE';
ALTER TYPE "ArticleKind" ADD VALUE 'PRODUCT_UPDATE';

-- DropIndex
DROP INDEX "BlogPost_category_idx";

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "category",
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Download" ADD COLUMN     "topicId" TEXT;

-- DropEnum
DROP TYPE "BlogCategory";

-- CreateTable
CREATE TABLE "KnowledgeTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "categoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "editedById" TEXT,
    "editorLabel" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "normalisedCode" TEXT NOT NULL,
    "brandId" TEXT,
    "instrumentModelId" TEXT,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "possibleCauses" TEXT,
    "recommendedSolution" TEXT,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'MEDIUM',
    "articleId" TEXT,
    "videoUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorCodePart" (
    "id" TEXT NOT NULL,
    "errorCodeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ErrorCodePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorCodeDocument" (
    "id" TEXT NOT NULL,
    "errorCodeId" TEXT NOT NULL,
    "downloadId" TEXT NOT NULL,

    CONSTRAINT "ErrorCodeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brandId" TEXT,
    "instrumentModelId" TEXT,
    "topicId" TEXT,
    "serviceReportId" TEXT,
    "articleId" TEXT,
    "problem" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "engineerNotes" TEXT,
    "timeTakenMinutes" INTEGER,
    "customerIndustry" TEXT,
    "beforeImageUrl" TEXT,
    "afterImageUrl" TEXT,
    "occurredOn" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCasePart" (
    "id" TEXT NOT NULL,
    "serviceCaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ServiceCasePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroubleshootingSymptom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brandId" TEXT,
    "instrumentModelId" TEXT,
    "topicId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TroubleshootingSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroubleshootingCause" (
    "id" TEXT NOT NULL,
    "symptomId" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "howToCheck" TEXT,
    "solution" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "articleId" TEXT,
    "errorCodeId" TEXT,

    CONSTRAINT "TroubleshootingCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroubleshootingCausePart" (
    "id" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "TroubleshootingCausePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalisedTerm" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeTopic_name_key" ON "KnowledgeTopic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeTopic_slug_key" ON "KnowledgeTopic"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeTopic_sortOrder_idx" ON "KnowledgeTopic"("sortOrder");

-- CreateIndex
CREATE INDEX "KnowledgeTopic_isActive_idx" ON "KnowledgeTopic"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeArticleTag_tagId_idx" ON "KnowledgeArticleTag"("tagId");

-- CreateIndex
CREATE INDEX "ArticleRevision_articleId_idx" ON "ArticleRevision"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleRevision_articleId_version_key" ON "ArticleRevision"("articleId", "version");

-- CreateIndex
CREATE INDEX "ErrorCode_normalisedCode_idx" ON "ErrorCode"("normalisedCode");

-- CreateIndex
CREATE INDEX "ErrorCode_brandId_idx" ON "ErrorCode"("brandId");

-- CreateIndex
CREATE INDEX "ErrorCode_instrumentModelId_idx" ON "ErrorCode"("instrumentModelId");

-- CreateIndex
CREATE INDEX "ErrorCode_status_idx" ON "ErrorCode"("status");

-- CreateIndex
CREATE INDEX "ErrorCode_severity_idx" ON "ErrorCode"("severity");

-- CreateIndex
CREATE INDEX "ErrorCodePart_productId_idx" ON "ErrorCodePart"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorCodePart_errorCodeId_productId_key" ON "ErrorCodePart"("errorCodeId", "productId");

-- CreateIndex
CREATE INDEX "ErrorCodeDocument_downloadId_idx" ON "ErrorCodeDocument"("downloadId");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorCodeDocument_errorCodeId_downloadId_key" ON "ErrorCodeDocument"("errorCodeId", "downloadId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCase_reference_key" ON "ServiceCase"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCase_slug_key" ON "ServiceCase"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCase_serviceReportId_key" ON "ServiceCase"("serviceReportId");

-- CreateIndex
CREATE INDEX "ServiceCase_brandId_idx" ON "ServiceCase"("brandId");

-- CreateIndex
CREATE INDEX "ServiceCase_instrumentModelId_idx" ON "ServiceCase"("instrumentModelId");

-- CreateIndex
CREATE INDEX "ServiceCase_topicId_idx" ON "ServiceCase"("topicId");

-- CreateIndex
CREATE INDEX "ServiceCase_status_idx" ON "ServiceCase"("status");

-- CreateIndex
CREATE INDEX "ServiceCasePart_productId_idx" ON "ServiceCasePart"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCasePart_serviceCaseId_productId_key" ON "ServiceCasePart"("serviceCaseId", "productId");

-- CreateIndex
CREATE INDEX "TroubleshootingSymptom_brandId_idx" ON "TroubleshootingSymptom"("brandId");

-- CreateIndex
CREATE INDEX "TroubleshootingSymptom_instrumentModelId_idx" ON "TroubleshootingSymptom"("instrumentModelId");

-- CreateIndex
CREATE INDEX "TroubleshootingSymptom_topicId_idx" ON "TroubleshootingSymptom"("topicId");

-- CreateIndex
CREATE INDEX "TroubleshootingSymptom_isActive_idx" ON "TroubleshootingSymptom"("isActive");

-- CreateIndex
CREATE INDEX "TroubleshootingCause_symptomId_idx" ON "TroubleshootingCause"("symptomId");

-- CreateIndex
CREATE INDEX "TroubleshootingCausePart_productId_idx" ON "TroubleshootingCausePart"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TroubleshootingCausePart_causeId_productId_key" ON "TroubleshootingCausePart"("causeId", "productId");

-- CreateIndex
CREATE INDEX "SearchQuery_normalisedTerm_idx" ON "SearchQuery"("normalisedTerm");

-- CreateIndex
CREATE INDEX "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");

-- CreateIndex
CREATE INDEX "SearchQuery_resultCount_idx" ON "SearchQuery"("resultCount");

-- CreateIndex
CREATE INDEX "SearchQuery_source_idx" ON "SearchQuery"("source");

-- CreateIndex
CREATE INDEX "BlogPost_topicId_idx" ON "BlogPost"("topicId");

-- CreateIndex
CREATE INDEX "BlogPost_viewCount_idx" ON "BlogPost"("viewCount");

-- CreateIndex
CREATE INDEX "Download_topicId_idx" ON "Download"("topicId");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTopic" ADD CONSTRAINT "KnowledgeTopic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleTag" ADD CONSTRAINT "KnowledgeArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleTag" ADD CONSTRAINT "KnowledgeArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCode" ADD CONSTRAINT "ErrorCode_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCode" ADD CONSTRAINT "ErrorCode_instrumentModelId_fkey" FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCode" ADD CONSTRAINT "ErrorCode_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCode" ADD CONSTRAINT "ErrorCode_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCodePart" ADD CONSTRAINT "ErrorCodePart_errorCodeId_fkey" FOREIGN KEY ("errorCodeId") REFERENCES "ErrorCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCodePart" ADD CONSTRAINT "ErrorCodePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCodeDocument" ADD CONSTRAINT "ErrorCodeDocument_errorCodeId_fkey" FOREIGN KEY ("errorCodeId") REFERENCES "ErrorCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorCodeDocument" ADD CONSTRAINT "ErrorCodeDocument_downloadId_fkey" FOREIGN KEY ("downloadId") REFERENCES "Download"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_instrumentModelId_fkey" FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCasePart" ADD CONSTRAINT "ServiceCasePart_serviceCaseId_fkey" FOREIGN KEY ("serviceCaseId") REFERENCES "ServiceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCasePart" ADD CONSTRAINT "ServiceCasePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingSymptom" ADD CONSTRAINT "TroubleshootingSymptom_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingSymptom" ADD CONSTRAINT "TroubleshootingSymptom_instrumentModelId_fkey" FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingSymptom" ADD CONSTRAINT "TroubleshootingSymptom_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingCause" ADD CONSTRAINT "TroubleshootingCause_symptomId_fkey" FOREIGN KEY ("symptomId") REFERENCES "TroubleshootingSymptom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingCause" ADD CONSTRAINT "TroubleshootingCause_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingCause" ADD CONSTRAINT "TroubleshootingCause_errorCodeId_fkey" FOREIGN KEY ("errorCodeId") REFERENCES "ErrorCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingCausePart" ADD CONSTRAINT "TroubleshootingCausePart_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "TroubleshootingCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroubleshootingCausePart" ADD CONSTRAINT "TroubleshootingCausePart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Error code identity: the same printed code means different things on
-- different instruments, so a code is unique per brand and model rather than
-- globally. COALESCE rather than a plain composite unique because Postgres
-- treats NULLs as distinct, which would let "E-1201 (no brand)" be entered
-- twice.
CREATE UNIQUE INDEX "ErrorCode_identity_key"
  ON "ErrorCode" ("normalisedCode", COALESCE("brandId", ''), COALESCE("instrumentModelId", ''));

-- Symptom slugs are unique within the instrument they belong to, for the same
-- reason and by the same means.
CREATE UNIQUE INDEX "TroubleshootingSymptom_identity_key"
  ON "TroubleshootingSymptom" ("slug", COALESCE("brandId", ''), COALESCE("instrumentModelId", ''));
