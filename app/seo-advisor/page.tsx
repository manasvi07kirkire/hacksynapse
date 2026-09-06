"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Sparkles, X } from "lucide-react";
import { useProject } from "../../components/ProjectAccess";
import { Suggestion } from "../../lib/seo-advisor/types";
import { Alert } from "../../components/ui/Badge";
import { Badge } from "../../components/ui/Badge";
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
  Select,
  Textarea,
} from "../../components/ui/FormControls";
import { PageHeader, PageSection } from "../../components/ui/PageLayout";

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

  const approvedCount =
    scan?.suggestions.filter((s) => s.status === "approved").length ?? 0;

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        eyebrow="SEO advisor"
        title="Page optimization suggestions"
        description={
          project?.repo
            ? `Scan ${project.repo} pages and generate actionable SEO improvements with optional draft PRs.`
            : "Connect a project to scan pages and generate SEO suggestions."
        }
      />

      {!project ? (
        <EmptyState
          className="mt-8"
          title="No project connected"
          description="Connect a repository to use the SEO advisor."
        />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 h-fit">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-soft text-marigold-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Scan configuration</CardTitle>
                  <CardDescription>
                    Choose a source page and target keywords.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <FieldGroup>
                  <Label>
                    Scan source
                    <Select
                      value={sourceMode}
                      onChange={(e) => setSourceMode(e.target.value)}
                    >
                      <option value="url">Deployed page</option>
                      <option value="pr">Open pull request</option>
                    </Select>
                  </Label>
                  <Label required={sourceMode === "url"}>
                    Page URL
                    <Input
                      type="url"
                      required={sourceMode === "url"}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </Label>
                  {sourceMode === "pr" && (
                    <Label required>
                      Pull request number
                      <Input
                        type="number"
                        min="1"
                        required
                        value={prNumber}
                        onChange={(e) => setPrNumber(e.target.value)}
                      />
                    </Label>
                  )}
                  <Label required hint="Comma-separated">
                    Target keywords
                    <Input
                      required
                      placeholder="seo, discoverability, crawl"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </Label>
                  <Label>
                    Suggestion mode
                    <Select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="llm">Configured model</option>
                      <option value="heuristic">Source-based heuristics</option>
                    </Select>
                  </Label>
                  <Button
                    type="submit"
                    disabled={busy}
                    loading={busy && !scan}
                    className="w-full"
                  >
                    Scan page
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            {result && (
              <Alert variant="success">
                <a
                  href={result.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                >
                  Review draft PR #{result.prNumber}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Alert>
            )}

            {scan ? (
              <PageSection
                title={`${scan.suggestions.length} suggestions`}
                description={scan.provenance}
              >
                <div className="space-y-4">
                  {scan.suggestions.map((s) => (
                    <Card key={s.id}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-base">
                            {s.location}
                          </CardTitle>
                          <Badge
                            variant={
                              s.status === "approved"
                                ? "success"
                                : s.status === "rejected"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {s.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Panel variant="muted" className="p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-bone-600">
                            Before
                          </p>
                          <p className="mt-1 text-sm text-espresso-700">
                            {s.before || "(empty)"}
                          </p>
                        </Panel>
                        <Label>
                          Suggested change
                          <Textarea
                            aria-label={`Edit suggestion: ${s.location}`}
                            disabled={!!result || busy}
                            value={edits[s.id] ?? s.after}
                            onChange={(e) =>
                              setEdits((value) => ({
                                ...value,
                                [s.id]: e.target.value,
                              }))
                            }
                          />
                        </Label>
                        <p className="text-sm text-bone-700">{s.rationale}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={
                              s.status === "approved" ? "success" : "outline"
                            }
                            size="sm"
                            disabled={!!result || busy}
                            aria-pressed={s.status === "approved"}
                            onClick={() => setStatus(s.id, "approved")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant={
                              s.status === "rejected" ? "danger" : "outline"
                            }
                            size="sm"
                            disabled={!!result || busy}
                            aria-pressed={s.status === "rejected"}
                            onClick={() => setStatus(s.id, "rejected")}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="secondary"
                    disabled={busy || !!result || approvedCount === 0}
                    loading={busy && !!scan}
                    onClick={() => void submit(true)}
                    className="w-full sm:w-auto"
                  >
                    Open combined draft PR
                    {approvedCount > 0 && ` (${approvedCount} approved)`}
                  </Button>
                </div>
              </PageSection>
            ) : (
              !error && (
                <EmptyState
                  title="No scan results yet"
                  description="Configure your scan settings and run a page analysis to see suggestions."
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
