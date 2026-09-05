-- Legacy unowned records remain quarantined. All new records require ownership.
ALTER TABLE "SeoScan" ADD CONSTRAINT "SeoScan_owner_required" CHECK ("projectId" IS NOT NULL) NOT VALID;
ALTER TABLE "CitationTest" ADD CONSTRAINT "CitationTest_owner_required" CHECK ("projectId" IS NOT NULL) NOT VALID;
ALTER TABLE "Score" ADD CONSTRAINT "Score_bounds" CHECK ("searchHealth" BETWEEN 0 AND 100 AND "geoScore" BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_confidence_bounds" CHECK (confidence BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_status_valid" CHECK (status IN ('QUEUED','RUNNING','HEALTHY','REGRESSION','DEGRADED','FAILED','CANCELLED','REMEDIATED')) NOT VALID;
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_status_valid" CHECK (status IN ('QUEUED','RUNNING','COMPLETE','FAILED','CANCELLED'));
CREATE UNIQUE INDEX "Node_snapshotId_id_key" ON "Node" ("snapshotId", id);
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_from_same_snapshot" FOREIGN KEY ("snapshotId", "fromNodeId") REFERENCES "Node" ("snapshotId", id) ON DELETE CASCADE;
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_to_same_snapshot" FOREIGN KEY ("snapshotId", "toNodeId") REFERENCES "Node" ("snapshotId", id) ON DELETE CASCADE;
