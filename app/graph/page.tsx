"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FieldManualNav,
  FieldManualSidebar,
} from "@/components/layout/FieldManualNav";
import {
  Network,
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import { useProject } from "../../components/ProjectAccess";
import { GraphCanvas } from "../../components/ui/GraphCanvas";
import { GraphSnapshotData } from "../../lib/graph/types";

export default function CrawlerGraphPage() {
  const { project } = useProject();
  const [snapshot, setSnapshot] = useState<GraphSnapshotData | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null);
    setLoadError("");
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
        });
    return () => controller.abort();
  }, [project]);
  const [selectedNode, setSelectedNode] = useState<string | null>(
    "node-product",
  );
  const [filterType, setFilterType] = useState<"ALL" | "PAGES" | "ERRORS">(
    "ALL",
  );

  const streamLogs = [
    {
      time: "23:14:02.104",
      method: "GET",
      url: "/products/digital-micrometer-caliper",
      status: 200,
      latency: "24ms",
      canonical: "MISSING",
      alert: true,
    },
    {
      time: "23:14:01.890",
      method: "GET",
      url: "/products/dial-indicator-001",
      status: 200,
      latency: "18ms",
      canonical: "MISSING",
      alert: true,
    },
    {
      time: "23:14:00.450",
      method: "GET",
      url: "/categories/precision-measuring",
      status: 200,
      latency: "31ms",
      canonical: "OK",
      alert: false,
    },
    {
      time: "23:13:58.210",
      method: "GET",
      url: "/robots.txt",
      status: 200,
      latency: "8ms",
      canonical: "N/A",
      alert: false,
    },
    {
      time: "23:13:55.770",
      method: "GET",
      url: "/sitemap.xml",
      status: 200,
      latency: "42ms",
      canonical: "OK",
      alert: false,
    },
    {
      time: "23:13:52.120",
      method: "GET",
      url: "/products/depth-gauge-pro",
      status: 404,
      latency: "12ms",
      canonical: "ERROR",
      alert: true,
    },
  ];

  if (!project)
    return (
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl">Discoverability graph</h1>
        <p>Connect a project and complete an analysis to view its graph.</p>
      </main>
    );
  if (project)
    return (
      <main className="p-8 space-y-4">
        <h1 className="text-3xl">Discoverability graph · {project.repo}</h1>
        <p role="status">
          {loadError ||
            (snapshot
              ? `Snapshot ${snapshot.deploymentId} · ${snapshot.complete ? "Complete" : "Partial"}`
              : "Loading graph…")}
        </p>
        {snapshot && (
          <GraphCanvas nodes={snapshot.nodes} edges={snapshot.edges} />
        )}
      </main>
    );
  return (
    <div className="min-h-screen bg-bone-100 text-ink-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <FieldManualNav currentDeployNumber={184} />

      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <FieldManualSidebar />

        {/* Main Content Area: Graph Canvas + Stats/Log Sidebar */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-[1300px]">
          {/* Breadcrumb & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bone-300 pb-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-mono text-sm text-bone-700">
                <Link
                  href="/"
                  className="hover:text-ink-900 flex items-center gap-1.5 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>DASHBOARD</span>
                </Link>
                <span>/</span>
                <span className="text-patina-600 font-bold uppercase tracking-wider">
                  {"// SCREEN_04"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <h1 className="font-mono font-black text-2xl sm:text-3xl md:text-4xl text-ink-900 tracking-tight">
                  CRAWLER PATH & DISCOVERY TOPOLOGY
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <div className="flex items-center gap-1 bg-bone-300/40 p-1 rounded-sm border border-bone-300">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={clsx(
                    "px-3 py-1.5 min-h-[36px] rounded-sm uppercase font-bold text-xs sm:text-sm transition-all",
                    filterType === "ALL"
                      ? "bg-ink-900 text-bone-100 shadow-sm"
                      : "text-bone-700 hover:text-ink-900",
                  )}
                >
                  ALL
                </button>
                <button
                  onClick={() => setFilterType("PAGES")}
                  className={clsx(
                    "px-3 py-1.5 min-h-[36px] rounded-sm uppercase font-bold text-xs sm:text-sm transition-all",
                    filterType === "PAGES"
                      ? "bg-ink-900 text-bone-100 shadow-sm"
                      : "text-bone-700 hover:text-ink-900",
                  )}
                >
                  PAGES
                </button>
                <button
                  onClick={() => setFilterType("ERRORS")}
                  className={clsx(
                    "px-3 py-1.5 min-h-[36px] rounded-sm uppercase font-bold text-xs sm:text-sm transition-all",
                    filterType === "ERRORS"
                      ? "bg-ember-600 text-bone-100 shadow-sm"
                      : "text-bone-700 hover:text-ink-900",
                  )}
                >
                  IMPACTED
                </button>
              </div>
            </div>
          </div>

          {/* ── 8 COLS / 4 COLS SPLIT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── LEFT: SVG DISCOVERY MAP CANVAS (8 COLS) ── */}
            <div className="lg:col-span-8 bg-bone-100 border border-bone-300 rounded-sm p-4 sm:p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-bone-300 pb-3">
                <div className="flex items-center gap-2.5">
                  <Network className="w-5 h-5 text-steel-400" />
                  <span className="font-mono text-sm font-bold text-ink-900 uppercase tracking-wider">
                    DISCOVERY MAP & LINK FLOW TOPOLOGY
                  </span>
                </div>
                <span className="font-mono text-xs text-bone-700 font-bold uppercase tracking-wider">
                  ANIMATED CRAWLER VECTOR ENGINE
                </span>
              </div>

              {/* Interactive SVG Canvas */}
              <div className="w-full bg-bone-300/30 border border-bone-300 rounded-sm p-4 h-[440px] relative overflow-hidden flex items-center justify-center">
                {/* Subtle grid */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(#6E6353 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                <svg className="w-full h-full" viewBox="0 0 600 380">
                  {/* Animated Flow Lines */}
                  {/* Root -> Cat */}
                  <line
                    x1="120"
                    y1="190"
                    x2="280"
                    y2="100"
                    stroke="#4FA695"
                    strokeWidth="2"
                    className="line-active"
                  />
                  {/* Root -> Prod Hub */}
                  <line
                    x1="120"
                    y1="190"
                    x2="280"
                    y2="190"
                    stroke="#C23F10"
                    strokeWidth="2.5"
                    className="line-active"
                  />
                  {/* Root -> Sitemap */}
                  <line
                    x1="120"
                    y1="190"
                    x2="280"
                    y2="280"
                    stroke="#4FA695"
                    strokeWidth="1.5"
                    className="line-active"
                  />
                  {/* Prod Hub -> Caliper Product */}
                  <line
                    x1="280"
                    y1="190"
                    x2="460"
                    y2="140"
                    stroke="#C23F10"
                    strokeWidth="2"
                    className="line-active"
                  />
                  {/* Prod Hub -> Depth Gauge 404 */}
                  <line
                    x1="280"
                    y1="190"
                    x2="460"
                    y2="240"
                    stroke="#C23F10"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                  />

                  {/* Nodes */}
                  {/* 1. Root Node (Pulsing node-active) */}
                  <g
                    className="node-active cursor-pointer"
                    transform="translate(120, 190)"
                  >
                    <circle
                      r="24"
                      fill="#100E0C"
                      stroke="#4FA695"
                      strokeWidth="3"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#F4EDE1"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      ROOT
                    </text>
                  </g>
                  <text
                    x="120"
                    y="230"
                    textAnchor="middle"
                    fill="#100E0C"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    / (Homepage)
                  </text>

                  {/* 2. Category Hub Node */}
                  <g
                    className="cursor-pointer"
                    transform="translate(280, 100)"
                    onClick={() => setSelectedNode("node-cat")}
                  >
                    <circle
                      r="20"
                      fill="#4FA695"
                      stroke="#100E0C"
                      strokeWidth="2"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#F4EDE1"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      CAT
                    </text>
                  </g>
                  <text
                    x="280"
                    y="136"
                    textAnchor="middle"
                    fill="#100E0C"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    /categories/*
                  </text>

                  {/* 3. Product Template Emitter Node (Root Cause Emitter) */}
                  <g
                    className="cursor-pointer"
                    transform="translate(280, 190)"
                    onClick={() => setSelectedNode("node-emitter")}
                  >
                    <rect
                      x="-28"
                      y="-20"
                      width="56"
                      height="40"
                      fill="#C23F10"
                      stroke="#100E0C"
                      strokeWidth="2"
                      rx="3"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#F4EDE1"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      EMITTER
                    </text>
                  </g>
                  <text
                    x="280"
                    y="226"
                    textAnchor="middle"
                    fill="#C23F10"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    ProductPage.tsx:184
                  </text>

                  {/* 4. Sitemap Node */}
                  <g className="cursor-pointer" transform="translate(280, 280)">
                    <circle
                      r="18"
                      fill="#D6CBB8"
                      stroke="#6E6353"
                      strokeWidth="2"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#100E0C"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      XML
                    </text>
                  </g>
                  <text
                    x="280"
                    y="314"
                    textAnchor="middle"
                    fill="#6E6353"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    /sitemap.xml
                  </text>

                  {/* 5. Caliper Target Node */}
                  <g
                    className="cursor-pointer"
                    transform="translate(460, 140)"
                    onClick={() => setSelectedNode("node-product")}
                  >
                    <circle
                      r="22"
                      fill="#2A150C"
                      stroke="#C23F10"
                      strokeWidth="2.5"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#F26A2E"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      PROD
                    </text>
                  </g>
                  <text
                    x="460"
                    y="178"
                    textAnchor="middle"
                    fill="#C23F10"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    /products/caliper (MISSING CANONICAL)
                  </text>

                  {/* 6. Broken 404 Node */}
                  <g className="cursor-pointer" transform="translate(460, 240)">
                    <circle
                      r="18"
                      fill="#C23F10"
                      stroke="#100E0C"
                      strokeWidth="2"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#F4EDE1"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      404
                    </text>
                  </g>
                  <text
                    x="460"
                    y="274"
                    textAnchor="middle"
                    fill="#C23F10"
                    fontSize="12"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                  >
                    /products/depth-gauge (404)
                  </text>
                </svg>
              </div>

              {/* Legend & Stats Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-sm border-t border-bone-300 pt-3">
                <div className="flex items-center gap-4 text-xs font-bold flex-wrap">
                  <span className="flex items-center gap-1.5 text-patina-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-patina-400 inline-block" />
                    CRAWLED 200 OK
                  </span>
                  <span className="flex items-center gap-1.5 text-ember-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-ember-600 inline-block" />
                    REGRESSED / CANONICAL STRIPPED
                  </span>
                  <span className="flex items-center gap-1.5 text-bone-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-bone-300 inline-block" />
                    PENDING
                  </span>
                </div>

                <div className="text-bone-700 text-xs sm:text-sm">
                  TOTAL DISCOVERED:{" "}
                  <strong className="text-ink-900 font-bold">142 URLS</strong>
                </div>
              </div>
            </div>

            {/* ── RIGHT: PATH STATS & LIVE STREAM LOG (4 COLS) ── */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Path Statistics Bento Card */}
              <div className="bg-bone-100 border border-bone-300 rounded-sm p-4 sm:p-5 flex flex-col gap-3.5 font-mono">
                <div className="flex items-center justify-between border-b border-bone-300 pb-2.5">
                  <span className="text-sm font-bold text-ink-900 uppercase">
                    PATHWAY TELEMETRY
                  </span>
                  <Activity className="w-4 h-4 text-steel-400" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-bone-300/40 p-2.5 rounded-sm border border-bone-300">
                    <span className="text-xs text-bone-700 block font-medium">
                      DEPTH LEVEL
                    </span>
                    <strong className="text-ink-900 text-base sm:text-lg font-black">
                      3 HOPS
                    </strong>
                  </div>
                  <div className="bg-bone-300/40 p-2.5 rounded-sm border border-bone-300">
                    <span className="text-xs text-bone-700 block font-medium">
                      HTTP 200 RATE
                    </span>
                    <strong className="text-patina-600 text-base sm:text-lg font-black">
                      98.6%
                    </strong>
                  </div>
                  <div className="bg-bone-300/40 p-2.5 rounded-sm border border-bone-300">
                    <span className="text-xs text-bone-700 block font-medium">
                      ORPHAN NODES
                    </span>
                    <strong className="text-ember-600 text-base sm:text-lg font-black">
                      0
                    </strong>
                  </div>
                  <div className="bg-bone-300/40 p-2.5 rounded-sm border border-bone-300">
                    <span className="text-xs text-bone-700 block font-medium">
                      AVG LATENCY
                    </span>
                    <strong className="text-ink-900 text-base sm:text-lg font-black">
                      22ms
                    </strong>
                  </div>
                </div>
              </div>

              {/* Live Crawler Stream Log */}
              <div className="bg-bone-100 border border-bone-300 rounded-sm p-4 sm:p-5 flex flex-col justify-between gap-3 font-mono flex-1">
                <div className="flex items-center justify-between border-b border-bone-300 pb-2.5">
                  <span className="text-sm font-bold text-ink-900 uppercase">
                    LIVE CRAWL STREAM
                  </span>
                  <span className="text-xs text-patina-600 bg-patina-400/20 px-2 py-0.5 rounded-sm font-bold animate-pulse">
                    LIVE
                  </span>
                </div>

                {/* Log List */}
                <div className="flex flex-col gap-2.5 max-h-[310px] overflow-y-auto pr-1">
                  {streamLogs.map((log, index) => (
                    <div
                      key={index}
                      className={clsx(
                        "p-2.5 rounded-sm border text-xs sm:text-sm flex flex-col gap-1.5 transition-all",
                        log.alert
                          ? "bg-ember-600/10 border-ember-600/30 text-ink-900"
                          : "bg-bone-300/30 border-bone-300 text-bone-700",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-bone-700 font-bold text-xs">
                          {log.time}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-sm font-bold text-xs",
                              log.status === 200
                                ? "bg-patina-400/20 text-patina-600"
                                : "bg-ember-600 text-bone-100",
                            )}
                          >
                            {log.status} {log.status === 200 ? "OK" : "404"}
                          </span>
                          <span className="text-xs text-bone-700 font-semibold">
                            {log.latency}
                          </span>
                        </div>
                      </div>
                      <div className="truncate font-semibold text-ink-900 text-xs sm:text-sm">
                        {log.url}
                      </div>
                      {log.alert && (
                        <div className="text-xs text-ember-600 font-bold uppercase">
                          ⚠ CANONICAL TAG MISSING FROM TEMPLATE
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
