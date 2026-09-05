"use client";

import React from "react";
import clsx from "clsx";
import { Sparkles, AlertTriangle, CheckCircle } from "lucide-react";

interface CitationSegment {
  grounded: boolean;
  source?: string;
}

interface AiGroundingSimCardProps {
  prompt: string;
  aiResponse: string;
  segments: CitationSegment[];
  hallucination?: string;
  groundingScore: number;
}

export const AiGroundingSimCard: React.FC<AiGroundingSimCardProps> = ({
  prompt,
  aiResponse,
  segments,
  hallucination,
  groundingScore,
}) => {
  const groundedCount = segments.filter((s) => s.grounded).length;
  const isHealthy = groundingScore >= 80;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b-2 border-bone-300 pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
            AI GROUNDING SIMULATION
          </span>
        </div>
        <div
          className={clsx(
            "flex items-center gap-1.5 font-mono text-sm font-black px-3 py-1 rounded-sm border",
            isHealthy
              ? "text-patina-400 bg-patina-tint border-patina-400/30"
              : "text-ember-400 bg-ember-tint border-ember-400/30",
          )}
        >
          {isHealthy ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{groundingScore}% GROUNDED</span>
        </div>
      </div>

      {/* Citation Fidelity Meter */}
      <div className="bg-bone-100 border border-bone-300 rounded-md p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-bone-700 uppercase tracking-wider">
            SOURCE FIDELITY INDEX
          </span>
          <span className="font-mono text-sm font-black text-ink-900">
            {groundedCount} / {segments.length} SEGMENTS
          </span>
        </div>

        {/* Segments */}
        <div className="flex gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "w-full h-5 rounded-sm border transition-all",
                  seg.grounded
                    ? "bg-patina-400 border-patina-600/40"
                    : "bg-bone-300 border-bone-400/40",
                )}
              />
              <span className="font-mono text-2xs text-bone-500 uppercase">
                {seg.grounded ? "✓" : "–"}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-sans text-bone-700">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-patina-400 rounded-sm" />
            Grounded
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-bone-300 rounded-sm border border-bone-400" />
            Missing
          </span>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex flex-col gap-3">
        {/* User Prompt */}
        <div className="self-end max-w-xs sm:max-w-md bg-ink-800 border border-ink-700 rounded-md px-4 py-3">
          <div className="font-mono text-2xs text-bone-500 uppercase tracking-wider mb-1">
            USER QUERY
          </div>
          <p className="font-sans text-sm text-bone-200 leading-relaxed">
            {prompt}
          </p>
        </div>

        {/* AI Response */}
        <div className="self-start max-w-xs sm:max-w-md bg-bone-100 border border-bone-300 rounded-md px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-marigold-400" />
            <span className="font-mono text-2xs text-bone-700 uppercase tracking-wider">
              AI ANSWER ENGINE
            </span>
          </div>
          <p className="font-sans text-sm text-ink-900 leading-relaxed">
            {aiResponse}
          </p>
        </div>

        {/* Hallucination Alert */}
        {hallucination && (
          <div className="bg-ember-tint border border-ember-600/40 rounded-sm px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-ember-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-mono text-xs font-black text-ember-400 uppercase tracking-wider mb-1">
                HALLUCINATION ALERT
              </div>
              <p className="font-sans text-sm text-bone-300 leading-relaxed">
                {hallucination}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
