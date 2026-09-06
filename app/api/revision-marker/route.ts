import { z } from "zod";
import { api, query } from "../../../lib/server/api";
import { id, url } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { checkRevisionMarker } from "../../../lib/connect/check-revision-marker";
import { fail } from "../../../lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const revisionMarkerQuery = z
  .object({
    projectId: id.optional(),
    siteUrl: url.optional(),
  })
  .strict()
  .refine((value) => value.projectId || value.siteUrl, {
    message: "Provide projectId or siteUrl.",
  });

export const GET = api(async (req, actor) => {
  const q = query(req, revisionMarkerQuery);

  if (q.projectId) {
    const project = await resolveProject(actor, q);
    return checkRevisionMarker({
      siteUrl: project.siteUrl,
      repo: project.repo,
      defaultBranch: project.defaultBranch,
      installId: project.installId,
    });
  }

  if (q.siteUrl) {
    return checkRevisionMarker({ siteUrl: q.siteUrl });
  }

  fail(400, "INVALID_INPUT", "Provide projectId or siteUrl.");
});
