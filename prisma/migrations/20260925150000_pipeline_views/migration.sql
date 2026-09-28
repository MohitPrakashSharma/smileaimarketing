-- Saved views for /admin/pipeline, plus each user's default view and a one-time
-- "starter views created" flag (see lib/pipelineViews.ts).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultPipelineViewId" TEXT,
ADD COLUMN     "pipelineViewsSeeded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PipelineView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineView_ownerId_idx" ON "PipelineView"("ownerId");

-- CreateIndex
CREATE INDEX "PipelineView_shared_idx" ON "PipelineView"("shared");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultPipelineViewId_fkey" FOREIGN KEY ("defaultPipelineViewId") REFERENCES "PipelineView"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineView" ADD CONSTRAINT "PipelineView_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

