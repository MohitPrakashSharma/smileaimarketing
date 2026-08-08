-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CampaignStatus" ADD VALUE 'READY';
ALTER TYPE "CampaignStatus" ADD VALUE 'DISCOVERING';
ALTER TYPE "CampaignStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "CampaignStatus" ADD VALUE 'REVIEW_REQUIRED';
ALTER TYPE "CampaignStatus" ADD VALUE 'READY_FOR_OUTREACH';
ALTER TYPE "CampaignStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "CampaignStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "meetLink" TEXT,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "pdfStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "summaryText" TEXT;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "firstDiscoveredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "leadSource" TEXT NOT NULL DEFAULT 'campaign_outreach';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EngagementEvent" ADD COLUMN     "auditId" TEXT,
ADD COLUMN     "businessId" TEXT,
ALTER COLUMN "emailMessageId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Business_createdAt_idx" ON "Business"("createdAt");

-- CreateIndex
CREATE INDEX "Campaign_city_idx" ON "Campaign"("city");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_businessId_idx" ON "EngagementEvent"("businessId");

-- CreateIndex
CREATE INDEX "EngagementEvent_auditId_idx" ON "EngagementEvent"("auditId");

-- CreateIndex
CREATE INDEX "EngagementEvent_eventType_idx" ON "EngagementEvent"("eventType");

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

