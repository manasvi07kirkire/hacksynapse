"use client";

import React from "react";
import clsx from "clsx";
import {
  AlertCircle,
  FileCode,
  CheckCircle,
  Sparkles,
  Wrench,
} from "lucide-react";
import { FindingData } from "@/lib/detect/types";
import { TierBadge } from "./TierBadge";

interface FindingCardProps {
  finding: FindingData;
  onGenerateFix?: (finding: FindingData) => void;
  isFixing?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onGenerateFix,
  isFixing = false,
}) => {
  const isCritical = finding.severity === "CRITICAL";
  const isHigh = finding.severity === "HIGH";
  const isResolved = finding.status === "REMEDIATED";

  const borderColor = isResolved
    ? "border-l-patina-400"
    : isCritical || isHigh
      ? "border-l-ember-600"
      : "border-l-marigold-400";

  return (
    <div
      className={clsx(
        "flex flex-col gap-5 relative overflow-hidden rounded-lg border border-paper-200 bg-surface p-5 sm:p-6 border-l-[3px] transition-all duration-[160ms]",
        borderColor,
      )}
    >
      {/* Top Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Chip */}
          <span
            className={clsx(
              "font-mono text-xs font-bold px-3 py-1 rounded-sm border uppercase tracking-wider flex items-center gap-1.5",
              isResolved
                ? "text-patina-600 bg-patina-soft border-patina-500/40"
                : isCritical
                  ? "text-ember-600 bg-ember-soft border-ember-500/40"
                  : "text-marigold-600 bg-marigold-soft border-marigold-400/40",
            )}
          >
            {isResolved ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {isResolved ? "REMEDIATED" : finding.severity}
          </span>

          {/* Confidence Chip */}
          <span className="rounded-sm border border-paper-200 bg-paper-50 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-espresso-700">
            {finding.confidence}% CONFIDENCE
          </span>

          {/* Lens Chip */}
          <span className="rounded-sm border border-paper-200 bg-paper-50 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-steel-400">
            {finding.lens === "search"
              ? "SEARCH CRAWLER"
              : finding.lens === "ai-answer"
                ? "AI-ANSWER ENGINE"
                : "DUAL LENS"}
          </span>
        </div>

        {/* Remediation Tier Badge */}
        <TierBadge findingType={finding.type} />
      </div>

      {/* Title & LLM Narration */}
      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2.5 font-sans text-lg font-semibold leading-snug text-espresso-900 sm:text-xl">
          {!isResolved && (
            <AlertCircle className="w-5 h-5 text-ember-400 shrink-0" />
          )}
          {isResolved && (
            <CheckCircle className="w-5 h-5 text-patina-400 shrink-0" />
          )}
          <span>{finding.title}</span>
        </h3>

        {finding.description && (
          <div className="flex flex-col gap-1.5 rounded-sm border border-paper-200 bg-paper-50 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bone-700">
              <Sparkles className="h-3.5 w-3.5 text-marigold-600" />
              <span>Attribution Narration</span>
            </div>
            <p className="font-mono text-sm leading-relaxed text-espresso-700">
              {finding.description}
            </p>
          </div>
        )}
      </div>

      {/* Evidence & Root Cause Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evidence Block */}
        <div className="flex flex-col gap-2.5 rounded-sm border border-paper-200 bg-paper-50 p-4 font-mono">
          <span className="text-xs font-bold uppercase tracking-wider text-bone-700">
            Deterministic Evidence
          </span>
          <div className="flex flex-col gap-2 text-sm text-espresso-700">
            <div>
              <span className="text-bone-700">Pages Affected: </span>
              <strong className="text-base tabular-nums text-espresso-900">
                {finding.evidence.pagesAffected} routes
              </strong>
            </div>
            <div>
              <span className="text-bone-500">First Bad Deploy: </span>
              <span className="font-bold text-ember-600">
                {finding.evidence.firstBadDeploy}
              </span>
            </div>
            <div>
              <span className="text-bone-500">Template Emitter: </span>
              <span className="text-espresso-900">{finding.evidence.template}</span>
            </div>
            {finding.evidence.sampleUrls && (
              <div className="mt-1 border-t border-paper-200 pt-2">
                <span className="mb-1 block text-xs text-bone-700">
                  Sample Regressed URLs:
                </span>
                <div className="flex flex-col gap-1 text-xs text-espresso-700">
                  {finding.evidence.sampleUrls.slice(0, 2).map((u, i) => (
                    <code
                      key={i}
                      className="truncate rounded-sm bg-darkSurface-code px-2 py-0.5 text-bone-300"
                    >
                      {u}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Root Cause Attribution Block */}
        <div className="flex flex-col justify-between gap-3 rounded-sm border border-paper-200 bg-paper-50 p-4 font-mono">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bone-700">
              <FileCode className="h-3.5 w-3.5 text-steel-400" />
              AST Root Cause Attribution
            </span>

            {finding.rootCause ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-sm font-bold text-ember-600">
                  {finding.rootCause.file}:{finding.rootCause.line}
                </div>
                <div className="text-sm text-espresso-700">
                  Component:{" "}
                  <span className="text-espresso-900">
                    {finding.rootCause.component}
                  </span>
                </div>
                {finding.rootCause.snippet && (
                  <pre className="mt-1 overflow-x-auto rounded-sm border border-paper-200 bg-darkSurface-code p-2.5 text-xs leading-relaxed text-ember-400">
                    {finding.rootCause.snippet}
                  </pre>
                )}
              </div>
            ) : (
              <span className="text-sm text-bone-700">
                Analyzing commit diff signatures...
              </span>
            )}
          </div>

          {!isResolved && onGenerateFix && (
            <button
              onClick={() => onGenerateFix(finding)}
              disabled={isFixing}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-ember-600 bg-ember-500 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-cta transition-all duration-[160ms] hover:bg-ember-400 disabled:opacity-50 focus-ring"
            >
              <Wrench className="w-4 h-4" />
              <span>
                {isFixing ? "Validating patch…" : "Generate auto-fix PR"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
