import { z } from "zod";
import { api, jsonBody, query } from "../../../lib/server/api";
import { selector, id } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { fail } from "../../../lib/server/errors";
import { operation, hash } from "../../../lib/server/operation";
import {
  enqueueAnalysis,
  jobPayload,
  ANALYSIS_VERSION,
} from "../../../lib/jobs/queue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const p = await resolveProject(actor, query(req, selector.strict()));
  return {
    jobs: await db.analysisJob.findMany({
      where: { projectId: p.id },
      select: {
        id: true,
        deploymentId: true,
        status: true,
        attempts: true,
        errorCode: true,
        availableAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
  };
});
export const POST = api(
  async (req, actor, requestId) => {
    const body = await jsonBody(
      req,
      selector
        .extend({ jobId: id, action: z.enum(["retry", "cancel", "recheck"]) })
        .strict(),
    );
    const p = await resolveProject(actor, body);
    if (body.action === "recheck") {
      const key = z
        .string()
        .min(8)
        .max(100)
        .parse(req.headers.get("idempotency-key"));
      const old = await db.analysisJob.findFirst({
        where: { id: body.jobId, projectId: p.id },
        include: { deployment: true },
      });
      if (!old) fail(404, "NOT_FOUND", "Job not found.");
      if (old.status !== "COMPLETE" || old.deployment.status !== "DEGRADED")
        fail(
          409,
          "INVALID_TRANSITION",
          "Only a completed degraded analysis can be rechecked.",
        );
      return operation(p.id, actor.id, "recheck", key, body, async () => {
        const job = await enqueueAnalysis(
          p.id,
          jobPayload.parse(JSON.parse(old.payload)),
          undefined,
          `${ANALYSIS_VERSION}-recheck-${hash(key).slice(0, 20)}`,
        );
        return {
          jobId: job.id,
          deploymentId: job.deploymentId,
          status: job.status,
        };
      });
    }
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${p.id} FOR UPDATE`;
      const job = await tx.analysisJob.findFirst({
        where: { id: body.jobId, projectId: p.id },
      });
      if (!job) fail(404, "NOT_FOUND", "Job not found.");
      if (body.action === "retry" && job.status !== "FAILED")
        fail(409, "INVALID_TRANSITION", "Only failed jobs can be retried.");
      if (
        body.action === "cancel" &&
        !["QUEUED", "RUNNING"].includes(job.status)
      )
        fail(409, "INVALID_TRANSITION", "Only active jobs can be cancelled.");
      if (job.leaseToken)
        await tx.project.updateMany({
          where: { id: p.id, leaseToken: job.leaseToken },
          data: { leaseToken: null, leaseUntil: null },
        });
      const status = body.action === "retry" ? "QUEUED" : "CANCELLED";
      await tx.analysisJob.update({
        where: { id: job.id },
        data: {
          status,
          attempts: body.action === "retry" ? 0 : job.attempts,
          availableAt: new Date(),
          leaseToken: null,
          leaseUntil: null,
        },
      });
      await tx.deployment.update({
        where: { id: job.deploymentId },
        data: { status, errorCode: null },
      });
      await tx.auditEvent.create({
        data: {
          actor: actor.id,
          projectId: p.id,
          action: body.action,
          subjectId: job.id,
          requestId,
        },
      });
      return { jobId: job.id, status };
    });
  },
  { limit: 10 },
);
