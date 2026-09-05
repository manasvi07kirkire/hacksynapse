import { api, query } from "../../../lib/server/api";
import { pageQuery } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { fail } from "../../../lib/server/errors";
import { GRAPH_VERSION } from "../../../lib/graph/builder";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const q = query(req, pageQuery);
  const p = await resolveProject(actor, q);
  const graph = await db.graphSnapshot.findFirst({
    where: {
      version: GRAPH_VERSION,
      deployment: {
        projectId: p.id,
        ...(q.deployNumber ? { deployNumber: q.deployNumber } : {}),
      },
    },
    orderBy: { deployment: { deployNumber: "desc" } },
  });
  if (!graph) fail(404, "NOT_FOUND", "Graph not found.");
  return { snapshot: JSON.parse(graph.data) };
});
