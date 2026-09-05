import {
  DetectionContext,
  FindingData,
  FindingType,
  SeverityLevel,
  LensType,
} from "./types";
import { GraphNodeData } from "../graph/types";
export const RULE_VERSION = "rules-v2";
export function runDetectionRules(context: DetectionContext): FindingData[] {
  const {
    currentSnapshot: current,
    previousSnapshot,
    deployNumber,
    deploymentSha,
  } = context;
  const comparable =
    current.complete !== false &&
    previousSnapshot?.complete !== false &&
    current.version === previousSnapshot?.version;
  const prior = comparable ? previousSnapshot : undefined;
  const pages = current.nodes
    .filter(
      (n) =>
        n.type === "page" &&
        (n.attrs.statusCode === undefined || n.attrs.statusCode === 200),
    )
    .sort((a, b) => a.url.localeCompare(b.url));
  const previous = new Map(
    prior?.nodes.filter((n) => n.type === "page").map((n) => [n.url, n]),
  );
  const findings: FindingData[] = [];
  function add(
    type: FindingType,
    affected: GraphNodeData[],
    severity: SeverityLevel,
    lens: LensType,
  ) {
    const unique = [...new Map(affected.map((n) => [n.url, n])).values()];
    if (!unique.length) return;
    findings.push({
      id: `finding_${type}_${deploymentSha}`,
      type,
      severity,
      lens,
      confidence: 100,
      title: `${type.replaceAll("_", " ")}: ${unique.length} page(s)`,
      evidence: {
        pagesAffected: unique.length,
        firstBadDeploy: `#${deployNumber}`,
        template: "unattributed",
        sampleUrls: unique.map((n) => n.url),
        details: {
          ruleVersion: RULE_VERSION,
          observations: unique.map((n) => ({
            url: n.url,
            before: previous.get(n.url)?.attrs ?? null,
            after: n.attrs,
          })),
        },
      },
      rootCause: null,
      status: "OPEN",
    });
  }
  add(
    "CANONICAL_STRIPPED",
    pages.filter(
      (n) =>
        previous.get(n.url)?.attrs.hasCanonical === true &&
        n.attrs.hasCanonical === false,
    ),
    "CRITICAL",
    "search",
  );
  add(
    "NOINDEX_FLIPPED",
    pages.filter(
      (n) =>
        previous.get(n.url)?.attrs.isNoindexed === false &&
        n.attrs.isNoindexed === true,
    ),
    "CRITICAL",
    "search",
  );
  add(
    "SCHEMA_REMOVED",
    pages.filter((n) =>
      (previous.get(n.url)?.attrs.schemaTypes || []).some(
        (t) => !(n.attrs.schemaTypes || []).includes(t),
      ),
    ),
    "HIGH",
    "ai-answer",
  );
  add(
    "SCHEMA_INVALID",
    pages.filter(
      (n) =>
        Array.isArray(n.attrs.schemaErrors) && n.attrs.schemaErrors.length > 0,
    ),
    "HIGH",
    "ai-answer",
  );
  add(
    "TITLE_MISSING",
    pages.filter((n) => n.attrs.titleMissing === true),
    "MEDIUM",
    "search",
  );
  add(
    "META_DESCRIPTION_MISSING",
    pages.filter((n) => n.attrs.metaDescriptionMissing === true),
    "LOW",
    "search",
  );
  if (current.complete !== false) {
    const reachable = new Set(
      pages
        .filter(
          (n) => new URL(n.url, "https://identity.invalid").pathname === "/",
        )
        .map((n) => n.id),
    );
    for (let size = -1; size !== reachable.size;) {
      size = reachable.size;
      current.edges
        .filter((e) => e.kind === "links_to" && reachable.has(e.fromNodeId))
        .forEach((e) => reachable.add(e.toNodeId));
    }
    if (reachable.size)
      add(
        "ORPHAN_PAGE",
        pages.filter((n) => !reachable.has(n.id)),
        "MEDIUM",
        "search",
      );
    const titles = new Map<string, GraphNodeData[]>();
    pages.forEach((n) => {
      const t = n.title?.trim().toLowerCase().replace(/\s+/g, " ");
      if (t && !n.attrs.titleMissing)
        titles.set(t, [...(titles.get(t) || []), n]);
    });
    add(
      "DUPLICATE_TITLE",
      [...titles.values()].filter((ns) => ns.length > 1).flat(),
      "MEDIUM",
      "search",
    );
    if (current.sitemapUrls)
      add(
        "SITEMAP_INCONSISTENCY",
        pages.filter((n) => !current.sitemapUrls?.includes(n.url)),
        "MEDIUM",
        "search",
      );
  }
  if (current.llmsTxtValid === false)
    add(
      "LLMSTXT_INVALID",
      [
        {
          id: "llms",
          type: "signal",
          key: "llms",
          url: "/llms.txt",
          health: "DEGRADED",
          attrs: { llmsTxtValid: false },
        },
      ],
      "MEDIUM",
      "ai-answer",
    );
  return findings;
}
