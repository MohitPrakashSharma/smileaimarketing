-- CreateEnum
CREATE TYPE "TechnicalReportStatus" AS ENUM ('PENDING', 'CONTACTED', 'DELIVERED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "auditId" TEXT,
ADD COLUMN     "technicalReportRequestedAt" TIMESTAMP(3),
ADD COLUMN     "technicalReportStatus" "TechnicalReportStatus";

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "address" TEXT,
ADD COLUMN     "discoveredAt" TIMESTAMP(3),
ADD COLUMN     "measuredAt" TIMESTAMP(3),
ADD COLUMN     "measurementJson" JSONB,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "relevance" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_auditId_idx" ON "Appointment"("auditId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
