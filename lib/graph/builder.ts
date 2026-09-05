import { createHash } from "node:crypto";
import { ExtractedPageData } from "../extract/types";
import { validateSchema } from "../extract/schema-validator";
import { normalizeUrl } from "../crawler/safe-fetch";
import { GraphEdgeData, GraphNodeData, GraphSnapshotData } from "./types";
export const GRAPH_VERSION = "graph-v2";
const identity = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export function buildDiscoverabilityGraph(
  deploymentId: string,
  pages: ExtractedPageData[],
): GraphSnapshotData {
  const nodes = new Map<string, GraphNodeData>();
  const edges = new Map<string, GraphEdgeData>();
  const normalized = [
    ...new Map(
      pages.map((p) => [normalizeUrl(p.url, "https://identity.invalid"), p]),
    ).entries(),
  ].sort(([a], [b]) => a.localeCompare(b));
  const pageIds = new Map(
    normalized.map(([url]) => [url, `page_${identity(url)}`]),
  );
  const edge = (
    fromNodeId: string,
    toNodeId: string,
    kind: GraphEdgeData["kind"],
  ) => {
    const id = identity(`${fromNodeId}:${kind}:${toNodeId}`);
    edges.set(id, { id, fromNodeId, toNodeId, kind });
  };
  for (const [url, page] of normalized) {
    const id = pageIds.get(url)!;
    const schemas = page.jsonLdSchemas.map(validateSchema);
    const schemaTypes = [
      ...new Set(
        schemas
          .filter((s) => s.isValid)
          .flatMap((s) =>
            Array.isArray(s.raw["@type"])
              ? s.raw["@type"].filter(
                  (v: unknown): v is string =>
                    typeof v === "string" && v.length > 0,
                )
              : [s.type],
          ),
      ),
    ].sort() as string[];
    const schemaErrors = [
      ...(page.schemaErrors || []),
      ...schemas.flatMap((s) => s.errors),
    ];
    nodes.set(id, {
      id,
      type: "page",
      key: url,
      url,
      title: page.title,
      health:
        page.statusCode !== 200 ||
        !page.canonicalUrl ||
        page.robotsDirectives.noindex ||
        schemaErrors.length
          ? "DEGRADED"
          : "PASS",
      attrs: {
        statusCode: page.statusCode,
        hasCanonical: !!page.canonicalUrl && !page.canonicalErrors?.length,
        canonicalTarget: page.canonicalUrl,
        isNoindexed: page.robotsDirectives.noindex,
        schemaTypes,
        schemaErrors,
        titleMissing: !page.title,
        metaDescriptionMissing: !page.metaDescription,
        internalOutlinks: page.internalLinks.length,
      },
    });
    for (const type of schemaTypes) {
      const sid = `schema_${identity(type)}`;
      nodes.set(sid, {
        id: sid,
        type: "schema",
        key: `schema:${type}`,
        url: `schema:${type}`,
        title: type,
        health: "PASS",
        attrs: { schemaType: type },
      });
      edge(id, sid, "has_schema");
    }
  }
  for (const [url, page] of normalized) {
    const id = pageIds.get(url)!;
    for (const link of page.internalLinks) {
      try {
        const target = pageIds.get(normalizeUrl(link, url));
        if (target && target !== id) edge(id, target, "links_to");
      } catch {
        /* Invalid extracted links do not enter graph. */
      }
    }
    if (page.canonicalUrl) {
      try {
        const target = pageIds.get(normalizeUrl(page.canonicalUrl, url));
        if (target) edge(id, target, "canonical_to");
      } catch {
        /* Canonical error remains in extraction evidence. */
      }
    }
  }
  return {
    id: `snapshot_${deploymentId}`,
    deploymentId,
    version: GRAPH_VERSION,
    complete: true,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
    createdAt: new Date().toISOString(),
  };
}
