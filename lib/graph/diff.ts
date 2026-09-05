import { GraphDiffResult, GraphSnapshotData } from "./types";
export function diffGraphSnapshots(
  prev: GraphSnapshotData,
  curr: GraphSnapshotData,
): GraphDiffResult {
  if (
    prev.complete === false ||
    curr.complete === false ||
    prev.version !== curr.version ||
    prev.deploymentId === curr.deploymentId
  )
    throw new Error("Snapshots are not comparable");
  const key = (n: GraphSnapshotData["nodes"][number]) => `${n.type}:${n.key}`;
  const old = new Map(prev.nodes.map((n) => [key(n), n]));
  const next = new Map(curr.nodes.map((n) => [key(n), n]));
  const changedNodes: GraphDiffResult["changedNodes"] = [];
  for (const n of curr.nodes) {
    const p = old.get(key(n));
    if (!p) continue;
    const propertyDeltas = [
      ...new Set([...Object.keys(p.attrs), ...Object.keys(n.attrs)]),
    ]
      .sort()
      .filter((k) => JSON.stringify(p.attrs[k]) !== JSON.stringify(n.attrs[k]))
      .map((property) => ({
        property,
        before: p.attrs[property],
        after: n.attrs[property],
      }));
    if (p.title !== n.title)
      propertyDeltas.push({
        property: "title",
        before: p.title,
        after: n.title,
      });
    if (propertyDeltas.length)
      changedNodes.push({
        nodeId: n.id,
        url: n.url,
        changeType: "CHANGED",
        healthBefore: p.health,
        healthAfter: n.health,
        propertyDeltas,
      });
  }
  const edgeKey = (e: GraphSnapshotData["edges"][number]) =>
    `${e.fromNodeId}:${e.kind}:${e.toNodeId}`;
  const pe = new Set(prev.edges.map(edgeKey));
  const ce = new Set(curr.edges.map(edgeKey));
  const regressedNodeIds = changedNodes
    .filter((n) => n.healthBefore === "PASS" && n.healthAfter !== "PASS")
    .map((n) => n.nodeId);
  return {
    previousDeploymentId: prev.deploymentId,
    currentDeploymentId: curr.deploymentId,
    addedNodes: curr.nodes.filter((n) => !old.has(key(n))),
    removedNodes: prev.nodes.filter((n) => !next.has(key(n))),
    changedNodes,
    addedEdges: curr.edges.filter((e) => !pe.has(edgeKey(e))),
    removedEdges: prev.edges.filter((e) => !ce.has(edgeKey(e))),
    regressedNodeIds,
    totalAffectedPages: regressedNodeIds.length,
  };
}
