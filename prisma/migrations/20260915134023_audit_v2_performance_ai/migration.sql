-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('MEASURED', 'DETERMINISTIC_FINDING', 'AI_RECOMMENDATION', 'AI_INFERRED_OPPORTUNITY', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "FindingPillar" ADD VALUE 'PERFORMANCE';

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "performanceScore" INTEGER;

-- AlterTable
ALTER TABLE "AuditFinding" ADD COLUMN     "device" TEXT,
ADD COLUMN     "evidenceKind" "EvidenceKind",
ADD COLUMN     "metric" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "AuditPerformance" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "pageType" TEXT,
    "selectionReason" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "errorCode" TEXT,
    "fieldJson" JSONB,
    "labJson" JSONB,
    "diagnosticsJson" JSONB,
    "lcpElementJson" JSONB,
    "lighthouseVersion" TEXT,
    "analysisUtc" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAiPageAnalysis" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT,
    "selectionReason" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "errorCode" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "evidenceJson" JSONB,
    "resultJson" JSONB,
    "scrubbedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAiPageAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditPerformance_auditId_idx" ON "AuditPerformance"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPerformance_auditId_url_strategy_key" ON "AuditPerformance"("auditId", "url", "strategy");

-- CreateIndex
CREATE INDEX "AuditAiPageAnalysis_auditId_idx" ON "AuditAiPageAnalysis"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditAiPageAnalysis_auditId_url_key" ON "AuditAiPageAnalysis"("auditId", "url");

-- AddForeignKey
ALTER TABLE "AuditPerformance" ADD CONSTRAINT "AuditPerformance_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAiPageAnalysis" ADD CONSTRAINT "AuditAiPageAnalysis_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
