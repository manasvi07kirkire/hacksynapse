"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Compass, XCircle } from "lucide-react";
import { useProject } from "../../components/ProjectAccess";
import { Alert } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Panel,
} from "../../components/ui/Card";
import {
  FieldGroup,
  Input,
  Label,
  Textarea,
} from "../../components/ui/FormControls";
import { PageHeader, PageSection, StatTile } from "../../components/ui/PageLayout";

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
    <div className="page-container animate-fade-in">
      <PageHeader
        eyebrow="GEO engine"
        title="Citation grounding test"
        description={
          project?.repo
            ? `Test how well AI answer engines can ground responses in ${project.repo}'s deployed content.`
            : "Connect a project to test citation grounding on deployed content."
        }
      />

      {project && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 max-w-lg">
          <StatTile
            label="Latest GEO score"
            value={score === null ? "—" : `${score}`}
            hint={score !== null ? "out of 100" : "Not measured"}
          />
        </div>
      )}

      {!project ? (
        <EmptyState
          className="mt-8"
          title="No project connected"
          description="Connect a repository to run citation grounding tests."
        />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-steel-400/10 text-steel-500">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Run citation test</CardTitle>
                  <CardDescription>
                    Ask a question about a page and verify fact grounding.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <FieldGroup>
                  <Label required>
                    Page URL
                    <Input
                      required
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </Label>
                  <Label required>
                    Question
                    <Input
                      required
                      maxLength={500}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Label>
                  <Label hint="One fact per line — optional">
                    Expected facts
                    <Textarea
                      value={facts}
                      onChange={(e) => setFacts(e.target.value)}
                      placeholder="Fact one&#10;Fact two"
                    />
                  </Label>
                  <Button
                    type="submit"
                    disabled={busy}
                    loading={busy}
                    className="w-full"
                  >
                    Run citation test
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            {result ? (
              <PageSection title="Grounding results">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Score: {result.score}/5</CardTitle>
                    <span className="font-mono text-xs text-bone-500">
                      Model: {result.modelUsed}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Panel variant="muted" className="p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-espresso-700">
                        {result.modelAnswer}
                      </p>
                    </Panel>
                    <ul className="space-y-2">
                      {result.groundedFacts.map((fact, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 rounded-md border border-paper-200 bg-paper-50 px-3 py-2.5 text-sm"
                        >
                          {fact.isGrounded ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-patina-400" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
                          )}
                          <span className="text-espresso-700">{fact.fact}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </PageSection>
            ) : (
              !error && (
                <EmptyState
                  title="No citation result yet"
                  description="Run a test to see how well the model grounds its answer in your page content."
                />
              )
            )}

            <p className="text-xs leading-relaxed text-bone-500">
              Grounding checks normalized phrases against the fetched page and
              model answer. This does not measure the probability that a search
              engine will cite your page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
