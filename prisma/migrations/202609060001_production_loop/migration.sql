ALTER TABLE "SeoScan" ADD COLUMN "sourceRef" TEXT, ADD COLUMN "sourcePrNumber" INTEGER;
ALTER TABLE "CitationTest" ADD COLUMN "deploymentId" TEXT;
ALTER TABLE "CitationTest" ADD CONSTRAINT "CitationTest_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "WorkerHeartbeat" (
  "id" TEXT PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'RUNNING'
);
CREATE TABLE "Recovery" (
  "id" TEXT PRIMARY KEY,
  "findingId" TEXT NOT NULL,
  "deploymentId" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" TEXT NOT NULL DEFAULT 'complete-revision-verified-crawl',
  CONSTRAINT "Recovery_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Recovery_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Recovery_findingId_key" ON "Recovery"("findingId");
CREATE INDEX "Recovery_deploymentId_idx" ON "Recovery"("deploymentId");
