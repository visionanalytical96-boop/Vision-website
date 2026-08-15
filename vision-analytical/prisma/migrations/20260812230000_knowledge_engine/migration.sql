-- The Knowledge Engine: articles gain a kind, an error code, a video and view
-- counting, and can be linked to the brands, models and products they explain.
--
-- The Prisma model was renamed BlogPost -> KnowledgeArticle. That is a
-- code-level rename via @@map: the table keeps its name, so there is no table
-- rename here and no data moves. Only the additive columns below are new.

CREATE TYPE "ArticleKind" AS ENUM (
    'ARTICLE',
    'GUIDE',
    'FAQ',
    'TROUBLESHOOTING',
    'ERROR_CODE',
    'CASE_STUDY',
    'VIDEO'
);

ALTER TABLE "BlogPost" ADD COLUMN "kind" "ArticleKind" NOT NULL DEFAULT 'ARTICLE';
ALTER TABLE "BlogPost" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "errorCode" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- Existing posts already carry a topic; seed the new `kind` from it so nothing
-- lands as a generic ARTICLE when it is plainly a FAQ or a troubleshooting
-- note. Anything else stays ARTICLE.
UPDATE "BlogPost" SET "kind" = 'FAQ'::"ArticleKind" WHERE "category" = 'FAQ';
UPDATE "BlogPost" SET "kind" = 'TROUBLESHOOTING'::"ArticleKind" WHERE "category" = 'TROUBLESHOOTING';
UPDATE "BlogPost" SET "kind" = 'GUIDE'::"ArticleKind" WHERE "category" = 'INSTRUMENT_GUIDE';

CREATE INDEX "BlogPost_kind_idx" ON "BlogPost"("kind");
CREATE INDEX "BlogPost_errorCode_idx" ON "BlogPost"("errorCode");

CREATE TABLE "KnowledgeArticleLink" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "brandId" TEXT,
    "instrumentModelId" TEXT,
    "productId" TEXT,
    CONSTRAINT "KnowledgeArticleLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeArticleLink_articleId_idx" ON "KnowledgeArticleLink"("articleId");
CREATE INDEX "KnowledgeArticleLink_brandId_idx" ON "KnowledgeArticleLink"("brandId");
CREATE INDEX "KnowledgeArticleLink_instrumentModelId_idx" ON "KnowledgeArticleLink"("instrumentModelId");
CREATE INDEX "KnowledgeArticleLink_productId_idx" ON "KnowledgeArticleLink"("productId");

-- A link with no target is not a link. Enforced in the database because the
-- row is meaningless without one, whatever wrote it.
ALTER TABLE "KnowledgeArticleLink" ADD CONSTRAINT "KnowledgeArticleLink_has_target"
    CHECK ("brandId" IS NOT NULL OR "instrumentModelId" IS NOT NULL OR "productId" IS NOT NULL);

ALTER TABLE "KnowledgeArticleLink" ADD CONSTRAINT "KnowledgeArticleLink_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeArticleLink" ADD CONSTRAINT "KnowledgeArticleLink_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeArticleLink" ADD CONSTRAINT "KnowledgeArticleLink_instrumentModelId_fkey"
    FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeArticleLink" ADD CONSTRAINT "KnowledgeArticleLink_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
