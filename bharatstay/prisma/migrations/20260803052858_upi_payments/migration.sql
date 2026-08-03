-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_VERIFICATION';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "upiRef" TEXT,
ADD COLUMN     "upiRejectedNote" TEXT,
ADD COLUMN     "upiSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "upiVerifiedAt" TIMESTAMP(3),
ALTER COLUMN "paymentMode" SET DEFAULT 'upi';
