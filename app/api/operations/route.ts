import { api, query } from "../../../lib/server/api";
import { selector } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { queueHealth } from "../../../lib/jobs/monitor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const project = await resolveProject(actor, query(req, selector.strict()));
  return queueHealth(project.id);
});
