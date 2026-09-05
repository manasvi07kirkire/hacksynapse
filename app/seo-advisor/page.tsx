"use client";
import { useEffect, useRef, useState } from "react";
import { useProject } from "../../components/ProjectAccess";
import { Suggestion } from "../../lib/seo-advisor/types";
type Scan = { scanId: string; suggestions: Suggestion[]; provenance?: string };
export default function SeoAdvisorPage() {
  const { project } = useProject();
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sourceMode, setSourceMode] = useState("url");
  const [prNumber, setPrNumber] = useState("");
  const [mode, setMode] = useState("llm");
  const [scan, setScan] = useState<Scan | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    prUrl: string;
    prNumber: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    setBusy(false);
    setScan(null);
    setEdits({});
    setResult(null);
    setError("");
    setKeywords("");
    setPrNumber("");
    setUrl(project?.siteUrl || "");
    return () => pending.current?.abort();
  }, [project]);
  const setStatus = (id: string, status: Suggestion["status"]) =>
    setScan((value) =>
      value
        ? {
            ...value,
            suggestions: value.suggestions.map((s) =>
              s.id === id ? { ...s, status } : s,
            ),
          }
        : null,
    );
  async function submit(apply = false) {
    if (!project || busy) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const approved =
        scan?.suggestions
          .filter((s) => s.status === "approved")
          .map((s) => s.id) || [];
      const body = apply
        ? {
            projectId: project.id,
            scanId: scan?.scanId,
            approvedSuggestionIds: approved,
            rejectedSuggestionIds: scan?.suggestions
              .filter((s) => s.status === "rejected")
              .map((s) => s.id),
            edits: Object.fromEntries(
              Object.entries(edits).filter(([id]) => approved.includes(id)),
            ),
          }
        : {
            projectId: project.id,
            pageUrl: url || undefined,
            ...(sourceMode === "pr" ? { prNumber: Number(prNumber) } : {}),
            targetKeywords: keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            mode,
          };
      const res = await fetch(apply ? "/api/seo-apply" : "/api/seo-scan", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      if (apply) setResult(data);
      else {
        setScan(data);
        setEdits({});
        setResult(null);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "SEO operation failed.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <h1 className="font-mono text-3xl">SEO Advisor</h1>
      <p>
        {project?.repo || "Connect a project to scan and improve its source."}
      </p>
      <form
        className="grid gap-4 border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          Scan source
          <select
            className="border p-2 w-full"
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value)}
          >
            <option value="url">Deployed page</option>
            <option value="pr">Open pull request</option>
          </select>
        </label>
        <label>
          Page URL
          <input
            type="url"
            required={sourceMode === "url"}
            className="border p-2 w-full"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        {sourceMode === "pr" && (
          <label>
            Pull request number
            <input
              type="number"
              min="1"
              required
              className="border p-2 w-full"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
            />
          </label>
        )}
        <label>
          Target keywords
          <input
            required
            className="border p-2 w-full"
            placeholder="Comma-separated keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>
        <label>
          Suggestion mode
          <select
            className="border p-2 w-full"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="llm">Configured model</option>
            <option value="heuristic">Source-based heuristics</option>
          </select>
        </label>
        <button
          disabled={!project || busy}
          className="bg-ink-900 text-bone-100 p-3 disabled:opacity-50"
        >
          {busy && !scan ? "Scanning..." : "Scan page"}
        </button>
      </form>
      <p role="status">{error}</p>
      {scan && (
        <section className="space-y-4">
          <p>
            {scan.suggestions.length} suggestions � {scan.provenance}
          </p>
          {scan.suggestions.map((s) => (
            <article key={s.id} className="border p-5 space-y-3">
              <h2 className="text-xl">{s.location}</h2>
              <p>Before: {s.before || "(empty)"}</p>
              <label>
                Edit suggestion: {s.location}
                <textarea
                  aria-label={`Edit suggestion: ${s.location}`}
                  disabled={!!result || busy}
                  className="border p-2 w-full"
                  value={edits[s.id] ?? s.after}
                  onChange={(e) =>
                    setEdits((value) => ({ ...value, [s.id]: e.target.value }))
                  }
                />
              </label>
              <p>{s.rationale}</p>
              <div className="flex gap-4">
                <button
                  disabled={!!result || busy}
                  aria-pressed={s.status === "approved"}
                  onClick={() => setStatus(s.id, "approved")}
                >
                  Approve
                </button>
                <button
                  disabled={!!result || busy}
                  aria-pressed={s.status === "rejected"}
                  onClick={() => setStatus(s.id, "rejected")}
                >
                  Reject
                </button>
                <span>{s.status}</span>
              </div>
            </article>
          ))}
          <button
            disabled={
              busy ||
              !!result ||
              !scan.suggestions.some((s) => s.status === "approved")
            }
            className="bg-ink-900 text-bone-100 p-3 disabled:opacity-50"
            onClick={() => void submit(true)}
          >
            Open combined draft PR
          </button>
        </section>
      )}
      {result && (
        <a
          className="block underline"
          href={result.prUrl}
          target="_blank"
          rel="noreferrer"
        >
          Review PR #{result.prNumber}
        </a>
      )}
    </main>
  );
}
