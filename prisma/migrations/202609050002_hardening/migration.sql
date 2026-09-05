-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "defaultBranch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN     "deployCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leaseToken" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "sourceMap" TEXT NOT NULL DEFAULT '{}';

-- Preserve existing deployment numbering. Duplicate repos/numbers must be reviewed
-- before migration; uniqueness creation intentionally fails instead of dropping data.
UPDATE "Project" p SET "deployCounter" = COALESCE((SELECT MAX(d."deployNumber") FROM "Deployment" d WHERE d."projectId" = p.id), 0);
UPDATE "Project" SET repo = LOWER(repo);

-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "analysisVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "degradation" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "revisionVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startedAt" TIMESTAMP(3);

UPDATE "Deployment" SET status = 'DEGRADED', "degradation" = '["LEGACY_UNVERIFIED"]' WHERE status IN ('HEALTHY','REGRESSION','REMEDIATED');

-- AlterTable
ALTER TABLE "GraphSnapshot" ADD COLUMN     "complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "data" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT 'graph-v1';

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "ruleVersion" TEXT NOT NULL DEFAULT 'rules-v1';

-- AlterTable
ALTER TABLE "Remediation" ADD COLUMN     "approvalActor" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "baseSha" TEXT,
ADD COLUMN     "operationKey" TEXT;

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "inputs" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT 'score-v1';

-- AlterTable
ALTER TABLE "CitationTest" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT 'citation-v1';

-- AlterTable
ALTER TABLE "SeoScan" ADD COLUMN     "baseSha" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "provenance" TEXT NOT NULL DEFAULT 'legacy-unverified',
ADD COLUMN     "sourceContent" TEXT,
ADD COLUMN     "sourcePath" TEXT;

-- AlterTable
ALTER TABLE "SeoOptimizationPR" ADD COLUMN     "operationKey" TEXT;

-- CreateTable
CREATE TABLE "AnalysisJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "key" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "response" TEXT,
    "leaseToken" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisJob_deploymentId_key" ON "AnalysisJob"("deploymentId");

-- CreateIndex
CREATE INDEX "AnalysisJob_status_availableAt_idx" ON "AnalysisJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "Operation_projectId_action_idx" ON "Operation"("projectId", "action");

-- CreateIndex
CREATE INDEX "RateBucket_expiresAt_idx" ON "RateBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditEvent_projectId_createdAt_idx" ON "AuditEvent"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_repo_key" ON "Project"("repo");

-- CreateIndex
CREATE INDEX "Deployment_projectId_status_deployNumber_idx" ON "Deployment"("projectId", "status", "deployNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_projectId_deployNumber_key" ON "Deployment"("projectId", "deployNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_projectId_sha_analysisVersion_key" ON "Deployment"("projectId", "sha", "analysisVersion");

-- CreateIndex
CREATE UNIQUE INDEX "GraphSnapshot_deploymentId_key" ON "GraphSnapshot"("deploymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Node_snapshotId_key_key" ON "Node"("snapshotId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Edge_snapshotId_fromNodeId_toNodeId_kind_key" ON "Edge"("snapshotId", "fromNodeId", "toNodeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_deploymentId_type_key" ON "Finding"("deploymentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Remediation_operationKey_key" ON "Remediation"("operationKey");

-- CreateIndex
CREATE INDEX "CitationTest_projectId_createdAt_idx" ON "CitationTest"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "SeoScan_projectId_createdAt_idx" ON "SeoScan"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeoOptimizationPR_operationKey_key" ON "SeoOptimizationPR"("operationKey");

-- AddForeignKey
ALTER TABLE "CitationTest" ADD CONSTRAINT "CitationTest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoScan" ADD CONSTRAINT "SeoScan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
