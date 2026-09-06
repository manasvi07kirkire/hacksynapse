"use client";

import React from "react";
import clsx from "clsx";
import { GitPullRequest, CheckCircle2, ShieldCheck, Check } from "lucide-react";

interface PRCardProps {
  prNumber: number;
  title: string;
  body: string;
  diff: string;
  targetFile: string;
  status: "READY" | "APPLIED" | "PENDING";
  onMergeFix?: () => void;
  isMerging?: boolean;
}

export const PRCard: React.FC<PRCardProps> = ({
  prNumber,
  title,
  body,
  diff,
  targetFile,
  status,
  onMergeFix,
  isMerging = false,
}) => {
  const isApplied = status === "APPLIED";

  return (
    <div className="bg-surface border border-paper-200 rounded-lg p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-patina-soft text-patina-600 border border-patina-600/30 flex items-center justify-center font-mono font-bold text-xs">
            <GitPullRequest className="w-4 h-4 text-patina-600" />
          </div>
          <span className="font-mono text-sm font-bold text-espresso-900">
            PR #{prNumber}
          </span>
          <span className="font-mono text-xs sm:text-sm text-bone-700 uppercase">
            Autonomous Tier-A Patch
          </span>
        </div>

        <span
          className={clsx(
            "font-mono text-xs font-bold px-2.5 py-1 rounded-sm border uppercase tracking-wider",
            isApplied
              ? "text-patina-600 bg-patina-soft border-patina-600/30"
              : "text-marigold-600 bg-marigold-soft border-marigold-600/30",
          )}
        >
          {isApplied ? "● MERGED & DEPLOYED" : "● READY TO MERGE"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="font-sans font-bold text-base sm:text-lg text-espresso-900">
          {title}
        </h4>
        <p className="font-sans text-sm text-espresso-700 leading-relaxed">
          {body}
        </p>
      </div>

      <div className="flex flex-col gap-2 font-mono">
        <div className="flex items-center justify-between text-xs sm:text-sm text-bone-700">
          <span>
            Target: <strong className="text-espresso-900">{targetFile}</strong>
          </span>
          <span className="text-xs text-patina-600 uppercase font-bold">
            Unified Git Diff
          </span>
        </div>

        <div className="bg-darkSurface-code border border-paper-200 rounded-sm p-3.5 font-mono text-xs sm:text-sm overflow-x-auto">
          <pre className="text-bone-300 leading-relaxed">
            {diff.split("\n").map((line, idx) => {
              const isAdd = line.startsWith("+") && !line.startsWith("+++");
              const isDel = line.startsWith("-") && !line.startsWith("---");
              const isHeader =
                line.startsWith("@@") ||
                line.startsWith("---") ||
                line.startsWith("+++");

              return (
                <div
                  key={idx}
                  className={clsx(
                    "px-1 py-0.5 rounded-sm",
                    isAdd && "bg-patina-soft/40 text-patina-400 font-semibold",
                    isDel && "bg-ember-soft/40 text-ember-400 font-semibold",
                    isHeader && "text-bone-500 font-bold opacity-80",
                  )}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm font-mono">
        <div className="bg-paper-50 p-2.5 rounded-sm border border-paper-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-patina-600 shrink-0" />
          <span className="truncate text-espresso-700">
            1. AST: <strong className="text-patina-600">PASS</strong>
          </span>
        </div>
        <div className="bg-paper-50 p-2.5 rounded-sm border border-paper-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-patina-600 shrink-0" />
          <span className="truncate text-espresso-700">
            2. Rules: <strong className="text-patina-600">0 FAIL</strong>
          </span>
        </div>
        <div className="bg-paper-50 p-2.5 rounded-sm border border-paper-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-patina-600 shrink-0" />
          <span className="truncate text-espresso-700">
            3. Build: <strong className="text-patina-600">CLEAN</strong>
          </span>
        </div>
      </div>

      {!isApplied && onMergeFix && (
        <div className="pt-3 border-t border-paper-200 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-xs sm:text-sm text-bone-700">
            One-click merge to staging (#185)
          </span>
          <button
            onClick={onMergeFix}
            disabled={isMerging}
            className="flex items-center gap-2 px-5 py-2 bg-ember-500 hover:bg-ember-400 text-bone-100 rounded-sm font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-cta disabled:opacity-50 min-h-[40px]"
          >
            <Check className="w-4 h-4 text-bone-100" />
            <span>{isMerging ? "MERGING FIX..." : "MERGE AUTO-FIX PR"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
