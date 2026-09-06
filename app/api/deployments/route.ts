import { api, query } from "../../../lib/server/api";
import { pageQuery } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { fail } from "../../../lib/server/errors";
import { queueHealth } from "../../../lib/jobs/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fullInclude = {
  score: true,
  jobs: {
    select: { id: true, status: true, attempts: true, errorCode: true },
    take: 1,
    orderBy: { createdAt: "desc" as const },
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
    orderBy: { id: "asc" as const },
    include: {
      recovery: { select: { deploymentId: true, verifiedAt: true } },
      remediations: { take: 10, orderBy: { createdAt: "desc" as const } },
    },
  },
};

export const GET = api(async (req, actor) => {
  const q = query(req, pageQuery);
  const project = await resolveProject(actor, q);
  const isSummary = q.detail === "summary";
  const take = isSummary ? Math.min(q.limit, 10) : q.limit;

  const [deployments, health] = await Promise.all([
    isSummary
      ? db.deployment.findMany({
          where: {
            projectId: project.id,
            ...(q.deployNumber ? { deployNumber: q.deployNumber } : {}),
          },
          orderBy: { deployNumber: "desc" },
          take,
          ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
          select: {
            id: true,
            sha: true,
            deployNumber: true,
            status: true,
            degradation: true,
            score: { select: { searchHealth: true, geoScore: true } },
            jobs: fullInclude.jobs,
            _count: { select: { findings: true, recoveries: true } },
          },
        })
      : db.deployment.findMany({
          where: {
            projectId: project.id,
            ...(q.deployNumber ? { deployNumber: q.deployNumber } : {}),
          },
          orderBy: { deployNumber: "desc" },
          take,
          ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
          include: fullInclude,
        }),
    isSummary ? queueHealth(project.id) : Promise.resolve(null),
  ]);

  if (q.deployNumber && !deployments.length)
    fail(404, "NOT_FOUND", "Deployment not found.");

  const parsed = isSummary
    ? (
        deployments as Array<{
          id: string;
          sha: string;
          deployNumber: number;
          status: string;
          degradation: string;
          score: { searchHealth: number; geoScore: number } | null;
          jobs: Array<{
            id: string;
            status: string;
            attempts: number;
            errorCode: string | null;
          }>;
          _count: { findings: number; recoveries: number };
        }>
      ).map((row) => ({
        id: row.id,
        sha: row.sha,
        deployNumber: row.deployNumber,
        status: row.status,
        degradation: row.degradation,
        score: row.score,
        jobs: row.jobs,
        findingCount: row._count.findings,
        recoveryCount: row._count.recoveries,
        findings: [],
        recoveries: [],
      }))
    : (
        deployments as Array<{
          score: {
            searchHealth: number;
            geoScore: number;
            breakdown: string;
          } | null;
          findings: Array<{
            evidence: string;
            rootCause: string;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        }>
      ).map((d) => ({
        ...d,
        score: d.score
          ? {
              searchHealth: d.score.searchHealth,
              geoScore: d.score.geoScore,
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
    nextCursor: deployments.length === take ? deployments.at(-1)?.id : null,
    ...(health
      ? {
          worker: {
            activeWorkers: health.activeWorkers,
            queuedJobs: health.jobs.QUEUED ?? 0,
            runningJobs: health.jobs.RUNNING ?? 0,
            oldestQueuedSeconds: health.oldestQueuedSeconds,
          },
        }
      : {}),
  };
});
