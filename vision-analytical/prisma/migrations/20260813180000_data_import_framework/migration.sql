-- Data import framework: import jobs and their per-row results, plus the
-- pointer table that makes demo data exactly removable.
--
-- Entirely additive: three new tables, two new enums, nothing existing touched.

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'ERROR');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'VALIDATED',
    "mode" TEXT NOT NULL DEFAULT 'upsert',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createRows" INTEGER NOT NULL DEFAULT 0,
    "updateRows" INTEGER NOT NULL DEFAULT 0,
    "skipRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "startedById" TEXT,
    "actorLabel" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "action" "ImportRowAction" NOT NULL,
    "message" TEXT,
    "data" JSONB NOT NULL,
    "entityId" TEXT,

    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoRecord" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_entity_idx" ON "ImportJob"("entity");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJobRow_jobId_action_idx" ON "ImportJobRow"("jobId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJobRow_jobId_rowNumber_key" ON "ImportJobRow"("jobId", "rowNumber");

-- CreateIndex
CREATE INDEX "DemoRecord_entityType_idx" ON "DemoRecord"("entityType");

-- CreateIndex
CREATE INDEX "DemoRecord_batch_idx" ON "DemoRecord"("batch");

-- CreateIndex
CREATE UNIQUE INDEX "DemoRecord_entityType_entityId_key" ON "DemoRecord"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
