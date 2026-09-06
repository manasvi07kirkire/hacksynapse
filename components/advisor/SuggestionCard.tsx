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
        "flex flex-col gap-3 rounded-md border border-paper-200 border-l-[3px] border-l-steel-400 bg-surface p-4 transition-opacity duration-[160ms] sm:p-5",
        isApplied && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="mono-label text-espresso-700">{suggestion.location}</span>
        <span className="rounded-full border border-steel-400/40 px-2.5 py-1 font-mono text-[0.6875rem] font-bold tabular-nums text-steel-400">
          {suggestion.confidence}% CONFIDENCE
        </span>
      </div>

      <div className="overflow-x-auto rounded-sm bg-darkSurface-code p-3 font-mono text-xs sm:text-sm">
        <div className="rounded-sm bg-ember-soft px-2 py-1 text-espresso-700">
          <span className="text-ember-400">− </span>
          {suggestion.before || "(none)"}
        </div>
        <div className="mt-1 rounded-sm bg-patina-soft px-2 py-1 text-espresso-700">
          <span className="text-patina-400">+ </span>
          {suggestion.after}
        </div>
      </div>

      <p className="font-sans text-sm leading-relaxed text-espresso-700">
        {suggestion.rationale}
      </p>

      {isApplied ? (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-patina-600">
          <span aria-hidden>◆</span>
          <span>APPLIED IN PR #{appliedPrNumber ?? "—"}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => onReject?.(suggestion.id)}
            disabled={isDecided}
            className={clsx(
              "min-h-[40px] flex-1 rounded-sm border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-[160ms] disabled:opacity-40 sm:text-sm",
              isRejected
                ? "border-paper-200 bg-paper-100 text-bone-700"
                : "border-paper-200 text-espresso-700 hover:bg-paper-50",
            )}
          >
            Reject
          </button>
          <button
            onClick={() => onApprove?.(suggestion.id)}
            disabled={isDecided}
            className={clsx(
              "min-h-[40px] flex-1 rounded-sm border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-[160ms] disabled:opacity-40 sm:text-sm",
              suggestion.status === "approved"
                ? "border-patina-600 bg-patina-600 text-white"
                : "border-patina-600 text-patina-600 hover:bg-patina-soft",
            )}
          >
            {suggestion.status === "approved" ? "Approved" : "Approve"}
          </button>
        </div>
      )}
    </div>
  );
};
