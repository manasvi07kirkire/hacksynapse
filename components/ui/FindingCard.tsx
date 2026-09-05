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
        "bg-ink-800 border border-ink-700 rounded-md p-5 sm:p-6 border-l-[5px] transition-all flex flex-col gap-5 relative overflow-hidden shadow-card",
        borderColor,
      )}
    >
      {/* Top Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Chip */}
          <span
            className={clsx(
              "font-mono text-xs font-bold px-3 py-1 rounded-sm border uppercase tracking-wider flex items-center gap-1.5",
              isResolved
                ? "text-patina-400 bg-patina-tint border-patina-400/40"
                : isCritical
                  ? "text-ember-400 bg-ember-tint border-ember-400/40"
                  : "text-marigold-400 bg-marigold-tint border-marigold-400/40",
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
          <span className="font-mono text-xs text-bone-300 bg-ink-850 px-3 py-1 rounded-sm border border-ink-700 tabular-nums font-semibold">
            {finding.confidence}% CONFIDENCE
          </span>

          {/* Lens Chip */}
          <span className="font-mono text-xs text-steel-400 uppercase tracking-wide bg-ink-850 px-3 py-1 rounded-sm border border-ink-700 font-bold">
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
        <h3 className="font-sans font-semibold text-lg sm:text-xl text-bone-100 flex items-center gap-2.5 leading-snug">
          {!isResolved && (
            <AlertCircle className="w-5 h-5 text-ember-400 shrink-0" />
          )}
          {isResolved && (
            <CheckCircle className="w-5 h-5 text-patina-400 shrink-0" />
          )}
          <span>{finding.title}</span>
        </h3>

        {finding.description && (
          <div className="bg-ink-850 p-4 rounded-sm border border-ink-700 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-bone-500 text-xs uppercase tracking-wider font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-marigold-400" />
              <span>Attribution Narration</span>
            </div>
            <p className="font-mono text-sm text-bone-300 leading-relaxed">
              {finding.description}
            </p>
          </div>
        )}
      </div>

      {/* Evidence & Root Cause Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evidence Block */}
        <div className="bg-ink-850 p-4 rounded-sm border border-ink-700 flex flex-col gap-2.5 font-mono">
          <span className="text-xs font-bold text-bone-500 uppercase tracking-wider">
            Deterministic Evidence
          </span>
          <div className="flex flex-col gap-2 text-sm text-bone-300">
            <div>
              <span className="text-bone-500">Pages Affected: </span>
              <strong className="text-bone-100 tabular-nums text-base">
                {finding.evidence.pagesAffected} routes
              </strong>
            </div>
            <div>
              <span className="text-bone-500">First Bad Deploy: </span>
              <span className="text-ember-400 font-bold">
                {finding.evidence.firstBadDeploy}
              </span>
            </div>
            <div>
              <span className="text-bone-500">Template Emitter: </span>
              <span className="text-bone-100">{finding.evidence.template}</span>
            </div>
            {finding.evidence.sampleUrls && (
              <div className="mt-1 pt-2 border-t border-ink-700">
                <span className="text-bone-500 text-xs block mb-1">
                  Sample Regressed URLs:
                </span>
                <div className="flex flex-col gap-1 text-xs text-bone-400">
                  {finding.evidence.sampleUrls.slice(0, 2).map((u, i) => (
                    <code
                      key={i}
                      className="truncate text-bone-300 bg-ink-900 px-2 py-0.5 rounded-sm"
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
        <div className="bg-ink-850 p-4 rounded-sm border border-ink-700 flex flex-col justify-between gap-3 font-mono">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-bone-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-steel-400" />
              AST Root Cause Attribution
            </span>

            {finding.rootCause ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-ember-400 font-bold text-sm">
                  {finding.rootCause.file}:{finding.rootCause.line}
                </div>
                <div className="text-bone-500 text-sm">
                  Component:{" "}
                  <span className="text-bone-300">
                    {finding.rootCause.component}
                  </span>
                </div>
                {finding.rootCause.snippet && (
                  <pre className="text-xs text-ember-400 bg-ink-900 p-2.5 rounded-sm border border-ink-700 overflow-x-auto mt-1 leading-relaxed">
                    {finding.rootCause.snippet}
                  </pre>
                )}
              </div>
            ) : (
              <span className="text-sm text-bone-500">
                Analyzing commit diff signatures...
              </span>
            )}
          </div>

          {!isResolved && onGenerateFix && (
            <button
              onClick={() => onGenerateFix(finding)}
              disabled={isFixing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-ember-500 hover:bg-ember-400 text-bone-100 rounded-sm font-mono text-sm font-bold tracking-wider uppercase transition-all shadow-cta disabled:opacity-50"
            >
              <Wrench className="w-4 h-4" />
              <span>
                {isFixing ? "VALIDATING PATCH..." : "GENERATE AUTO-FIX PR"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
