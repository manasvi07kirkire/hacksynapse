"use client";

import React from "react";
import clsx from "clsx";
import { Suggestion } from "@/lib/seo-advisor/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  appliedPrNumber?: number;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onApprove,
  onReject,
  appliedPrNumber,
}) => {
  const isApplied = suggestion.status === "applied";
  const isRejected = suggestion.status === "rejected";
  const isDecided = isApplied || isRejected || suggestion.status === "approved";

  return (
    <div
      className={clsx(
        "bg-bone-100 border border-bone-300 rounded-md border-l-[3px] border-l-steel-400 flex flex-col gap-3 p-4 sm:p-5 transition-opacity",
        isApplied && "opacity-60",
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs sm:text-sm font-bold text-ink-900 uppercase tracking-[0.08em]">
          {suggestion.location}
        </span>
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-sm border border-steel-400 text-steel-400 tabular-nums">
          {suggestion.confidence}% CONFIDENCE
        </span>
      </div>

      {/* Diff block */}
      <div className="bg-darkSurface-code rounded-sm p-3 font-mono text-xs sm:text-sm overflow-x-auto">
        <div className="bg-ember-tint text-bone-300 px-2 py-1 rounded-sm">
          <span className="text-ember-400">− </span>
          {suggestion.before || "(none)"}
        </div>
        <div className="bg-patina-tint text-bone-300 px-2 py-1 rounded-sm mt-1">
          <span className="text-patina-400">+ </span>
          {suggestion.after}
        </div>
      </div>

      {/* Rationale */}
      <p className="font-sans text-sm text-bone-700 leading-relaxed">
        {suggestion.rationale}
      </p>

      {/* Actions / status */}
      {isApplied ? (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-patina-600">
          <span className="text-patina-400">◆</span>
          <span>APPLIED IN PR #{appliedPrNumber ?? "—"}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => onReject?.(suggestion.id)}
            disabled={isDecided}
            className={clsx(
              "flex-1 py-2 px-3 min-h-[38px] rounded-sm border font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40",
              isRejected
                ? "border-bone-500 bg-bone-300/40 text-bone-700"
                : "border-bone-500 text-bone-700 hover:bg-bone-300/30",
            )}
          >
            − Reject
          </button>
          <button
            onClick={() => onApprove?.(suggestion.id)}
            disabled={isDecided}
            className={clsx(
              "flex-1 py-2 px-3 min-h-[38px] rounded-sm border font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40",
              suggestion.status === "approved"
                ? "border-patina-400 bg-patina-400 text-bone-100"
                : "border-patina-400 text-patina-600 hover:bg-patina-400/10",
            )}
          >
            {suggestion.status === "approved" ? "✓ Approved" : "+ Approve"}
          </button>
        </div>
      )}
    </div>
  );
};
