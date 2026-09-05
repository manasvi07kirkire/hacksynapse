import { api, query } from "../../../lib/server/api";
import { selector } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const p = await resolveProject(actor, query(req, selector.strict()));
  const score = await db.score.findFirst({
    where: { deployment: { projectId: p.id } },
    orderBy: { deployment: { deployNumber: "desc" } },
  });
  const citation = await db.citationTest.findFirst({
    where: { projectId: p.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return {
    score: score
      ? { ...score, inputs: undefined, breakdown: JSON.parse(score.breakdown) }
      : null,
    citationTest: citation,
  };
});
