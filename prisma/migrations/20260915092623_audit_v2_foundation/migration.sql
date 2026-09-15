-- CreateEnum
CREATE TYPE "AuditEngine" AS ENUM ('LEGACY_V1', 'CRAWL_V2');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "FindingPillar" AS ENUM ('TECHNICAL', 'CONTENT', 'SEARCH', 'LOCAL', 'CONVERSION');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PASS', 'FAIL', 'SKIPPED', 'INFO');

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "configJson" JSONB,
ADD COLUMN     "contentScore" INTEGER,
ADD COLUMN     "crawlStatsJson" JSONB,
ADD COLUMN     "engine" "AuditEngine" NOT NULL DEFAULT 'LEGACY_V1',
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "localScore" INTEGER,
ADD COLUMN     "overallScore" INTEGER,
ADD COLUMN     "progressJson" JSONB,
ADD COLUMN     "scoreBreakdownJson" JSONB,
ADD COLUMN     "searchScore" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "summaryJson" JSONB,
ADD COLUMN     "technicalScore" INTEGER;

-- CreateTable
CREATE TABLE "AuditPage" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "statusCode" INTEGER,
    "fetchError" TEXT,
    "redirectChainJson" JSONB,
    "contentType" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "discoveredVia" TEXT,
    "parentUrl" TEXT,
    "inSitemap" BOOLEAN NOT NULL DEFAULT false,
    "fetchMs" INTEGER,
    "htmlBytes" INTEGER,
    "isHttps" BOOLEAN,
    "mixedContent" BOOLEAN,
    "title" TEXT,
    "metaDescription" TEXT,
    "canonical" TEXT,
    "robotsMeta" TEXT,
    "xRobotsTag" TEXT,
    "indexable" BOOLEAN,
    "lang" TEXT,
    "charset" TEXT,
    "hasDoctype" BOOLEAN,
    "viewport" BOOLEAN,
    "h1Json" JSONB,
    "headingCountsJson" JSONB,
    "wordCount" INTEGER,
    "textHash" TEXT,
    "imagesTotal" INTEGER,
    "imagesMissingAlt" INTEGER,
    "imagesNoDimensions" INTEGER,
    "internalLinks" INTEGER,
    "externalLinks" INTEGER,
    "schemaTypesJson" JSONB,
    "schemaErrors" INTEGER,
    "hasTelLink" BOOLEAN,
    "hasForm" BOOLEAN,
    "hasPrimaryCta" BOOLEAN,
    "ogTagsPresent" BOOLEAN,
    "headersJson" JSONB,
    "factsJson" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditCheckResult" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "pillar" "FindingPillar" NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "severity" "FindingSeverity",
    "affectedPageCount" INTEGER NOT NULL DEFAULT 0,
    "pageShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "findingKey" TEXT NOT NULL,
    "checkIdsJson" JSONB NOT NULL,
    "pillar" "FindingPillar" NOT NULL,
    "section" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "affectedUrlsJson" JSONB NOT NULL,
    "affectedPageCount" INTEGER NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "detectedValue" TEXT,
    "expectedValue" TEXT,
    "whyItMatters" TEXT NOT NULL,
    "recommendedFix" TEXT NOT NULL,
    "developerDetailsJson" JSONB,
    "impact" INTEGER NOT NULL,
    "effort" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditPage_auditId_idx" ON "AuditPage"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPage_auditId_url_key" ON "AuditPage"("auditId", "url");

-- CreateIndex
CREATE INDEX "AuditCheckResult_auditId_pillar_idx" ON "AuditCheckResult"("auditId", "pillar");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCheckResult_auditId_checkId_key" ON "AuditCheckResult"("auditId", "checkId");

-- CreateIndex
CREATE INDEX "AuditFinding_auditId_pillar_idx" ON "AuditFinding"("auditId", "pillar");

-- CreateIndex
CREATE INDEX "AuditFinding_auditId_priorityScore_idx" ON "AuditFinding"("auditId", "priorityScore");

-- AddForeignKey
ALTER TABLE "AuditPage" ADD CONSTRAINT "AuditPage_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditCheckResult" ADD CONSTRAINT "AuditCheckResult_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
