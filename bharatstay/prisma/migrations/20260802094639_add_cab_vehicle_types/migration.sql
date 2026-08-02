-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VehicleType" ADD VALUE 'CAB';
ALTER TYPE "VehicleType" ADD VALUE 'CAB_XL';

-- AlterTable
ALTER TABLE "FareRule" ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1;
