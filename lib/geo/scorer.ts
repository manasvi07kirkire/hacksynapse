import { FindingData } from "../detect/types";
import { GraphSnapshotData } from "../graph/types";

export interface ScoreBreakdown {
  canonicalHealth: number;
  indexDirectives: number;
  internalLinkIntegrity: number;
  schemaCoverage: number;
  llmsTxtScore: number;
  citationGroundingScore: number;
}

export interface DeploymentScoreResult {
  version?: string;
  citationStatus?: string;
  searchHealth: number; // 0 - 100
  geoScore: number; // 0 - 100
  deltaSearch: number; // e.g. -25
  deltaGeo: number; // e.g. -27
  breakdown: ScoreBreakdown;
}

export function computeScores(
  currentSnapshot: GraphSnapshotData,
  findings: FindingData[],
  previousScore?: { searchHealth: number; geoScore: number },
): DeploymentScoreResult {
  const pageNodes = currentSnapshot.nodes.filter((n) => n.type === "page");
  const totalPages = Math.max(1, pageNodes.length);

  // 1. Search Health Factors
  const pagesWithCanonical = pageNodes.filter(
    (p) => p.attrs.hasCanonical,
  ).length;
  const canonicalRatio = pagesWithCanonical / totalPages;
  const canonicalHealth = Math.round(canonicalRatio * 40); // 40 pts max

  const noindexCount = pageNodes.filter((p) => p.attrs.isNoindexed).length;
  const indexDirectives = pageNodes.length
    ? Math.round(30 * (1 - noindexCount / totalPages))
    : 0;

  const orphanCount = currentSnapshot.nodes.filter(
    (n) =>
      n.type === "page" &&
      new URL(n.url, "https://identity.invalid").pathname !== "/" &&
      !currentSnapshot.edges.some(
        (e) => e.toNodeId === n.id && e.kind === "links_to",
      ),
  ).length;
  const internalLinkIntegrity = pageNodes.length
    ? Math.round(30 * (1 - orphanCount / totalPages))
    : 0;

  const searchHealth = Math.min(
    100,
    Math.max(0, canonicalHealth + indexDirectives + internalLinkIntegrity),
  );

  // 2. GEO (AI Answer Engine) Score Factors
  const pagesWithSchema = pageNodes.filter(
    (p) => (p.attrs.schemaTypes?.length || 0) > 0,
  ).length;
  const schemaRatio = pagesWithSchema / totalPages;
  const schemaCoverage = Math.round(schemaRatio * 45); // 45 pts max

  // llms.txt factor (presence & health)
  const hasLlmsTxtFinding = findings.some((f) => f.type === "LLMSTXT_INVALID");
  const llmsTxtScore =
    currentSnapshot.llmsTxtValid === true && !hasLlmsTxtFinding ? 25 : 0;

  // Citation Grounding factor
  const citationGroundingScore = 0; // Unknown until a separate real citation test; never infer grounding from schema.

  const geoScore = Math.min(
    100,
    Math.max(0, schemaCoverage + llmsTxtScore + citationGroundingScore),
  );

  // Deltas
  const prevSearch = previousScore?.searchHealth ?? searchHealth;
  const prevGeo = previousScore?.geoScore ?? geoScore;

  return {
    version: "score-v2",
    citationStatus: "NOT_TESTED",
    searchHealth,
    geoScore,
    deltaSearch: searchHealth - prevSearch,
    deltaGeo: geoScore - prevGeo,
    breakdown: {
      canonicalHealth,
      indexDirectives,
      internalLinkIntegrity,
      schemaCoverage,
      llmsTxtScore,
      citationGroundingScore,
    },
  };
}
