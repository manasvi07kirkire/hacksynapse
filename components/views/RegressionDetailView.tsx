"use client";

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  FieldManualNav,
  FieldManualSidebar,
} from "@/components/layout/FieldManualNav";
import { Gauge } from "@/components/ui/Gauge";
import { StatusDot } from "@/components/ui/StatusDot";
import { TierBadge } from "@/components/ui/TierBadge";
import {
  AlertTriangle,
  FileCode,
  CheckCircle,
  Wrench,
  ArrowLeft,
  Terminal,
  ShieldAlert,
  GitPullRequest,
  Check,
} from "lucide-react";

export function RegressionDetailView({
  deployId = "184",
}: {
  deployId?: string;
}) {
  const [isFixing, setIsFixing] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const handleGenerateFix = () => {
    setIsFixing(true);
    setTimeout(() => {
      setIsFixing(false);
    }, 800);
  };

  const handleMerge = () => {
    setIsMerging(true);
    setTimeout(() => {
      setIsMerging(false);
      setIsMerged(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C23F10", "#4FA695", "#E7A13A", "#F4EDE1"],
      });
    }, 900);
  };

  return (
    <div className="min-h-screen bg-bone-100 text-ink-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <FieldManualNav currentDeployNumber={184} />

      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <FieldManualSidebar />

        {/* Main Content Area: 12-Column Bento Grid */}
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
                <span className="text-ember-600 font-bold uppercase tracking-wider">
                  {"// SCREEN_02"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <h1 className="font-mono font-black text-2xl sm:text-3xl md:text-4xl text-ink-900 tracking-tight">
                  REGRESSION DETECTED: DEPLOY #{deployId}
                </h1>
                <StatusDot status="REGRESSION" size="md" />
                <TierBadge tier="TIER_A" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-bone-700 bg-bone-200/70 px-3 py-1.5 rounded-sm border border-bone-300">
                AFFECTED:{" "}
                <strong className="text-ink-900 font-black">127 ROUTES</strong>
              </span>
            </div>
          </div>

          {/* ── 12-COLUMN BENTO GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 1. Search Health Gauge Card (4 cols) */}
            <div className="lg:col-span-4 bg-bone-100 border border-bone-300 rounded-sm p-5 sm:p-6 flex flex-col justify-between gap-5">
              <div className="flex items-center justify-between border-b border-bone-300 pb-3">
                <span className="font-mono text-sm font-bold text-ink-900 uppercase tracking-wider">
                  CRAWLER HEALTH INDEX
                </span>
                <span className="font-mono text-xs font-bold text-ember-600 bg-ember-600/10 px-2.5 py-1 rounded-sm border border-ember-600/30">
                  -25 DROP
                </span>
              </div>

              {/* Gauge */}
              <div className="flex items-center justify-center py-2">
                <Gauge
                  value={71}
                  title="Post-Deploy Health"
                  lensLabel="SEARCH LENS"
                  size={220}
                />
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="bg-bone-300/40 p-3.5 rounded-sm border border-bone-300 font-mono text-sm flex items-center justify-between">
                <span className="text-bone-700 font-medium">PREVIOUS:</span>
                <span className="line-through text-bone-700 font-bold">
                  96%
                </span>
                <span className="text-ember-600 font-black">→ 71% (-25)</span>
              </div>
            </div>

            {/* 2. Evidence Log Table (8 cols) with Pulsing Ember Border */}
            <div className="lg:col-span-8 bg-bone-100 border-2 border-ember-600 rounded-sm p-5 sm:p-6 flex flex-col justify-between gap-5 pulse-error-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bone-300 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-ember-600" />
                  <span className="font-mono text-sm font-bold text-ink-900 uppercase tracking-wider">
                    DETERMINISTIC EVIDENCE LOG
                  </span>
                </div>
                <span className="font-mono text-xs text-ember-600 font-bold uppercase bg-ember-600/10 px-2.5 py-1 rounded-sm border border-ember-600/30">
                  CRITICAL · 100% CONFIDENCE
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                  <thead>
                    <tr className="border-b border-bone-300 text-bone-700 text-xs font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">METRIC</th>
                      <th className="py-2.5 px-3">EXPECTED</th>
                      <th className="py-2.5 px-3">OBSERVED (#184)</th>
                      <th className="py-2.5 px-3">SEVERITY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bone-300/60 text-ink-900">
                    <tr>
                      <td className="py-3 px-3 font-bold">Canonical Tag</td>
                      <td className="py-3 px-3 text-patina-600">
                        Present (https://...)
                      </td>
                      <td className="py-3 px-3 text-ember-600 font-bold">
                        MISSING (null)
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-ember-600 font-bold uppercase text-xs px-2 py-0.5 rounded-sm bg-ember-600/10 border border-ember-600/30">
                          CRITICAL
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold">Robots Meta</td>
                      <td className="py-3 px-3 text-patina-600">
                        index, follow
                      </td>
                      <td className="py-3 px-3 text-ink-900">index, follow</td>
                      <td className="py-3 px-3">
                        <span className="text-patina-600 font-bold uppercase text-xs px-2 py-0.5 rounded-sm bg-patina-400/15 border border-patina-400/30">
                          PASS
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold">JSON-LD Schema</td>
                      <td className="py-3 px-3 text-patina-600">
                        Product + Offers
                      </td>
                      <td className="py-3 px-3 text-marigold-600 font-bold">
                        Missing Price Entity
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-marigold-400 font-bold uppercase text-xs px-2 py-0.5 rounded-sm bg-marigold-400/15 border border-marigold-400/30">
                          HIGH
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold">Affected Scope</td>
                      <td className="py-3 px-3 text-bone-700">0 routes</td>
                      <td className="py-3 px-3 text-ember-600 font-bold">
                        127 /products/* routes
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-ember-600 font-bold uppercase text-xs px-2 py-0.5 rounded-sm bg-ember-600/10 border border-ember-600/30">
                          CRITICAL
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attribution Narration */}
              <div className="bg-bone-300/40 p-4 rounded-sm border border-bone-300 text-sm font-sans leading-relaxed text-ink-900">
                <span className="font-bold text-ember-600 font-mono">
                  AST ROOT CAUSE VERDICT:
                </span>{" "}
                Commit{" "}
                <code className="bg-bone-100 px-1.5 py-0.5 rounded-sm border border-bone-300 font-mono font-bold text-xs">
                  8f4a2b9
                </code>{" "}
                refactored metadata generation in{" "}
                <code className="bg-bone-100 px-1.5 py-0.5 rounded-sm border border-bone-300 font-mono font-bold text-xs">
                  src/app/products/[slug]/page.tsx:184
                </code>
                , accidentally omitting the{" "}
                <code className="text-ember-600 font-mono font-bold">
                  alternates.canonical
                </code>{" "}
                declaration.
              </div>
            </div>

            {/* 3. Full-Width Dark Root Cause Panel (12 cols) */}
            <div className="lg:col-span-12 bg-darkSurface-panel border border-ink-700 rounded-sm p-5 sm:p-6 flex flex-col gap-5 text-bone-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-4">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-ember-400" />
                  <span className="font-mono text-sm sm:text-base font-bold text-bone-100 uppercase tracking-wider">
                    AST ROOT CAUSE & AUTONOMOUS TIER-A REMEDIATION
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-bone-500">Target File:</span>
                  <code className="text-bone-100 bg-ink-900 px-2.5 py-1 rounded-sm border border-ink-700 font-bold text-xs sm:text-sm">
                    src/app/products/[slug]/page.tsx:184
                  </code>
                </div>
              </div>

              {/* Code Diff Block */}
              <div className="bg-darkSurface-code border border-ink-700 rounded-sm p-4 font-mono text-xs sm:text-sm overflow-x-auto">
                <pre className="text-bone-300 leading-relaxed">
                  <div className="text-bone-500 font-bold">
                    --- a/src/app/products/[slug]/page.tsx (Commit: 8f4a2b9)
                  </div>
                  <div className="text-bone-500 font-bold">
                    +++ b/src/app/products/[slug]/page.tsx (SearchOps Tier-A
                    Patch)
                  </div>
                  <div className="text-bone-700">
                    @@ -180,6 +180,10 @@ export async function
                    generateMetadata(&#123; params &#125;: Props):
                    Promise&lt;Metadata&gt; &#123;
                  </div>
                  <div className="text-bone-300"> return &#123;</div>
                  <div className="text-bone-300"> title: product.name,</div>
                  <div className="text-bone-300">
                    {" "}
                    description: product.summary,
                  </div>
                  <div className="bg-ember-tint text-ember-400 font-semibold px-1 py-0.5 rounded-sm">
                    - // canonical omitted in refactor
                  </div>
                  <div className="bg-patina-tint text-patina-400 font-semibold px-1 py-0.5 rounded-sm">
                    + alternates: &#123;
                  </div>
                  <div className="bg-patina-tint text-patina-400 font-semibold px-1 py-0.5 rounded-sm">
                    + canonical:
                    `https://store.acme-industrial.com/products/$&#123;params.slug&#125;`,
                  </div>
                  <div className="bg-patina-tint text-patina-400 font-semibold px-1 py-0.5 rounded-sm">
                    + &#125;,
                  </div>
                  <div className="text-bone-300"> &#125;;</div>
                  <div className="text-bone-300"> &#125;</div>
                </pre>
              </div>

              {/* Automated Gates & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-ink-700">
                <div className="flex items-center gap-4 font-mono text-xs sm:text-sm flex-wrap">
                  <span className="flex items-center gap-1.5 text-patina-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> 1. AST Validated
                  </span>
                  <span className="flex items-center gap-1.5 text-patina-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> 2. Rules 0 Violation
                  </span>
                  <span className="flex items-center gap-1.5 text-patina-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> 3. Clean Build
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {!isMerged ? (
                    <button
                      onClick={handleMerge}
                      disabled={isMerging}
                      className="flex items-center gap-2.5 px-6 py-3 min-h-[44px] bg-ember-600 hover:bg-ember-500 text-bone-100 rounded-sm font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-cta disabled:opacity-50"
                    >
                      <GitPullRequest className="w-4 h-4 text-bone-100" />
                      <span>
                        {isMerging
                          ? "APPLYING PATCH..."
                          : "MERGE AUTO-FIX PR (#185)"}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 font-mono text-sm font-bold text-patina-400 bg-patina-tint px-5 py-2.5 rounded-sm border border-patina-400/40">
                      <Check className="w-4 h-4" />
                      <span>PR #185 MERGED & DEPLOYED (REMEDIATED)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
