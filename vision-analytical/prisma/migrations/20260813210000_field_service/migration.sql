-- Field service: the install base, visits, and structured reports.
--
-- Entirely additive. Nothing existing is dropped or rewritten:
--   * ServiceReport keeps its `partsUsed` and `photos` JSON columns. They are
--     superseded by ServiceReportPart and ServiceReportPhoto rows, but existing
--     reports are left exactly as they are rather than migrated into a shape
--     nobody has verified against real data yet.
--   * ServiceRequest gains an optional link to a customer instrument.

-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('ACTIVE', 'UNDER_REPAIR', 'STANDBY', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'TRAVELLING', 'REACHED_SITE', 'WORK_STARTED', 'WAITING_FOR_PARTS', 'WORK_COMPLETED', 'AWAITING_CUSTOMER_APPROVAL', 'CLOSED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ServiceReportKind" AS ENUM ('INSPECTION', 'INSTALLATION', 'CALIBRATION', 'PREVENTIVE_MAINTENANCE', 'BREAKDOWN', 'REPAIR', 'VALIDATION', 'TRAINING');

-- CreateEnum
CREATE TYPE "ReportItemResult" AS ENUM ('PASS', 'FAIL', 'NOT_APPLICABLE', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('JOB_ASSIGNED', 'JOB_UPDATED', 'SCHEDULE_CHANGED', 'REPORT_PENDING', 'REPORT_APPROVED', 'PART_REQUEST_UPDATED', 'REMINDER');

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "customerInstrumentId" TEXT;

-- AlterTable
ALTER TABLE "ServiceReport" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "certificateNumber" TEXT,
ADD COLUMN     "correctiveAction" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerRemarks" TEXT,
ADD COLUMN     "engineerRemarks" TEXT,
ADD COLUMN     "kind" "ServiceReportKind" NOT NULL DEFAULT 'INSPECTION',
ADD COLUMN     "nextDueOn" TIMESTAMP(3),
ADD COLUMN     "recommendations" TEXT,
ADD COLUMN     "rootCause" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "standardUsed" TEXT,
ADD COLUMN     "visitId" TEXT;

-- CreateTable
CREATE TABLE "CustomerInstrument" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "companyId" TEXT,
    "ownerId" TEXT,
    "instrumentModelId" TEXT,
    "productId" TEXT,
    "nickname" TEXT,
    "siteName" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "installedOn" TIMESTAMP(3),
    "warrantyEndsOn" TIMESTAMP(3),
    "calibrationDueOn" TIMESTAMP(3),
    "nextPmDueOn" TIMESTAMP(3),
    "amcContractId" TEXT,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "qrToken" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceVisit" (
    "id" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "customerInstrumentId" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'ASSIGNED',
    "scheduledFor" TIMESTAMP(3),
    "statusNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "travelStartedAt" TIMESTAMP(3),
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "workStartedAt" TIMESTAMP(3),
    "workCompletedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "checkInAccuracyM" DOUBLE PRECISION,
    "checkOutLatitude" DOUBLE PRECISION,
    "checkOutLongitude" DOUBLE PRECISION,
    "checkOutAccuracyM" DOUBLE PRECISION,
    "travelDistanceKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL,
    "note" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReportItem" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expected" TEXT,
    "actual" TEXT,
    "unit" TEXT,
    "result" "ReportItemResult" NOT NULL DEFAULT 'PASS',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReportPhoto" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'DURING',
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceReportPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReportPart" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "productId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "ServiceReportPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartRequest" (
    "id" TEXT NOT NULL,
    "visitId" TEXT,
    "requestedById" TEXT NOT NULL,
    "productId" TEXT,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInstrument_qrToken_key" ON "CustomerInstrument"("qrToken");

-- CreateIndex
CREATE INDEX "CustomerInstrument_companyId_idx" ON "CustomerInstrument"("companyId");

-- CreateIndex
CREATE INDEX "CustomerInstrument_serialNumber_idx" ON "CustomerInstrument"("serialNumber");

-- CreateIndex
CREATE INDEX "CustomerInstrument_status_idx" ON "CustomerInstrument"("status");

-- CreateIndex
CREATE INDEX "CustomerInstrument_warrantyEndsOn_idx" ON "CustomerInstrument"("warrantyEndsOn");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceVisit_visitNumber_key" ON "ServiceVisit"("visitNumber");

-- CreateIndex
CREATE INDEX "ServiceVisit_engineerId_status_idx" ON "ServiceVisit"("engineerId", "status");

-- CreateIndex
CREATE INDEX "ServiceVisit_serviceRequestId_idx" ON "ServiceVisit"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceVisit_scheduledFor_idx" ON "ServiceVisit"("scheduledFor");

-- CreateIndex
CREATE INDEX "ServiceVisit_status_idx" ON "ServiceVisit"("status");

-- CreateIndex
CREATE INDEX "VisitEvent_visitId_createdAt_idx" ON "VisitEvent"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceReportItem_reportId_sortOrder_idx" ON "ServiceReportItem"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceReportPhoto_reportId_sortOrder_idx" ON "ServiceReportPhoto"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceReportPart_reportId_idx" ON "ServiceReportPart"("reportId");

-- CreateIndex
CREATE INDEX "ServiceReportPart_productId_idx" ON "ServiceReportPart"("productId");

-- CreateIndex
CREATE INDEX "PartRequest_status_idx" ON "PartRequest"("status");

-- CreateIndex
CREATE INDEX "PartRequest_requestedById_idx" ON "PartRequest"("requestedById");

-- CreateIndex
CREATE INDEX "PartRequest_visitId_idx" ON "PartRequest"("visitId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerInstrumentId_idx" ON "ServiceRequest"("customerInstrumentId");

-- CreateIndex
CREATE INDEX "ServiceReport_visitId_idx" ON "ServiceReport"("visitId");

-- CreateIndex
CREATE INDEX "ServiceReport_kind_idx" ON "ServiceReport"("kind");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customerInstrumentId_fkey" FOREIGN KEY ("customerInstrumentId") REFERENCES "CustomerInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ServiceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInstrument" ADD CONSTRAINT "CustomerInstrument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInstrument" ADD CONSTRAINT "CustomerInstrument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInstrument" ADD CONSTRAINT "CustomerInstrument_instrumentModelId_fkey" FOREIGN KEY ("instrumentModelId") REFERENCES "InstrumentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInstrument" ADD CONSTRAINT "CustomerInstrument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInstrument" ADD CONSTRAINT "CustomerInstrument_amcContractId_fkey" FOREIGN KEY ("amcContractId") REFERENCES "AmcContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_customerInstrumentId_fkey" FOREIGN KEY ("customerInstrumentId") REFERENCES "CustomerInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ServiceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportItem" ADD CONSTRAINT "ServiceReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportPhoto" ADD CONSTRAINT "ServiceReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReportPart" ADD CONSTRAINT "ServiceReportPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ServiceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartRequest" ADD CONSTRAINT "PartRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Instrument identity: serial numbers repeat across manufacturers, so the same
-- serial on a Waters and a Shimadzu are two different instruments. COALESCE
-- rather than a plain composite unique because Postgres treats NULLs as
-- distinct, which would let the same instrument be entered twice with no model.
CREATE UNIQUE INDEX "CustomerInstrument_identity_key"
  ON "CustomerInstrument" ("serialNumber", COALESCE("instrumentModelId", ''));
