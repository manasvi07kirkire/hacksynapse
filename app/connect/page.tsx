"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Plug, Shield } from "lucide-react";
import { useProject } from "../../components/ProjectAccess";
import {
  connectErrorMessage,
  normalizeRepoInput,
  parseRouteManifest,
  parseSourceMapInput,
} from "../../lib/connect/normalize-project-input";
import { Alert } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import {
  FieldGroup,
  Input,
  Label,
  Textarea,
} from "../../components/ui/FormControls";
import { DeploymentSetupGuide } from "../../components/connect/DeploymentSetupGuide";
import { PageHeader } from "../../components/ui/PageLayout";

export default function Connect() {
  const { refresh } = useProject();
  const [key, setKey] = useState("");
  const [repo, setRepo] = useState("");
  const [siteUrl, setUrl] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [installId, setInstall] = useState("");
  const [routes, setRoutes] = useState("/");
  const [sourceMap, setMap] = useState('{"/":"index.html"}');
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState<"login" | "connect" | null>(null);

  async function submit(kind: "login" | "connect") {
    setLoading(kind);
    setMessage("");
    try {
      let body: Record<string, unknown> = {};
      if (kind === "connect") {
        const normalizedRepo = normalizeRepoInput(repo);
        if (!/^[^/]+\/[^/]+$/.test(normalizedRepo)) {
          throw new Error(
            'Repository must be owner/repo, for example acme-corp/web-app (not a full GitHub URL).',
          );
        }
        body = {
          repo: normalizedRepo,
          siteUrl: siteUrl.trim(),
          defaultBranch: defaultBranch.trim() || "main",
          ...(installId.trim() ? { installId: installId.trim() } : {}),
          routeManifest: parseRouteManifest(routes),
          sourceMap: parseSourceMapInput(sourceMap),
        };
      }

      const res = await fetch(
        kind === "login" ? "/api/session" : "/api/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(kind === "login" ? { "x-searchops-key": key } : {}),
          },
          body: kind === "login" ? "{}" : JSON.stringify(body),
          credentials: "same-origin",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const text = connectErrorMessage(
          typeof data.code === "string" ? data.code : undefined,
          data.requestId
            ? `${data.error} (request ${data.requestId})`
            : data.error || "Request failed.",
        );
        throw new Error(text);
      }
      setKey("");
      setMessageType("success");
      setMessage(
        kind === "login"
          ? "Signed in successfully. Your session lasts eight hours."
          : "Repository connected. Select it from the header to begin analysis.",
      );
      await refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="page-container-narrow animate-fade-in">
      <PageHeader
        eyebrow="Account & setup"
        title="Connect SearchOps"
        description="Sign in with your operator key, then connect a GitHub repository and deployed site URL to start monitoring discoverability."
      />

      <div className="mt-8 space-y-6">
        {message && (
          <Alert variant={messageType === "error" ? "error" : "success"}>
            {message}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-ember-600/30 bg-ember-soft text-ember-600">
                <KeyRound className="h-5 w-5 stroke-[1.5]" />
              </div>
              <div>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Paste your operator key from the server environment. Sessions
                  expire after eight hours.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit("login");
              }}
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <Label className="flex-1" required>
                Operator key
                <Input
                  aria-label="Operator key"
                  type="password"
                  autoComplete="off"
                  placeholder="Paste SEARCHOPS_API_KEY"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </Label>
              <Button
                type="submit"
                loading={loading === "login"}
                disabled={!key.trim()}
                className="sm:w-auto w-full"
              >
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-patina-500/30 bg-patina-soft text-patina-600">
                <Plug className="h-5 w-5 stroke-[1.5]" />
              </div>
              <div>
                <CardTitle>Connect a repository</CardTitle>
                <CardDescription>
                  Link a GitHub repo to its live deployment. SearchOps crawls
                  the site and tracks regressions across deploys.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit("connect");
              }}
            >
              <FieldGroup>
                <Label required hint="Format: owner/repository (not the full GitHub URL)">
                  Repository
                  <Input
                    placeholder="acme-corp/my-website"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    onBlur={() => setRepo(normalizeRepoInput(repo))}
                  />
                </Label>
                <Label required hint="The publicly reachable deployment URL">
                  Deployed site URL
                  <Input
                    type="url"
                    placeholder="https://www.example.com"
                    value={siteUrl}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Label>
                <Label required hint="Usually main or master — must match your Git default branch">
                  Default branch
                  <Input
                    placeholder="main"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                  />
                </Label>
                <Label required hint="Required on production — from github.com/settings/installations/…">
                  GitHub installation ID
                  <Input
                    placeholder="Only for GitHub App installs"
                    value={installId}
                    onChange={(e) => setInstall(e.target.value)}
                  />
                </Label>
                <Label hint="Comma-separated paths to crawl">
                  Route manifest
                  <Input
                    placeholder="/, /about, /faq"
                    value={routes}
                    onChange={(e) => setRoutes(e.target.value)}
                  />
                </Label>
                <Label hint="JSON map of route to source file">
                  Page-to-source mapping
                  <Textarea
                    value={sourceMap}
                    onChange={(e) => setMap(e.target.value)}
                    className="font-mono text-xs min-h-[80px]"
                    spellCheck={false}
                  />
                </Label>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={loading === "connect"}
                  disabled={!repo.trim() || !siteUrl.trim()}
                  className="w-full sm:w-auto"
                >
                  Verify and connect
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <DeploymentSetupGuide siteUrl={siteUrl || undefined} />

        <div className="flex items-start gap-3 rounded-md border border-paper-200 bg-paper-50 px-4 py-3 text-sm text-espresso-700">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.5] text-steel-400" />
          <p>
            SearchOps opens draft pull requests for review — it never merges
            changes automatically. After connecting, go to{" "}
            <Link href="/watch" className="font-medium text-ember-600 hover:underline">
              Watch
            </Link>{" "}
            to run your first analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
