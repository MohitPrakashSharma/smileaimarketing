-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'REQUESTED';

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "normalizedDomain" TEXT,
ADD COLUMN     "normalizedName" TEXT,
ADD COLUMN     "providerSource" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "rawProviderRef" JSONB,
ADD COLUMN     "reviewCount" INTEGER,
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Business_googlePlaceId_key" ON "Business"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Business_normalizedDomain_idx" ON "Business"("normalizedDomain");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

