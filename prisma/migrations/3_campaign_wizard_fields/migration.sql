-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "competitorCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "dataFreshnessDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "dataProvider" TEXT NOT NULL DEFAULT 'MOCK',
ADD COLUMN     "excludeChains" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "excludeExistingContacts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxBusinesses" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "minReviewCount" INTEGER,
ADD COLUMN     "outreachDailyLimit" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "testMode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "websiteRequired" BOOLEAN NOT NULL DEFAULT true;

