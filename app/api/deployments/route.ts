import { api, query } from "../../../lib/server/api";
import { pageQuery } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { fail } from "../../../lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const q = query(req, pageQuery);
  const project = await resolveProject(actor, q);
  const deployments = await db.deployment.findMany({
    where: {
      projectId: project.id,
      ...(q.deployNumber ? { deployNumber: q.deployNumber } : {}),
    },
    orderBy: { deployNumber: "desc" },
    take: q.limit,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    include: {
      score: true,
      jobs: {
        select: { id: true, status: true, attempts: true, errorCode: true },
        take: 1,
      },
      recoveries: {
        select: {
          id: true,
          verifiedAt: true,
          finding: { select: { id: true, type: true } },
        },
        take: 100,
      },
      findings: {
        take: 100,
        orderBy: { id: "asc" },
        include: {
          recovery: { select: { deploymentId: true, verifiedAt: true } },
          remediations: { take: 10, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (q.deployNumber && !deployments.length)
    fail(404, "NOT_FOUND", "Deployment not found.");
  const parsed = deployments.map((d) => ({
    ...d,
    score: d.score
      ? {
          ...d.score,
          inputs: undefined,
          breakdown: JSON.parse(d.score.breakdown),
        }
      : null,
    findings: d.findings.map((f) => ({
      ...f,
      evidence: JSON.parse(f.evidence),
      rootCause: JSON.parse(f.rootCause),
    })),
  }));
  return {
    project: { id: project.id, repo: project.repo },
    deployments: parsed,
    deployment: parsed[0] || null,
    nextCursor: deployments.length === q.limit ? deployments.at(-1)?.id : null,
  };
});
