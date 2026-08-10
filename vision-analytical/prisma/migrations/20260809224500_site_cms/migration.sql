-- CreateEnum
CREATE TYPE "HomeSectionKey" AS ENUM ('HERO', 'CATEGORIES', 'LIFECYCLE', 'WHY_US', 'CTA');

-- CreateEnum
CREATE TYPE "ContentPageKey" AS ENUM ('ABOUT', 'SERVICES', 'CONTACT', 'HEADER', 'FOOTER');

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "key" "HomeSectionKey" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL,
    "page" "ContentPageKey" NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'Vision Analytical',
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "seoDefaultTitle" TEXT,
    "seoDefaultDescription" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0891b2',
    "fontHeading" TEXT NOT NULL DEFAULT 'space-grotesk',
    "fontBody" TEXT NOT NULL DEFAULT 'inter',
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeSection_key_key" ON "HomeSection"("key");

-- CreateIndex
CREATE INDEX "HomeSection_sortOrder_idx" ON "HomeSection"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_page_key" ON "PageContent"("page");

