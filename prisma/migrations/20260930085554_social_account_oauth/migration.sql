-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "accessTokenEnc" TEXT,
ADD COLUMN     "connectedById" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
