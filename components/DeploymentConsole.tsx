"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  GitCommit,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useProject } from "./ProjectAccess";
import { FindingCard } from "./ui/FindingCard";
import { Gauge } from "./ui/Gauge";
import { FindingData } from "../lib/detect/types";
import { Alert } from "./ui/Badge";
import { Button, ButtonLink } from "./ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Panel,
} from "./ui/Card";
import { PageHeader, PageSection, StatTile } from "./ui/PageLayout";
import { StatusBadge } from "./ui/Badge";
import {
  WorkerStatusBanner,
  type WorkerStatus,
} from "./ui/WorkerStatusBanner";
import { DeploymentSetupGuide } from "./connect/DeploymentSetupGuide";
import { needsRevisionSetup } from "../lib/connect/deployment-setup";

interface Deployment {
  id: string;
  sha: string;
  deployNumber: number;
  status: string;
  degradation: string;
  findings: (FindingData & {
    remediations?: {
      id: string;
      prUrl: string | null;
      prNumber: number | null;
      validationResult: string;
      patchDiff: string;
    }[];
    recovery?: { deploymentId: string; verifiedAt: string } | null;
  })[];
  jobs?: {
    id: string;
    status: string;
    attempts: number;
    errorCode: string | null;
  }[];
  recoveries?: { id: string; verifiedAt: string; finding: { type: string } }[];
  score: { searchHealth: number; geoScore: number } | null;
  findingCount?: number;
  recoveryCount?: number;
}

function mergeDeployments(
  prev: Deployment[],
  incoming: Deployment[],
): Deployment[] {
  const prevById = new Map(prev.map((d) => [d.id, d]));
  return incoming.map((d) => {
    const existing = prevById.get(d.id);
    if (!existing) return d;
    return {
      ...existing,
      ...d,
      findings: d.findings.length ? d.findings : existing.findings,
      recoveries: d.recoveries?.length ? d.recoveries : existing.recoveries,
    };
  });
}

function hasActiveJob(items: Deployment[]) {
  return items.some((d) =>
    d.jobs?.some((j) => ["QUEUED", "RUNNING"].includes(j.status)),
  );
}

export default function Watch({
  deployNumber,
  view = "dashboard",
}: {
  deployNumber?: number;
  view?: "dashboard" | "regression" | "remediation";
} = {}) {
  const { project } = useProject();
  const [items, setItems] = useState<Deployment[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">(
    "info",
  );
  const [busy, setBusy] = useState(false);
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const currentProject = useRef(project?.id);
  const jobStatuses = useRef<Map<string, string>>(new Map());
  currentProject.current = project?.id;

  const reload = useCallback(
    async (
      detail: "summary" | "full" = "full",
      signal?: AbortSignal,
    ): Promise<Deployment[]> => {
      if (!project) {
        setItems([]);
        setWorker(null);
        return [];
      }
      const params = new URLSearchParams({ projectId: project.id, detail });
      if (deployNumber) params.set("deployNumber", String(deployNumber));
      const res = await fetch(`/api/deployments?${params}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (signal?.aborted) return [];

      const deployments: Deployment[] = data.deployments;
      if (detail === "summary") {
        if (data.worker) setWorker(data.worker);
        let merged: Deployment[] = [];
        setItems((prev) => {
          merged = mergeDeployments(prev, deployments);
          return merged;
        });
        return merged;
      }
      setItems(deployments);
      return deployments;
    },
    [project, deployNumber],
  );

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setWorker(null);
    setMessage("");
    jobStatuses.current = new Map();

    const trackJobs = (deployments: Deployment[]) => {
      for (const d of deployments) {
        for (const job of d.jobs ?? []) {
          jobStatuses.current.set(job.id, job.status);
        }
      }
    };

    let timer: ReturnType<typeof setTimeout>;
    let latest: Deployment[] = [];

    void (async () => {
      try {
        latest = await reload("full", controller.signal);
        if (controller.signal.aborted) return;
        trackJobs(latest);

        while (!controller.signal.aborted) {
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, hasActiveJob(latest) ? 4000 : 8000);
          });
          if (controller.signal.aborted) break;

          const summary = await reload("summary", controller.signal);
          if (controller.signal.aborted) break;
          latest = summary;

          let needsFull = false;
          for (const d of summary) {
            for (const job of d.jobs ?? []) {
              const prev = jobStatuses.current.get(job.id);
              if (
                prev &&
                ["QUEUED", "RUNNING"].includes(prev) &&
                !["QUEUED", "RUNNING"].includes(job.status)
              ) {
                needsFull = true;
                break;
              }
            }
            if (needsFull) break;
          }

          if (needsFull) {
            latest = await reload("full", controller.signal);
            if (controller.signal.aborted) break;
          }
          trackJobs(latest);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setMessageType("error");
          setMessage(e instanceof Error ? e.message : "Refresh failed.");
        }
      }
    })();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [reload]);

  async function run(finding?: FindingData) {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch(
        finding ? "/api/generate-fix" : "/api/run-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            ...(finding ? { findingId: finding.id } : {}),
          }),
        },
      );
      const data = await res.json();
      if (currentProject.current !== project.id) return;
      if (!res.ok) throw new Error(data.error);
      setMessageType("success");
      setMessage(
        finding
          ? `Pull request opened: ${data.prUrl}`
          : `Analysis queued — job ${data.jobId}`,
      );
      await reload();
    } catch (e) {
      setMessageType("error");
      setMessage(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function jobAction(
    jobId: string,
    action: "retry" | "cancel" | "recheck",
  ) {
    if (!project || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ projectId: project.id, jobId, action }),
      });
      const data = await response.json();
      if (currentProject.current !== project.id) return;
      if (!response.ok) throw new Error(data.error);
      setMessageType("info");
      setMessage(`Job ${action}: ${data.status}`);
      await reload();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Job action failed.");
    } finally {
      setBusy(false);
    }
  }

  const latest = items[0];
  const latestDegradation: string[] = latest
    ? JSON.parse(latest.degradation)
    : [];
  const showSetupGuide =
    !!project &&
    !!latest &&
    (latest.status === "DEGRADED" || needsRevisionSetup(latestDegradation));
  const viewMeta = {
    dashboard: {
      eyebrow: "Live watch",
      title: project?.repo || "Select a project",
      description:
        "Deploy → observe → detect → diagnose → remediate → verify",
    },
    regression: {
      eyebrow: "Regression analysis",
      title: "Regression evidence",
      description: "Findings and degradation signals from persisted deployments",
    },
    remediation: {
      eyebrow: "Recovery & PRs",
      title: "Remediation pipeline",
      description: "Pull requests, patch validation, and verified recovery",
    },
  }[view];

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        eyebrow={viewMeta.eyebrow}
        title={viewMeta.title}
        description={viewMeta.description}
        actions={
          <>
            <ButtonLink href="/graph" variant="outline" size="sm">
              Graph
            </ButtonLink>
            <ButtonLink href="/seo-advisor" variant="outline" size="sm">
              SEO Advisor
            </ButtonLink>
            <ButtonLink href="/geo" variant="outline" size="sm">
              Citation test
            </ButtonLink>
            <Button
              disabled={!project || busy}
              loading={busy && !latest}
              onClick={() => void run()}
              size="sm"
            >
              Analyze deployment
            </Button>
          </>
        }
      />

      <WorkerStatusBanner
        worker={worker}
        onRefresh={() => void reload("summary")}
      />

      {showSetupGuide && (
        <DeploymentSetupGuide
          className="mt-6"
          compact
          siteUrl={project?.siteUrl}
        />
      )}

      {message && (
        <Alert
          variant={
            messageType === "error"
              ? "error"
              : messageType === "success"
                ? "success"
                : "info"
          }
          className="mt-6"
        >
          {message}
        </Alert>
      )}

      {latest?.score && (
        <PageSection className="mt-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
            <StatTile label="Search health" value={`${latest.score.searchHealth}`} />
            <StatTile label="GEO score" value={`${latest.score.geoScore}`} />
          </div>
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-5">
            <Gauge
              value={latest.score.searchHealth}
              title="Search Crawler Health"
              lensLabel="SEARCH LENS"
            />
            <Gauge
              value={latest.score.geoScore}
              title="AI Citation Readiness (GEO)"
              lensLabel="AI-ANSWER LENS"
            />
          </div>
        </PageSection>
      )}

      {!items.length && (
        <EmptyState
          className="mt-8"
          title={project ? "No deployments yet" : "No project connected"}
          description={
            project
              ? "Run an analysis on the current deployed revision to establish a baseline."
              : "Sign in and connect a repository to begin monitoring."
          }
          action={
            project ? (
              <Button disabled={busy} loading={busy} onClick={() => void run()}>
                Run first analysis
              </Button>
            ) : (
              <ButtonLink href="/connect">Connect repository</ButtonLink>
            )
          }
        />
      )}

      <div className="mt-8 space-y-5">
        {items.map((d) => (
          <Card key={d.id} className="overflow-hidden">
            <CardHeader className="bg-paper-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-paper-200 bg-surface">
                    <GitCommit className="h-4 w-4 stroke-[1.5] text-bone-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold font-sans">
                      Deployment #{d.deployNumber}
                      <StatusBadge status={d.status} />
                    </CardTitle>
                    <p className="mt-0.5 font-mono text-xs text-bone-500">
                      {d.sha.slice(0, 12)}
                    </p>
                  </div>
                </div>
                {d.score && (
                  <div className="flex gap-4 font-mono text-sm tabular-nums">
                    <span>
                      <span className="text-bone-500">Search </span>
                      <strong className="text-espresso-900">
                        {d.score.searchHealth}
                      </strong>
                    </span>
                    <span>
                      <span className="text-bone-500">GEO </span>
                      <strong className="text-espresso-900">
                        {d.score.geoScore}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {JSON.parse(d.degradation).length > 0 && (
                <Alert variant="warning">
                  {JSON.parse(d.degradation).join(" · ")}
                </Alert>
              )}

              {d.jobs?.map((job) => (
                <Panel
                  key={job.id}
                  variant="muted"
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <StatusBadge status={job.status} />
                    <span className="text-bone-700">
                      Attempt {job.attempts}
                      {job.errorCode && ` · ${job.errorCode}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.status === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void jobAction(job.id, "retry")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    {["QUEUED", "RUNNING"].includes(job.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void jobAction(job.id, "cancel")}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                    {job.status === "COMPLETE" && d.status === "DEGRADED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void jobAction(job.id, "recheck")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Recheck
                      </Button>
                    )}
                  </div>
                </Panel>
              ))}

              {d.recoveries?.map((r) => (
                <Alert key={r.id} variant="success">
                  Verified recovery: {r.finding.type} ·{" "}
                  {new Date(r.verifiedAt).toLocaleString()}
                </Alert>
              ))}

              {d.findings.map((f) => (
                <div key={f.id} className="space-y-3">
                  <FindingCard
                    finding={f}
                    onGenerateFix={
                      f.status === "OPEN" ? () => void run(f) : undefined
                    }
                    isFixing={busy}
                  />
                  {f.recovery && (
                    <p className="text-sm text-patina-700">
                      Recovered in deployment {f.recovery.deploymentId}. Verified
                      from deployed evidence — PR merge is not assumed.
                    </p>
                  )}
                  <details className="group rounded-md border border-paper-200 bg-paper-50">
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-espresso-700 hover:bg-paper-100">
                      Recorded evidence
                    </summary>
                    <pre className="overflow-auto border-t border-paper-200 p-4 font-mono text-xs text-espresso-700">
                      {JSON.stringify(f.evidence, null, 2)}
                    </pre>
                  </details>
                  {f.remediations?.map((r) => (
                    <Panel key={r.id} variant="muted" className="p-4 space-y-3">
                      {r.prUrl && (
                        <a
                          href={r.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 hover:underline"
                        >
                          Review PR #{r.prNumber}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-espresso-700">
                          Patch and validation
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-md bg-paper-50 border border-paper-200 p-3 text-xs text-espresso-700">
                          {r.patchDiff}
                          {"\n"}
                          {JSON.stringify(JSON.parse(r.validationResult), null, 2)}
                        </pre>
                      </details>
                    </Panel>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
