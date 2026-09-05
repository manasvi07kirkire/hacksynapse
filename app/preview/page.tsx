"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  FieldManualNav,
  FieldManualSidebar,
} from "@/components/layout/FieldManualNav";
import {
  DeploymentStrip,
  DeploymentSummary,
} from "@/components/ui/DeploymentStrip";
import { Gauge } from "@/components/ui/Gauge";
import { FindingCard } from "@/components/ui/FindingCard";
import { CitationMeter } from "@/components/ui/CitationMeter";
import { PRCard } from "@/components/ui/PRCard";
import {
  DEMO_SCENARIO_183,
  DEMO_SCENARIO_184,
  DEMO_SCENARIO_185,
} from "@/lib/fixtures/demo-data";
import { FindingData } from "@/lib/detect/types";
import { GeneratedPatch } from "@/lib/remediate/patch-generator";
import { useProject } from "@/components/ProjectAccess";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Cpu,
  Zap,
  CheckCircle,
  FileCode,
} from "lucide-react";

export default function DashboardPage() {
  const { project } = useProject();
  const [activeDeployNumber, setActiveDeployNumber] = useState<number>(184);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [generatedPatch, setGeneratedPatch] = useState<GeneratedPatch | null>(
    null,
  );

  // Dynamic scenario data
  const currentScenario =
    activeDeployNumber === 183
      ? DEMO_SCENARIO_183
      : activeDeployNumber === 185
        ? DEMO_SCENARIO_185
        : DEMO_SCENARIO_184;

  const deploymentsList: DeploymentSummary[] = [
    {
      id: "deploy_183",
      deployNumber: 183,
      sha: DEMO_SCENARIO_183.sha,
      ref: DEMO_SCENARIO_183.ref,
      commitMsg: DEMO_SCENARIO_183.commitMsg,
      author: DEMO_SCENARIO_183.author,
      status: DEMO_SCENARIO_183.status,
      searchHealth: DEMO_SCENARIO_183.scores.searchHealth,
      geoScore: DEMO_SCENARIO_183.scores.geoScore,
      deltaSearch: DEMO_SCENARIO_183.scores.deltaSearch,
      createdAt: DEMO_SCENARIO_183.createdAt,
    },
    {
      id: "deploy_184",
      deployNumber: 184,
      sha: DEMO_SCENARIO_184.sha,
      ref: DEMO_SCENARIO_184.ref,
      commitMsg: DEMO_SCENARIO_184.commitMsg,
      author: DEMO_SCENARIO_184.author,
      status: DEMO_SCENARIO_184.status,
      searchHealth: DEMO_SCENARIO_184.scores.searchHealth,
      geoScore: DEMO_SCENARIO_184.scores.geoScore,
      deltaSearch: DEMO_SCENARIO_184.scores.deltaSearch,
      createdAt: DEMO_SCENARIO_184.createdAt,
    },
    {
      id: "deploy_185",
      deployNumber: 185,
      sha: DEMO_SCENARIO_185.sha,
      ref: DEMO_SCENARIO_185.ref,
      commitMsg: DEMO_SCENARIO_185.commitMsg,
      author: DEMO_SCENARIO_185.author,
      status: DEMO_SCENARIO_185.status,
      searchHealth: DEMO_SCENARIO_185.scores.searchHealth,
      geoScore: DEMO_SCENARIO_185.scores.geoScore,
      deltaSearch: DEMO_SCENARIO_185.scores.deltaSearch,
      createdAt: DEMO_SCENARIO_185.createdAt,
    },
  ];

  // Handle generating patch
  const handleGenerateFix = async (finding: FindingData) => {
    setIsFixing(true);
    try {
      const res = await fetch("/api/generate-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project?.id, findingId: finding.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Fix generation failed.");
        return;
      }
      setGeneratedPatch(data);
    } catch (err) {
      console.error("Fix generation error:", err);
    } finally {
      setIsFixing(false);
    }
  };

  // Handle merging fix
  const handleMergeFix = () => {
    setIsMerging(true);
    setTimeout(() => {
      setIsMerging(false);
      setActiveDeployNumber(185);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C23F10", "#4FA695", "#E7A13A", "#F4EDE1"],
      });
    }, 1000);
  };

  // Simulate poisoned deploy
  const handleSimulatePoisonedDeploy = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setActiveDeployNumber(184);
      setGeneratedPatch(null);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-bone-100 text-ink-900 flex flex-col font-sans relative">
      {/* Field Manual Top Navigation */}
      <FieldManualNav
        currentDeployNumber={activeDeployNumber}
        onSelectDeploy={(num) => {
          setActiveDeployNumber(num);
          if (num === 185) setGeneratedPatch(null);
        }}
        onTriggerPoisonedDeploy={handleSimulatePoisonedDeploy}
        isTriggering={isSimulating}
      />

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <FieldManualSidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-[1300px]">
          {/* Page Title & Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-bone-300 pb-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-ember-600 uppercase tracking-widest bg-ember-600/10 px-2 py-0.5 rounded-sm border border-ember-600/20">
                  SCREEN_01
                </span>
                <span className="font-sans text-sm text-bone-700">
                  Deploy{" "}
                  <strong className="text-ink-900 font-mono">
                    #{activeDeployNumber}
                  </strong>{" "}
                  · {currentScenario.status}
                </span>
              </div>
              <h1 className="font-mono font-black text-3xl sm:text-4xl md:text-5xl text-ink-900 tracking-tight leading-none">
                SEARCHOPS FIELD MANUAL
              </h1>
              <p className="font-sans text-sm text-bone-700">
                Dual-lens discoverability CI/CD — Search Crawlers &amp; AI
                Answer Engines
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/regression/184"
                className="flex items-center gap-1.5 px-4 py-2 bg-ember-600/10 hover:bg-ember-600/20 border border-ember-600/30 rounded-sm font-sans text-sm font-semibold text-ember-600 transition-all"
              >
                <span>Regression View</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/remediation"
                className="flex items-center gap-1.5 px-4 py-2 bg-patina-400/10 hover:bg-patina-400/20 border border-patina-400/30 rounded-sm font-sans text-sm font-semibold text-patina-600 transition-all"
              >
                <span>Remediation Gate</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/geo"
                className="flex items-center gap-1.5 px-4 py-2 bg-bone-300/40 hover:bg-bone-300 border border-bone-300 rounded-sm font-sans text-sm font-semibold text-ink-900 transition-all"
              >
                <span>GEO Lens</span>
                <ArrowUpRight className="w-4 h-4 text-steel-400" />
              </Link>
            </div>
          </div>

          {/* Deployment Diff Strip */}
          <DeploymentStrip
            deployments={deploymentsList}
            activeDeployNumber={activeDeployNumber}
            onSelectDeployment={(num) => setActiveDeployNumber(num)}
          />

          {/* Dual Gauges Section */}
          <section
            aria-label="Health Gauges"
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6"
          >
            <Gauge
              value={currentScenario.scores.searchHealth}
              title="Search Crawler Health"
              lensLabel="SEARCH LENS"
              delta={currentScenario.scores.deltaSearch}
            />
            <Gauge
              value={currentScenario.scores.geoScore}
              title="AI-Answer Citation-Readiness (GEO)"
              lensLabel="AI-ANSWER LENS"
              delta={currentScenario.scores.deltaGeo}
            />
          </section>

          {/* Bento Split: Findings (2/3) + System Load / Telemetry (1/3) */}
          <section
            aria-label="Regression Findings"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Findings Panel (8 cols on lg) */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-bone-300 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
                    REGRESSION FINDINGS
                  </span>
                  <span className="font-mono text-sm font-black text-ember-600 bg-ember-600/10 px-2.5 py-0.5 rounded-sm border border-ember-600/20">
                    {currentScenario.findings.length}
                  </span>
                </div>
                <span className="font-sans text-xs text-bone-700">
                  Rule Engine Attribution · Pure Code
                </span>
              </div>

              {currentScenario.findings.length === 0 ? (
                <div className="bg-bone-100 border border-bone-300 rounded-sm p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-patina-400" />
                  <div className="flex flex-col">
                    <h4 className="font-mono font-bold text-base text-ink-900">
                      No Discoverability Regressions Detected
                    </h4>
                    <p className="font-sans text-xs text-bone-700 mt-1 max-w-md">
                      All canonical tags, JSON-LD structured schemas, and
                      indexing directives are verified healthy under deployment
                      #{activeDeployNumber}.
                    </p>
                  </div>
                </div>
              ) : (
                currentScenario.findings.map((f) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    onGenerateFix={handleGenerateFix}
                    isFixing={isFixing}
                  />
                ))
              )}

              {/* Generated PR Remediation Card */}
              {(generatedPatch || activeDeployNumber === 185) && (
                <PRCard
                  prNumber={185}
                  title="Restore canonical tag generator in ProductMetadata"
                  body="Automated Tier-A remediation restoring missing canonical declarations across 127 product routes."
                  diff={
                    generatedPatch?.diff ||
                    `--- a/src/app/products/[slug]/page.tsx
+++ b/src/app/products/[slug]/page.tsx
@@ -182,3 +182,7 @@ export async function generateMetadata({ params }: Props): Promise<Metadata> {
   return {
     title: product.name,
     description: product.summary,
+    alternates: {
      canonical: \`https://store.acme.com/products/\${params.slug}\`,
    },
   };
 }`
                  }
                  targetFile="src/app/products/[slug]/page.tsx"
                  status={activeDeployNumber === 185 ? "APPLIED" : "READY"}
                  onMergeFix={handleMergeFix}
                  isMerging={isMerging}
                />
              )}
            </div>

            {/* System Load & Telemetry Sidebar (4 cols on lg) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-bone-300 pb-3">
                <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
                  SYSTEM TELEMETRY
                </span>
                <span className="font-mono text-xs text-patina-600 bg-patina-400/20 px-2 py-0.5 rounded-sm font-bold border border-patina-400/30">
                  LIVE
                </span>
              </div>

              {/* Telemetry Card 1: Crawl Budget */}
              <div className="bg-bone-100 border border-bone-300 rounded-md p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-bone-700 font-bold uppercase tracking-wider">
                    CRAWL BUDGET
                  </span>
                  <span className="font-mono text-2xl font-black text-patina-600 tabular-nums">
                    94.2%
                  </span>
                </div>
                <div className="w-full bg-bone-300 h-2.5 rounded-sm overflow-hidden">
                  <div className="bg-patina-400 h-full w-[94.2%] transition-all duration-700" />
                </div>
                <span className="font-sans text-xs text-bone-700">
                  Googlebot &amp; Bingbot index latency:{" "}
                  <strong className="text-ink-900">42ms</strong> avg
                </span>
              </div>

              {/* Telemetry Card 2: Neural Grounding Index */}
              <div className="bg-bone-100 border border-bone-300 rounded-md p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-bone-700 font-bold uppercase tracking-wider">
                    NEURAL GROUNDING
                  </span>
                  <span
                    className={`font-mono text-2xl font-black tabular-nums ${activeDeployNumber === 184 ? "text-ember-600" : "text-patina-600"}`}
                  >
                    {activeDeployNumber === 184 ? "40%" : "100%"}
                  </span>
                </div>
                <div className="w-full bg-bone-300 h-2.5 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${activeDeployNumber === 184 ? "bg-ember-600 w-[40%]" : "bg-patina-400 w-full"}`}
                  />
                </div>
                <span className="font-sans text-xs text-bone-700">
                  {activeDeployNumber === 184
                    ? "⚠ Poisoned — AI engines hallucinating"
                    : "Target entities extracted by LLM engines"}
                </span>
              </div>

              {/* Telemetry Card 3: Quick Navigation */}
              <div className="bg-bone-300/30 border border-bone-300 rounded-md p-4 flex flex-col gap-3">
                <span className="font-mono text-xs font-black text-ink-900 uppercase tracking-wider">
                  FIELD MANUAL MODULES
                </span>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      href: "/regression/184",
                      label: "Regression Bento",
                      accent: "hover:border-ember-600",
                      icon: "text-ember-600",
                    },
                    {
                      href: "/geo",
                      label: "GEO Citation Test",
                      accent: "hover:border-steel-400",
                      icon: "text-steel-400",
                    },
                    {
                      href: "/graph",
                      label: "Crawler Map",
                      accent: "hover:border-patina-400",
                      icon: "text-patina-500",
                    },
                    {
                      href: "/remediation",
                      label: "Remediation Gate",
                      accent: "hover:border-patina-400",
                      icon: "text-patina-500",
                    },
                    {
                      href: "/seo-advisor",
                      label: "SEO Advisor",
                      accent: "hover:border-steel-400",
                      icon: "text-steel-400",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between p-3 rounded-sm bg-bone-100 border border-bone-300 ${item.accent} transition-all group`}
                    >
                      <span className="font-sans text-sm font-semibold text-ink-900">
                        {item.label}
                      </span>
                      <ArrowUpRight
                        className={`w-4 h-4 ${item.icon} group-hover:translate-x-0.5 transition-transform`}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Field Manual Footer */}
      <footer className="w-full bg-bone-100 border-t-2 border-bone-300 py-4 px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-ember-600 text-bone-100 font-mono font-black text-xs flex items-center justify-center rounded-sm">
              SO
            </div>
            <span className="font-mono text-sm font-bold text-ink-900">
              SEARCHOPS_v1.0
            </span>
            <span className="text-bone-400">·</span>
            <span className="font-sans text-sm text-bone-700">
              The Field Manual Design System
            </span>
          </div>
          <span className="font-sans text-sm text-bone-500">
            Dual-Audience Precision CI/CD Instrument
          </span>
        </div>
      </footer>
    </div>
  );
}
