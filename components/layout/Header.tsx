"use client";

import React from "react";
import clsx from "clsx";
import { Zap } from "lucide-react";
import { RoadmapBadge } from "../ui/RoadmapBadge";

interface HeaderProps {
  currentDeployNumber: number;
  onSelectDeploy: (num: number) => void;
  onTriggerPoisonedDeploy: () => void;
  isTriggering?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDeployNumber,
  onSelectDeploy,
  onTriggerPoisonedDeploy,
  isTriggering = false,
}) => {
  return (
    <header className="w-full bg-ink-850 border-b border-ink-700 sticky top-0 z-50">
      {/* Top Instrument Status Line */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs font-mono border-b border-ink-700/60">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Live Pulse Indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-patina-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-patina-400"></span>
            </span>
            <span className="text-patina-400 font-bold uppercase tracking-wider text-xs">
              ENGINE ACTIVE
            </span>
          </div>

          <span className="hidden sm:inline text-ink-700">|</span>

          <span className="text-bone-400 truncate max-w-[280px] sm:max-w-none">
            Target:{" "}
            <code className="text-bone-200 bg-ink-900 px-2 py-0.5 rounded-sm border border-ink-700 font-mono text-xs">
              acme-industries/precision-store
            </code>
          </span>

          <span className="hidden md:inline text-ink-700">|</span>

          <span className="hidden lg:inline text-bone-400">
            Staging:{" "}
            <span className="text-bone-200 font-mono text-xs">
              https://store.acme-industrial.com
            </span>
          </span>
        </div>

        {/* Scenario Switcher & Primary Action Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-ink-900 p-1 rounded-sm border border-ink-700 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => onSelectDeploy(183)}
              className={clsx(
                "px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition-all shrink-0 uppercase tracking-wider min-h-[32px]",
                currentDeployNumber === 183
                  ? "bg-patina-tint text-patina-400 border border-patina-400/40"
                  : "text-bone-400 hover:text-bone-200",
              )}
            >
              #183 Healthy
            </button>
            <button
              onClick={() => onSelectDeploy(184)}
              className={clsx(
                "px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition-all shrink-0 uppercase tracking-wider min-h-[32px]",
                currentDeployNumber === 184
                  ? "bg-ember-tint text-ember-400 border border-ember-400/40"
                  : "text-bone-400 hover:text-bone-200",
              )}
            >
              #184 Regression
            </button>
            <button
              onClick={() => onSelectDeploy(185)}
              className={clsx(
                "px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition-all shrink-0 uppercase tracking-wider min-h-[32px]",
                currentDeployNumber === 185
                  ? "bg-patina-tint text-patina-400 border border-patina-400/40"
                  : "text-bone-400 hover:text-bone-200",
              )}
            >
              #185 Remediated
            </button>
          </div>

          <button
            onClick={onTriggerPoisonedDeploy}
            disabled={isTriggering}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-ember-500 hover:bg-ember-400 text-bone-100 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-cta min-h-[36px]"
          >
            <Zap className="w-3.5 h-3.5 text-bone-100" />
            <span>
              {isTriggering ? "SIMULATING..." : "SIMULATE POISONED DEPLOY"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ember-500 text-bone-100 rounded-sm flex items-center justify-center font-mono font-bold text-sm shadow-cta">
              SO
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl sm:text-2xl font-normal text-bone-100 tracking-tight leading-none">
                SearchOps
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-bone-400 mt-1">
                Discoverability CI/CD · Dual-Audience Web
              </span>
            </div>
          </div>
        </div>

        {/* Right side badges & lens info */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-ink-900 px-3 py-1.5 rounded-sm border border-ink-700 text-xs sm:text-sm font-mono">
            <span className="text-bone-500">Dual Lenses:</span>
            <span className="text-bone-100 font-bold">1. Search Crawlers</span>
            <span className="text-line-600">·</span>
            <span className="text-steel-400 font-bold">
              2. AI Answer Engines
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-bone-400 hidden sm:inline font-semibold">
              Status Checks:
            </span>
            <RoadmapBadge label="ROADMAP (P2)" />
          </div>
        </div>
      </div>
    </header>
  );
};
