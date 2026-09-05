import { GraphDiffResult, GraphSnapshotData } from "../graph/types";

export type FindingType =
  | "CANONICAL_STRIPPED"
  | "NOINDEX_FLIPPED"
  | "SCHEMA_REMOVED"
  | "SCHEMA_INVALID"
  | "ORPHAN_PAGE_CREATED"
  | "ORPHAN_PAGE"
  | "TITLE_MISSING"
  | "META_DESCRIPTION_MISSING"
  | "DUPLICATE_TITLE"
  | "LLMSTXT_INVALID"
  | "SITEMAP_INCONSISTENCY";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type LensType = "search" | "ai-answer" | "both";

export interface FindingData {
  id: string;
  type: FindingType;
  severity: SeverityLevel;
  confidence: number; // 0 - 100
  lens: LensType;
  title: string;
  description?: string; // Filled via narrator
  evidence: {
    pagesAffected: number;
    firstBadDeploy: string;
    template: string;
    sampleUrls: string[];
    details?: unknown;
  };
  rootCause: {
    file: string;
    line: number;
    component: string;
    snippet?: string;
  } | null;
  status: "OPEN" | "REMEDIATED" | "ACKNOWLEDGED";
}

export interface DetectionContext {
  deploymentSha: string;
  deployNumber: number;
  currentSnapshot: GraphSnapshotData;
  previousSnapshot?: GraphSnapshotData;
  diff?: GraphDiffResult;
}
