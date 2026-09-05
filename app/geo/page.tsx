"use client";
import { useEffect, useRef, useState } from "react";
import { useProject } from "../../components/ProjectAccess";
type Citation = {
  modelAnswer: string;
  modelUsed: string;
  score: number;
  groundedFacts: {
    fact: string;
    isGrounded: boolean;
    sourceSupported?: boolean;
  }[];
};
export default function GeoPage() {
  const { project } = useProject();
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("Summarize the documented facts.");
  const [facts, setFacts] = useState("");
  const [result, setResult] = useState<Citation | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    pending.current?.abort();
    setBusy(false);
    setError("");
    setResult(null);
    setScore(null);
    setFacts("");
    setUrl(project?.siteUrl || "");
    if (project)
      void fetch(`/api/geo?projectId=${project.id}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (controller.signal.aborted) return;
          setScore(data.score?.geoScore ?? null);
          if (data.citationTest)
            setResult({
              ...data.citationTest,
              groundedFacts:
                typeof data.citationTest.groundedFacts === "string"
                  ? JSON.parse(data.citationTest.groundedFacts)
                  : data.citationTest.groundedFacts,
            });
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [project]);
  async function run() {
    if (!project || busy) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const expectedFacts = facts
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      const response = await fetch("/api/citation-test", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          projectId: project.id,
          url,
          query,
          ...(expectedFacts.length ? { expectedFacts } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!controller.signal.aborted) setResult(data);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Citation test failed.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <h1 className="font-mono text-3xl">GEO and citation grounding</h1>
      <p>
        {project?.repo || "Connect a project to test its deployed content."}
      </p>
      <p>
        Latest deployment GEO score:{" "}
        {score === null ? "Not measured" : `${score}/100`}
      </p>
      <form
        className="grid gap-4 border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label>
          Page URL
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border p-2 w-full"
          />
        </label>
        <label>
          Question
          <input
            required
            maxLength={500}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border p-2 w-full"
          />
        </label>
        <label>
          Expected facts (optional, one per line)
          <textarea
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            className="border p-2 w-full"
          />
        </label>
        <button
          disabled={!project || busy}
          className="bg-ink-900 text-bone-100 p-3 disabled:opacity-50"
        >
          {busy ? "Testing..." : "Run citation test"}
        </button>
      </form>
      <p role="status">{error}</p>
      {result ? (
        <section className="border p-5 space-y-4">
          <h2 className="text-xl">Grounding: {result.score}/5</h2>
          <p>Model: {result.modelUsed}</p>
          <p className="whitespace-pre-wrap">{result.modelAnswer}</p>
          <ul>
            {result.groundedFacts.map((fact, i) => (
              <li key={i}>
                {fact.isGrounded
                  ? "Supported in source and answer"
                  : "Not supported in both"}
                : {fact.fact}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p>No citation result for this project yet.</p>
      )}
      <p className="text-sm text-bone-700">
        Grounding checks exact normalized phrases against the fetched page and
        model answer. This does not measure the probability that a search engine
        will cite your page.
      </p>
    </main>
  );
}
