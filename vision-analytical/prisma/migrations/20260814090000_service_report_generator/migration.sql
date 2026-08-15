-- Service Report Generator: the printed sheet becomes a record.
--
-- Every column added here is nullable and every existing column keeps its
-- value, so reports written before the generator stay readable. The one
-- widening change is ServiceReport.serviceRequestId, which drops NOT NULL:
-- an engineer is often sent to a site on a phone call, and the report is the
-- only record of that visit.

CREATE TYPE "ServiceOutcome" AS ENUM ('OK', 'NOT_OK');

CREATE TYPE "ServiceCallType" AS ENUM (
  'NEW_INSTALLATION',
  'CALIBRATION',
  'DEMONSTRATION',
  'VALIDATION',
  'MAINTENANCE',
  'REPAIRS'
);

CREATE TYPE "ServiceContractType" AS ENUM (
  'UNDER_WARRANTY',
  'UNDER_AMC',
  'COURTESY',
  'PAID_VISIT'
);

ALTER TABLE "ServiceReport" ALTER COLUMN "serviceRequestId" DROP NOT NULL;

ALTER TABLE "ServiceReport"
  ADD COLUMN "reportNumber"         TEXT,
  ADD COLUMN "reportDate"           TIMESTAMP(3),
  ADD COLUMN "companyId"            TEXT,
  ADD COLUMN "companyName"          TEXT,
  ADD COLUMN "companyAddress"       TEXT,
  ADD COLUMN "telephone"            TEXT,
  ADD COLUMN "contactPerson"        TEXT,
  ADD COLUMN "contactDesignation"   TEXT,
  ADD COLUMN "contactDepartment"    TEXT,
  ADD COLUMN "weekOff"              TEXT,
  ADD COLUMN "customerInstrumentId" TEXT,
  ADD COLUMN "outcome"              "ServiceOutcome",
  ADD COLUMN "serviceTypes"         "ServiceCallType"[] DEFAULT ARRAY[]::"ServiceCallType"[],
  ADD COLUMN "contractType"         "ServiceContractType",
  ADD COLUMN "faultReported"        TEXT,
  ADD COLUMN "partsSummary"         TEXT,
  ADD COLUMN "customerDesignation"  TEXT,
  ADD COLUMN "engineerName"         TEXT,
  ADD COLUMN "engineerSignatureUrl" TEXT;

CREATE UNIQUE INDEX "ServiceReport_reportNumber_key" ON "ServiceReport"("reportNumber");
CREATE INDEX "ServiceReport_companyId_idx" ON "ServiceReport"("companyId");
CREATE INDEX "ServiceReport_customerInstrumentId_idx" ON "ServiceReport"("customerInstrumentId");
CREATE INDEX "ServiceReport_reportDate_idx" ON "ServiceReport"("reportDate");

ALTER TABLE "ServiceReport"
  ADD CONSTRAINT "ServiceReport_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceReport"
  ADD CONSTRAINT "ServiceReport_customerInstrumentId_fkey"
  FOREIGN KEY ("customerInstrumentId") REFERENCES "CustomerInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill the report date from when the row was written, so an existing
-- report prints with a date on it rather than a blank box.
UPDATE "ServiceReport" SET "reportDate" = "reportedAt" WHERE "reportDate" IS NULL;

CREATE TABLE "ServiceReportVisitLine" (
  "id"                  TEXT NOT NULL,
  "reportId"            TEXT NOT NULL,
  "visitedOn"           TIMESTAMP(3),
  "timeIn"              TEXT,
  "timeOut"             TEXT,
  "systemConfiguration" TEXT,
  "modelDescription"    TEXT,
  "systemNumber"        TEXT,
  "sortOrder"           INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "ServiceReportVisitLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceReportVisitLine_reportId_sortOrder_idx"
  ON "ServiceReportVisitLine"("reportId", "sortOrder");

ALTER TABLE "ServiceReportVisitLine"
  ADD CONSTRAINT "ServiceReportVisitLine_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "ServiceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
