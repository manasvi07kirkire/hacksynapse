import { db, dbTransaction } from "../db";
import { crawlRoutes, SiteFetcher } from "../crawler/crawl-routes";
import { buildDiscoverabilityGraph, GRAPH_VERSION } from "../graph/builder";
import { GraphSnapshotData } from "../graph/types";
import { runDetectionRules, RULE_VERSION } from "../detect/engine";
import { diagnoseRootCause } from "../diagnose/signature-matcher";
import { computeScores } from "../geo/scorer";
import { github, GitHubClient } from "../github/client";
import { jobPayload, claimJob, heartbeat } from "../jobs/queue";
import { AppError, errorCode, fail, logEvent } from "../server/errors";
import { AnalysisJob } from "@prisma/client";
import { narrateFinding } from "../llm/narrator";
import { configurationKey } from "../projects/configuration";
import { persistentFindings } from "../detect/persistent-findings";
import { FindingData } from "../detect/types";
export async function runDeploymentAnalysis(
  job: AnalysisJob,
  deps: { fetcher?: SiteFetcher; github?: GitHubClient } = {},
) {
  const started = Date.now();
  const payload = jobPayload.parse(JSON.parse(job.payload));
  const project = await db.project.findUniqueOrThrow({
    where: { id: job.projectId, enabled: true },
  });
  const deployment = await db.deployment.findUniqueOrThrow({
    where: { id: job.deploymentId, projectId: project.id },
  });
  const gh = deps.github || github;
  const degradation: string[] = [];
  const abort = new AbortController();
  let leaseError: unknown;
  const beat = setInterval(() => {
    void heartbeat(job).catch((e) => {
      leaseError = e;
      abort.abort();
    });
  }, 30000);
  const deadline = setTimeout(() => abort.abort(), 150000);
  try {
    await gh
      .status(project, payload.sha, "pending", "Analysis running")
      .catch(() => degradation.push("GITHUB_STATUS_UNAVAILABLE"));
    // Prior completed publication is selected before crawling/persisting the new graph.
    const previous = await db.deployment.findFirst({
      where: {
        projectId: project.id,
        ref: deployment.ref,
        analysisVersion: { endsWith: `-${configurationKey(project)}` },
        deployNumber: { lt: deployment.deployNumber },
        status: { in: ["HEALTHY", "REGRESSION"] },
        revisionVerified: true,
        snapshots: { some: { complete: true, version: GRAPH_VERSION } },
      },
      orderBy: { deployNumber: "desc" },
      include: { snapshots: true, score: true, findings: true },
    });
    let prior: GraphSnapshotData | undefined;
    let files: Awaited<ReturnType<GitHubClient["compare"]>> = [];
    if (previous && !payload.forced) {
      try {
        files = await gh.compare(project, previous.sha, payload.sha);
        prior = JSON.parse(previous.snapshots[0].data) as GraphSnapshotData;
      } catch (e) {
        degradation.push("PRIOR_COMPARISON_UNVERIFIED", errorCode(e));
      }
    } else if (payload.forced) degradation.push("FORCED_PUSH_BASELINE");
    const crawl = await crawlRoutes(
      JSON.parse(project.routeManifest),
      project.siteUrl,
      payload.sha,
      deps.fetcher,
      abort.signal,
    );
    if (leaseError) throw leaseError;
    if (!crawl.pages.length)
      throw new AppError(
        502,
        "CRAWL_FAILED",
        "No pages could be crawled.",
        true,
      );
    if (!crawl.revisionVerified)
      degradation.push("DEPLOYED_REVISION_UNVERIFIED");
    if (!crawl.complete) degradation.push("PARTIAL_CRAWL");
    if (!process.env.OPENROUTER_API_KEY)
      degradation.push("NARRATION_NOT_CONFIGURED");
    const snapshot = {
      ...buildDiscoverabilityGraph(deployment.id, crawl.pages),
      complete: crawl.complete,
      sitemapUrls: crawl.sitemapUrls,
      llmsTxtValid: crawl.llmsTxtValid,
      crawlErrors: crawl.errors,
    };
    const detected = runDetectionRules({
      deploymentSha: payload.sha,
      deployNumber: deployment.deployNumber,
      currentSnapshot: snapshot,
      previousSnapshot: crawl.revisionVerified ? prior : undefined,
    });
    const findings =
      prior && crawl.revisionVerified
        ? persistentFindings(
            snapshot,
            detected,
            (previous?.findings || []).map(
              (f) =>
                ({
                  ...f,
                  evidence: JSON.parse(f.evidence),
                  rootCause: JSON.parse(f.rootCause),
                }) as FindingData,
            ),
          )
        : detected;
    for (const finding of findings) {
      finding.rootCause =
        finding.rootCause || diagnoseRootCause(finding, files);
      if (
        process.env.OPENROUTER_API_KEY &&
        process.env.OPENROUTER_MODEL &&
        !abort.signal.aborted
      ) {
        const result = await narrateFinding(
          finding,
          AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]),
        );
        finding.description = result.narration;
        if (result.status === "UNAVAILABLE")
          degradation.push("NARRATION_UNAVAILABLE");
      }
    }
    if (abort.signal.aborted || leaseError)
      throw new AppError(
        504,
        "ANALYSIS_TIMEOUT",
        "Analysis deadline or lease expired.",
        true,
      );
    const scores = computeScores(
      snapshot,
      findings,
      prior && previous?.score ? previous.score : undefined,
    );
    const status =
      !crawl.complete ||
      !crawl.revisionVerified ||
      degradation.some((d) =>
        ["PRIOR_COMPARISON_UNVERIFIED", "FORCED_PUSH_BASELINE"].includes(d),
      )
        ? "DEGRADED"
        : findings.length
          ? "REGRESSION"
          : "HEALTHY";
    await db.$transaction(
      async (tx) => {
        // Taking the project lock fences a stale worker from publishing after lease replacement.
        const locked = await tx.project.updateMany({
          where: {
            id: project.id,
            leaseToken: job.leaseToken,
            leaseUntil: { gt: new Date() },
            enabled: true,
          },
          data: { leaseUntil: new Date(Date.now() + 180000) },
        });
        if (locked.count !== 1) fail(409, "LEASE_LOST", "Job lease expired.");
        const prefix = `${deployment.id}_`;
        const graph = await tx.graphSnapshot.create({
          data: {
            deploymentId: deployment.id,
            version: GRAPH_VERSION,
            complete: crawl.complete,
            data: JSON.stringify(snapshot),
          },
        });
        await tx.node.createMany({
          data: snapshot.nodes.map((n) => ({
            id: prefix + n.id,
            snapshotId: graph.id,
            type: n.type,
            url: n.url,
            key: n.key,
            title: n.title,
            health: n.health,
            attrs: JSON.stringify(n.attrs),
          })),
        });
        await tx.edge.createMany({
          data: snapshot.edges.map((e) => ({
            id: prefix + e.id,
            snapshotId: graph.id,
            fromNodeId: prefix + e.fromNodeId,
            toNodeId: prefix + e.toNodeId,
            kind: e.kind,
          })),
        });
        await tx.finding.createMany({
          data: findings.map((f) => ({
            id: `${deployment.id}_${f.type}`,
            deploymentId: deployment.id,
            type: f.type,
            severity: f.severity,
            confidence: f.confidence,
            lens: f.lens,
            title: f.title,
            description:
              f.description ||
              "Deterministic finding; inspect recorded observations.",
            evidence: JSON.stringify(f.evidence),
            rootCause: JSON.stringify(f.rootCause),
            status: "OPEN",
            ruleVersion: RULE_VERSION,
          })),
        });
        await tx.score.create({
          data: {
            deploymentId: deployment.id,
            searchHealth: scores.searchHealth,
            geoScore: scores.geoScore,
            deltaSearch: scores.deltaSearch,
            deltaGeo: scores.deltaGeo,
            breakdown: JSON.stringify(scores.breakdown),
            version: scores.version,
            inputs: JSON.stringify({
              snapshot,
              findings,
              previousScore: prior ? previous?.score || null : null,
              citationStatus: scores.citationStatus,
            }),
          },
        });
        if (prior && crawl.complete && crawl.revisionVerified) {
          const resolved = await tx.finding.findMany({
            where: {
              status: "OPEN",
              type: { notIn: findings.map((f) => f.type) },
              deployment: {
                projectId: project.id,
                ref: deployment.ref,
                deployNumber: { lt: deployment.deployNumber },
                analysisVersion: { endsWith: `-${configurationKey(project)}` },
              },
            },
            select: { id: true },
          });
          for (const finding of resolved) {
            await tx.recovery.create({
              data: { findingId: finding.id, deploymentId: deployment.id },
            });
          }
          await tx.finding.updateMany({
            where: { id: { in: resolved.map((f) => f.id) } },
            data: { status: "REMEDIATED" },
          });
        }
        await tx.deployment.update({
          where: { id: deployment.id, status: "RUNNING" },
          data: {
            status,
            revisionVerified: crawl.revisionVerified,
            completedAt: new Date(),
            degradation: JSON.stringify(degradation),
          },
        });
        await tx.analysisJob.update({
          where: { id: job.id, leaseToken: job.leaseToken },
          data: { status: "COMPLETE", leaseUntil: null, leaseToken: null },
        });
        await tx.project.update({
          where: { id: project.id },
          data: { leaseUntil: null, leaseToken: null },
        });
      },
      dbTransaction,
    );
    await gh
      .status(
        project,
        payload.sha,
        status === "HEALTHY"
          ? "success"
          : status === "REGRESSION"
            ? "failure"
            : "error",
        `Analysis ${status.toLowerCase()}`,
      )
      .catch(() =>
        logEvent({
          event: "commit_status_failed",
          jobId: job.id,
          code: "GITHUB_STATUS_UNAVAILABLE",
        }),
      );
    logEvent({
      event: "analysis_completed",
      jobId: job.id,
      projectId: project.id,
      outcome: status,
      attempt: job.attempts,
      durationMs: Date.now() - started,
    });
    return { status, scores, findings, snapshot };
  } finally {
    clearInterval(beat);
    clearTimeout(deadline);
  }
}
export async function runOneJob(
  deps: Parameters<typeof runDeploymentAnalysis>[1] = {},
) {
  const job = await claimJob();
  if (!job) return false;
  try {
    await runDeploymentAnalysis(job, deps);
  } catch (e) {
    const retry = e instanceof AppError && e.retryable && job.attempts < 3;
    logEvent({
      event: "analysis_failed",
      jobId: job.id,
      code: errorCode(e),
      attempt: job.attempts,
    });
    try {
      await db.$transaction(async (tx) => {
        const owner = await tx.project.updateMany({
          where: { id: job.projectId, leaseToken: job.leaseToken },
          data: { leaseUntil: null, leaseToken: null },
        });
        if (!owner.count) return;
        await tx.analysisJob.update({
          where: { id: job.id, leaseToken: job.leaseToken },
          data: {
            status: retry ? "QUEUED" : "FAILED",
            errorCode: errorCode(e),
            availableAt: new Date(
              Date.now() + 1000 * 2 ** job.attempts + Math.random() * 1000,
            ),
            leaseUntil: null,
            leaseToken: null,
          },
        });
        await tx.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: retry ? "QUEUED" : "FAILED",
            errorCode: errorCode(e),
          },
        });
      }, dbTransaction);
    } catch {
      logEvent({
        event: "analysis_cleanup_failed",
        jobId: job.id,
        code: "DATABASE_UNAVAILABLE",
      });
      throw e;
    }
  }
  return true;
}
