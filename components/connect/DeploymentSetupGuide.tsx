"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  DEPLOYMENT_SETUP_STEPS,
  SETUP_SNIPPETS,
  normalizeSetupSiteUrl,
  verifyHeaderCommand,
  type SetupFramework,
} from "@/lib/connect/deployment-setup";
import { useProject } from "@/components/ProjectAccess";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface RevisionMarkerResponse {
  siteUrl: string;
  httpStatus: number;
  headerPresent: boolean;
  headerValue: string | null;
  repoHeadSha: string | null;
  matchesRepoHead: boolean | null;
  verified: boolean;
  message: string;
}

interface DeploymentSetupGuideProps {
  siteUrl?: string;
  projectId?: string;
  compact?: boolean;
  className?: string;
}

export function DeploymentSetupGuide({
  siteUrl: siteUrlProp,
  projectId: projectIdProp,
  compact = false,
  className,
}: DeploymentSetupGuideProps) {
  const { project } = useProject();
  const [framework, setFramework] = useState<SetupFramework>("nextjs");
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [result, setResult] = useState<RevisionMarkerResponse | null>(null);

  const effectiveSiteUrl =
    normalizeSetupSiteUrl(siteUrlProp ?? "") ??
    normalizeSetupSiteUrl(project?.siteUrl ?? "") ??
    null;
  const effectiveProjectId = projectIdProp ?? project?.id;

  const snippet =
    SETUP_SNIPPETS.find((s) => s.id === framework) ?? SETUP_SNIPPETS[0];
  const verifyCmd = verifyHeaderCommand(effectiveSiteUrl ?? "", "powershell");

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("failed");
    }
  }

  async function verifyNow() {
    setChecking(true);
    setCheckError("");
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (effectiveProjectId) params.set("projectId", effectiveProjectId);
      else if (effectiveSiteUrl) params.set("siteUrl", effectiveSiteUrl);
      else {
        throw new Error(
          "Enter a deployed site URL above or connect a project first.",
        );
      }

      const res = await fetch(`/api/revision-marker?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      setResult(data as RevisionMarkerResponse);
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-paper-200 bg-paper-50 text-steel-400">
            <BookOpen className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <CardTitle>Deployment setup (any repository)</CardTitle>
            <p className="mt-1 text-sm text-espresso-700">
              SearchOps verifies what is live at your site URL against the Git
              revision being analyzed. Copy a snippet into your deployed
              repository, redeploy, then verify the header here.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!compact && (
          <ol className="space-y-4">
            {DEPLOYMENT_SETUP_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-paper-200 bg-paper-50 font-mono text-xs font-bold text-ember-600">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-espresso-900">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-espresso-700">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="space-y-3">
          <p className="mono-label">Revision marker snippet</p>
          <div className="flex flex-wrap gap-2">
            {SETUP_SNIPPETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFramework(item.id)}
                className={clsx(
                  "rounded-sm border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors",
                  framework === item.id
                    ? "border-ember-600/30 bg-ember-soft text-ember-600"
                    : "border-paper-200 bg-surface text-bone-700 hover:bg-paper-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-espresso-700">{snippet.description}</p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md border border-paper-200 bg-darkSurface-code p-4 pr-28 font-mono text-xs leading-relaxed text-bone-300">
              {snippet.code}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute right-3 top-3"
              onClick={() => void copy(snippet.code, "snippet")}
            >
              {copied === "snippet" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-paper-200 bg-paper-50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-espresso-900">
                Verify after deploy
              </p>
              <p className="mt-0.5 text-xs text-bone-700">
                {effectiveSiteUrl
                  ? `Checking ${effectiveSiteUrl}`
                  : "Enter a site URL or connect a project to verify."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={checking || (!effectiveSiteUrl && !effectiveProjectId)}
              loading={checking}
              onClick={() => void verifyNow()}
            >
              {!checking && <RefreshCw className="h-3.5 w-3.5" />}
              Verify now
            </Button>
          </div>

          {checkError && (
            <Alert variant="error">{checkError}</Alert>
          )}

          {result && (
            <Alert variant={result.verified ? "success" : "warning"}>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  {result.verified ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p>{result.message}</p>
                </div>
                <dl className="grid gap-1 font-mono text-xs text-espresso-700">
                  <div>
                    HTTP {result.httpStatus} ·{" "}
                    {result.headerPresent ? "header present" : "header missing"}
                  </div>
                  {result.headerValue && (
                    <div>
                      X-SearchOps-Sha:{" "}
                      <span className="text-espresso-900">{result.headerValue}</span>
                    </div>
                  )}
                  {result.repoHeadSha && (
                    <div>
                      Repo HEAD:{" "}
                      <span className="text-espresso-900">{result.repoHeadSha}</span>
                      {result.matchesRepoHead === true && " · match"}
                      {result.matchesRepoHead === false && " · mismatch"}
                    </div>
                  )}
                </dl>
              </div>
            </Alert>
          )}

          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-espresso-700">
              Manual verify command (PowerShell)
            </summary>
            <pre className="mt-2 overflow-x-auto font-mono text-xs text-espresso-700">
              {verifyCmd}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => void copy(verifyCmd, "verify")}
            >
              {copied === "verify" ? "Copied command" : "Copy command"}
            </Button>
          </details>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-espresso-700">
          <a
            href="https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-ember-600 hover:underline"
          >
            GitHub token permissions
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <span className="text-paper-200">·</span>
          <span>Contents + Pull requests: Read and write</span>
        </div>
      </CardContent>
    </Card>
  );
}
