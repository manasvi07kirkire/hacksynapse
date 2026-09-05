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
    <div className="bg-ink-800 border border-ink-700 rounded-sm p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-patina-tint text-patina-400 border border-patina-400/40 flex items-center justify-center font-mono font-bold text-xs">
            <GitPullRequest className="w-4 h-4 text-patina-400" />
          </div>
          <span className="font-mono text-sm font-bold text-bone-100">
            PR #{prNumber}
          </span>
          <span className="font-mono text-xs sm:text-sm text-bone-400 uppercase">
            Autonomous Tier-A Patch
          </span>
        </div>

        <span
          className={clsx(
            "font-mono text-xs font-bold px-2.5 py-1 rounded-sm border uppercase tracking-wider",
            isApplied
              ? "text-patina-400 bg-patina-tint border-patina-400/40"
              : "text-marigold-400 bg-marigold-tint border-marigold-400/40",
          )}
        >
          {isApplied ? "● MERGED & DEPLOYED" : "● READY TO MERGE"}
        </span>
      </div>

      {/* PR Summary */}
      <div className="flex flex-col gap-1.5">
        <h4 className="font-sans font-bold text-base sm:text-lg text-bone-100">
          {title}
        </h4>
        <p className="font-sans text-sm text-bone-300 leading-relaxed">
          {body}
        </p>
      </div>

      {/* Diff Box */}
      <div className="flex flex-col gap-2 font-mono">
        <div className="flex items-center justify-between text-xs sm:text-sm text-bone-400">
          <span>
            Target: <strong className="text-bone-100">{targetFile}</strong>
          </span>
          <span className="text-xs text-patina-400 uppercase font-bold">
            Unified Git Diff
          </span>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-sm p-3.5 font-mono text-xs sm:text-sm overflow-x-auto">
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
                    isAdd && "bg-patina-tint text-patina-400 font-semibold",
                    isDel && "bg-ember-tint text-ember-400 font-semibold",
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

      {/* 3-Step Automated Validation Gate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm font-mono">
        <div className="bg-ink-850 p-2.5 rounded-sm border border-ink-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-patina-400 shrink-0" />
          <span className="truncate text-bone-300">
            1. AST: <strong className="text-patina-400">PASS</strong>
          </span>
        </div>
        <div className="bg-ink-850 p-2.5 rounded-sm border border-ink-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-patina-400 shrink-0" />
          <span className="truncate text-bone-300">
            2. Rules: <strong className="text-patina-400">0 FAIL</strong>
          </span>
        </div>
        <div className="bg-ink-850 p-2.5 rounded-sm border border-ink-700 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-patina-400 shrink-0" />
          <span className="truncate text-bone-300">
            3. Build: <strong className="text-patina-400">CLEAN</strong>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      {!isApplied && onMergeFix && (
        <div className="pt-3 border-t border-ink-700 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-xs sm:text-sm text-bone-400">
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
