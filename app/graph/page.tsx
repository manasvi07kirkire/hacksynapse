"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Network } from "lucide-react";
import { useProject } from "../../components/ProjectAccess";
import { GraphCanvas } from "../../components/ui/GraphCanvas";
import { GraphSnapshotData } from "../../lib/graph/types";
import { Alert } from "../../components/ui/Badge";
import { ButtonLink } from "../../components/ui/Button";
import { Card, CardContent, EmptyState } from "../../components/ui/Card";
import { PageHeader, StatTile } from "../../components/ui/PageLayout";

export default function CrawlerGraphPage() {
  const { project } = useProject();
  const [snapshot, setSnapshot] = useState<GraphSnapshotData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null);
    setLoadError("");
    setLoading(!!project);
    if (project)
      void fetch(`/api/graph?projectId=${project.id}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error);
          if (!controller.signal.aborted) setSnapshot(body.snapshot);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setLoadError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => controller.abort();
  }, [project]);

  if (!project) {
    return (
      <div className="page-container">
        <EmptyState
          title="No project connected"
          description="Connect a repository and run an analysis to view the discoverability graph."
          action={
            <ButtonLink href="/connect">Connect repository</ButtonLink>
          }
        />
      </div>
    );
  }

  const nodeCount = snapshot?.nodes.length ?? 0;
  const edgeCount = snapshot?.edges.length ?? 0;

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        eyebrow="Crawler topology"
        title={`Discoverability graph · ${project.repo}`}
        description="Link flow and crawl path topology from the latest deployment analysis."
      />

      {loadError && (
        <Alert variant="error" className="mt-6">
          {loadError}
        </Alert>
      )}

      {loading && !snapshot && !loadError && (
        <div className="mt-8 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-bone-600">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-bone-300 border-t-ember-600" />
            <p className="text-sm">Loading graph snapshot…</p>
          </div>
        </div>
      )}

      {snapshot && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Nodes" value={nodeCount} />
            <StatTile label="Edges" value={edgeCount} />
            <StatTile
              label="Snapshot"
              value={snapshot.complete ? "Complete" : "Partial"}
              hint={snapshot.deploymentId.slice(0, 8)}
            />
            <StatTile label="Site" value={new URL(project.siteUrl).hostname} />
          </div>

          <Card className="mt-6 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-paper-200 bg-paper-50 px-5 py-3">
                <Network className="h-4 w-4 stroke-[1.5] text-steel-400" />
                <span className="text-sm font-semibold text-espresso-900">
                  Discovery map
                </span>
              </div>
              <div className="min-h-[480px] p-4 sm:p-6">
                <GraphCanvas nodes={snapshot.nodes} edges={snapshot.edges} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !snapshot && !loadError && (
        <EmptyState
          className="mt-8"
          title="No graph data yet"
          description="Run a deployment analysis from the Watch dashboard to generate a crawl topology snapshot."
          action={<ButtonLink href="/watch">Go to Watch</ButtonLink>}
        />
      )}

      <p className="mt-6 text-center text-xs text-bone-600">
        Need regression context?{" "}
        <Link href="/regression" className="font-medium text-ember-600 hover:underline">
          View regressions
        </Link>
      </p>
    </div>
  );
}
