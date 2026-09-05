"use client";

import React from "react";
import clsx from "clsx";

interface OptimizationPotentialProps {
  pageUrl: string;
  openSuggestionCount: number;
}

export const OptimizationPotential: React.FC<OptimizationPotentialProps> = ({
  pageUrl,
  openSuggestionCount,
}) => {
  const hasSuggestions = openSuggestionCount > 0;

  return (
    <div className="flex items-center justify-between font-mono text-xs px-3 py-2 border border-bone-300 rounded-sm bg-bone-100">
      <span className="text-ink-900 truncate">{pageUrl}</span>
      <span
        className={clsx(
          "flex items-center gap-1.5 font-bold tabular-nums",
          hasSuggestions ? "text-steel-400" : "text-bone-500",
        )}
      >
        <span>{hasSuggestions ? "◆" : "○"}</span>
        <span>
          {hasSuggestions
            ? `${openSuggestionCount} open suggestion${openSuggestionCount === 1 ? "" : "s"}`
            : "no suggestions"}
        </span>
      </span>
    </div>
  );
};
