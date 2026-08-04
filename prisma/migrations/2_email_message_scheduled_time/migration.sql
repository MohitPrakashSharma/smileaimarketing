-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "scheduledTime" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EmailMessage_scheduledTime_idx" ON "EmailMessage"("scheduledTime");

