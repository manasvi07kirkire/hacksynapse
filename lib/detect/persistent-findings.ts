import { FindingData } from "./types";
import { GraphSnapshotData, GraphNodeData } from "../graph/types";

// A second bad deployment is still a regression, even when its diff is empty.
export function persistentFindings(
  snapshot: GraphSnapshotData,
  detected: FindingData[],
  previous: FindingData[],
): FindingData[] {
  if (!snapshot.complete) return detected;
  const result = [...detected];
  const pages = new Map(
    snapshot.nodes.filter((n) => n.type === "page").map((n) => [n.url, n]),
  );
  for (const old of previous) {
    if (
      old.status !== "OPEN" ||
      !["CANONICAL_STRIPPED", "NOINDEX_FLIPPED", "SCHEMA_REMOVED"].includes(
        old.type,
      )
    )
      continue;
    const details = old.evidence.details as
      | {
          observations?: {
            url: string;
            before: GraphNodeData["attrs"] | null;
          }[];
        }
      | undefined;
    const unresolved = old.evidence.sampleUrls.filter((url) => {
      const page = pages.get(url);
      if (!page) return true;
      if (old.type === "CANONICAL_STRIPPED") return !page.attrs.hasCanonical;
      if (old.type === "NOINDEX_FLIPPED")
        return page.attrs.isNoindexed === true;
      const expected = details?.observations?.find((o) => o.url === url)?.before
        ?.schemaTypes;
      return (
        !expected?.length ||
        expected.some((type) => !page.attrs.schemaTypes?.includes(type))
      );
    });
    if (!unresolved.length) continue;
    const fresh = result.find((f) => f.type === old.type);
    const freshDetails = fresh?.evidence.details as typeof details;
    const urls = [
      ...new Set([...unresolved, ...(fresh?.evidence.sampleUrls || [])]),
    ].sort();
    const carried: FindingData = {
      ...(fresh || old),
      evidence: {
        ...(fresh || old).evidence,
        firstBadDeploy: old.evidence.firstBadDeploy,
        pagesAffected: urls.length,
        sampleUrls: urls,
        details: {
          ...details,
          continuedFromFindingId: old.id,
          observations: urls.map((url) => ({
            url,
            before:
              details?.observations?.find((o) => o.url === url)?.before ||
              freshDetails?.observations?.find((o) => o.url === url)?.before ||
              null,
            after: pages.get(url)?.attrs || null,
          })),
        },
      },
      title: `${old.type.replaceAll("_", " ")}: ${urls.length} page(s)`,
      status: "OPEN",
    };
    if (fresh) result[result.indexOf(fresh)] = carried;
    else result.push(carried);
  }
  return result;
}
