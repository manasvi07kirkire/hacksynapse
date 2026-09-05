"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useProject } from "./ProjectAccess";
import { FindingCard } from "./ui/FindingCard";
import { FindingData } from "../lib/detect/types";
import Link from "next/link";
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
  const [busy, setBusy] = useState(false);
  const currentProject = useRef(project?.id);
  currentProject.current = project?.id;
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!project) {
        setItems([]);
        return;
      }
      const res = await fetch(
        `/api/deployments?projectId=${project.id}${deployNumber ? `&deployNumber=${deployNumber}` : ""}`,
        {
          signal,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!signal?.aborted) setItems(data.deployments);
    },
    [project, deployNumber],
  );
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setMessage("");
    const refresh = () => {
      void reload(controller.signal).catch((e) => {
        if (!controller.signal.aborted) setMessage(e.message);
      });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
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
      setMessage(
        finding
          ? `Pull request opened: ${data.prUrl}`
          : `Analysis queued: ${data.jobId}`,
      );
      await reload();
    } catch (e) {
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
      setMessage(`${action}: ${data.status}`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Job action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-5">
      <h1 className="text-3xl">
        {project?.repo || "Select a connected project"}
      </h1>
      <p>
        {view === "regression"
          ? "Regression evidence"
          : view === "remediation"
            ? "Pull requests and verified recovery"
            : "Deploy → observe → detect → diagnose → remediate → verify"}
      </p>
      <div className="flex gap-4">
        <button
          disabled={!project || busy}
          onClick={() => void run()}
          className="bg-ink-900 text-bone-100 p-3 disabled:opacity-50"
        >
          Analyze current deployment
        </button>
        <Link href="/graph">Graph</Link>
        <Link href="/seo-advisor">SEO Advisor</Link>
        <Link href="/geo">Citation test</Link>
      </div>
      <p role="status">{message}</p>
      {!items.length && (
        <p>
          {project
            ? "No deployments to display. Analyze the deployed revision to establish a baseline."
            : "Sign in and connect a repository to begin."}
        </p>
      )}
      {items.map((d) => (
        <article key={d.id} className="border p-4 space-y-3">
          <h2>
            Deployment #{d.deployNumber} · {d.status} · {d.sha.slice(0, 12)}
          </h2>
          {d.score && (
            <p>
              Search health: {d.score.searchHealth}/100 · GEO:{" "}
              {d.score.geoScore}/100
            </p>
          )}
          <p className="text-sm">{JSON.parse(d.degradation).join(", ")}</p>
          {d.jobs?.map((job) => (
            <div key={job.id} className="flex gap-3 flex-wrap text-sm">
              <span>
                Job: {job.status} · Attempt {job.attempts} {job.errorCode}
              </span>
              {job.status === "FAILED" && (
                <button
                  disabled={busy}
                  onClick={() => void jobAction(job.id, "retry")}
                >
                  Retry analysis
                </button>
              )}
              {["QUEUED", "RUNNING"].includes(job.status) && (
                <button
                  disabled={busy}
                  onClick={() => void jobAction(job.id, "cancel")}
                >
                  Cancel analysis
                </button>
              )}
              {job.status === "COMPLETE" && d.status === "DEGRADED" && (
                <button
                  disabled={busy}
                  onClick={() => void jobAction(job.id, "recheck")}
                >
                  Recheck deployed revision
                </button>
              )}
            </div>
          ))}
          {d.recoveries?.map((r) => (
            <p key={r.id} className="text-patina-600">
              Verified recovery: {r.finding.type} ·{" "}
              {new Date(r.verifiedAt).toLocaleString()}
            </p>
          ))}
          {d.findings.map((f) => (
            <div key={f.id} className="space-y-2">
              <FindingCard
                key={f.id}
                finding={f}
                onGenerateFix={
                  f.status === "OPEN" ? () => void run(f) : undefined
                }
                isFixing={busy}
              />
              {f.recovery && (
                <p>
                  Recovered in deployment {f.recovery.deploymentId}. Verified
                  from deployed evidence; PR merge is not assumed.
                </p>
              )}
              <details>
                <summary>Recorded evidence</summary>
                <pre className="overflow-auto p-3 text-xs">
                  {JSON.stringify(f.evidence, null, 2)}
                </pre>
              </details>
              {f.remediations?.map((r) => (
                <div key={r.id} className="border p-3">
                  {r.prUrl && (
                    <a href={r.prUrl} target="_blank" rel="noreferrer">
                      Review PR #{r.prNumber}
                    </a>
                  )}
                  <details>
                    <summary>Patch and validation</summary>
                    <pre className="overflow-auto text-xs">
                      {r.patchDiff}
                      {"\n"}
                      {JSON.stringify(JSON.parse(r.validationResult), null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          ))}
        </article>
      ))}
    </main>
  );
}
