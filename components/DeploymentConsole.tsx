"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useProject } from "./ProjectAccess";
import { FindingCard } from "./ui/FindingCard";
import { Gauge } from "./ui/Gauge";
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
  const latest = items[0];
  return (
    <main className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6 bg-bone-100 min-h-screen">
      <header className="border-b-2 border-bone-300 pb-5 space-y-2">
        <p className="font-mono text-xs font-bold text-ember-600 uppercase tracking-widest">
          Live Watch · Connected project
        </p>
        <h1 className="font-mono font-black text-3xl sm:text-4xl text-ink-900">
          {project?.repo || "Select a connected project"}
        </h1>
        <p className="text-sm text-bone-700">
          {view === "regression"
            ? "Regression evidence from persisted deployments"
            : view === "remediation"
              ? "Pull requests and verified recovery"
              : "Deploy → observe → detect → diagnose → remediate → verify"}
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={!project || busy}
          onClick={() => void run()}
          className="bg-ember-600 hover:bg-ember-600/90 text-bone-100 px-5 py-2.5 rounded-sm font-semibold disabled:opacity-50"
        >
          Analyze current deployment
        </button>
        <Link href="/graph" className="border border-bone-300 px-4 py-2 rounded-sm">
          Graph
        </Link>
        <Link href="/seo-advisor" className="border border-bone-300 px-4 py-2 rounded-sm">
          SEO Advisor
        </Link>
        <Link href="/geo" className="border border-bone-300 px-4 py-2 rounded-sm">
          Citation test
        </Link>
        <Link href="/preview" className="border border-bone-300 px-4 py-2 rounded-sm">
          Demo scenarios
        </Link>
      </div>
      <p role="status" className="text-sm font-medium text-ink-900">
        {message}
      </p>
      {latest?.score && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Gauge
            value={latest.score.searchHealth}
            title="Search Crawler Health"
            lensLabel="SEARCH LENS"
          />
          <Gauge
            value={latest.score.geoScore}
            title="AI-Answer Citation-Readiness (GEO)"
            lensLabel="AI-ANSWER LENS"
          />
        </section>
      )}
      {!items.length && (
        <p className="text-bone-700 border border-bone-300 rounded-sm p-6 bg-white">
          {project
            ? "No deployments yet. Click Analyze to crawl demops.vercel.app and establish a baseline."
            : "Sign in at /connect and select parth-gholap/demo-ops to begin."}
        </p>
      )}
      {items.map((d) => (
        <article
          key={d.id}
          className="border border-bone-300 bg-white rounded-md p-5 space-y-3 shadow-sm"
        >
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
