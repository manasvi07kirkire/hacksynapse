import { api, jsonBody } from "../../../lib/server/api";
import { selector, sha } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { github } from "../../../lib/github/client";
import { enqueueAnalysis } from "../../../lib/jobs/queue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const POST = api(
  async (req, actor) => {
    const body = await jsonBody(
      req,
      selector
        .extend({ sha: sha.optional(), baseSha: sha.optional() })
        .strict(),
    );
    const project = await resolveProject(actor, body);
    const head = await github.head(project);
    const commit = body.sha || head;
    if (commit !== head)
      throw new (await import("../../../lib/server/errors")).AppError(
        409,
        "STALE_COMMIT",
        "Analysis must target the current default branch.",
      );
    const job = await enqueueAnalysis(project.id, {
      sha: commit,
      baseSha: body.baseSha,
      ref: `refs/heads/${project.defaultBranch}`,
      commitMsg: "Manual analysis",
      author: actor.id,
      forced: false,
    });
    return {
      jobId: job.id,
      deploymentId: job.deploymentId,
      status: job.status,
    };
  },
  { limit: 10, status: 202 },
);
