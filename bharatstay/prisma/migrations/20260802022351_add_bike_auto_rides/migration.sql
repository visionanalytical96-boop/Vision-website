-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'EBIKE', 'AUTO');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'ARRIVED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'NO_RIDER');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "riderId" TEXT;

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "status" "RiderStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "licenceNumber" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "userId" TEXT,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "vehicleType" "VehicleType" NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "pickupLabel" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "dropLabel" TEXT NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "baseFare" INTEGER NOT NULL,
    "distanceFare" INTEGER NOT NULL,
    "fare" INTEGER NOT NULL,
    "riderId" TEXT,
    "offeredToId" TEXT,
    "offerExpiresAt" TIMESTAMP(3),
    "declinedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startOtp" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareRule" (
    "vehicleType" "VehicleType" NOT NULL,
    "label" TEXT NOT NULL,
    "baseFare" INTEGER NOT NULL,
    "perKm" INTEGER NOT NULL,
    "minFare" INTEGER NOT NULL,
    "matchRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FareRule_pkey" PRIMARY KEY ("vehicleType")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rider_phone_key" ON "Rider"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_userId_key" ON "Rider"("userId");

-- CreateIndex
CREATE INDEX "Rider_status_online_idx" ON "Rider"("status", "online");

-- CreateIndex
CREATE INDEX "Rider_online_lastSeenAt_idx" ON "Rider"("online", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_ref_key" ON "Ride"("ref");

-- CreateIndex
CREATE INDEX "Ride_status_createdAt_idx" ON "Ride"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ride_riderId_createdAt_idx" ON "Ride"("riderId", "createdAt");

-- CreateIndex
CREATE INDEX "Ride_customerId_createdAt_idx" ON "Ride"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Ride_offeredToId_offerExpiresAt_idx" ON "Ride"("offeredToId", "offerExpiresAt");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
