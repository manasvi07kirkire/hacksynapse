"use client";

import React from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, RefreshCw, Cpu, BookOpen } from "lucide-react";
import { GroundedFactCheck } from "@/lib/geo/citation-test";

interface CitationMeterProps {
  score: number;
  scorePercent?: number;
  url: string;
  query?: string;
  modelAnswer?: string;
  modelUsed?: string;
  groundedFacts?: GroundedFactCheck[];
  onReRunTest?: () => Promise<void>;
  isLoading?: boolean;
}

export const CitationMeter: React.FC<CitationMeterProps> = ({
  score = 5,
  url,
  query = "What are the core technical specifications and pricing of this product?",
  modelAnswer = "The Digital Micrometer Caliper features a hardened stainless steel housing and ±0.01mm calibration accuracy.",
  modelUsed = "meta-llama/llama-3.3-70b-instruct:free",
  groundedFacts = [
    { fact: "Hardened stainless steel housing", isGrounded: true },
    { fact: "±0.01mm calibration accuracy", isGrounded: true },
    { fact: "IP67 water resistance rating", isGrounded: true },
    { fact: "$149.00 MSRP", isGrounded: true },
    { fact: "Dual LCD digital display", isGrounded: true },
  ],
  onReRunTest,
  isLoading = false,
}) => {
  const totalSegments = 5;

  let meterColor = "bg-patina-500 border-patina-600/30";
  let textColor = "text-patina-600";
  let statusText = "HIGHLY CITATION-READY";

  if (score <= 2) {
    meterColor = "bg-ember-500 border-ember-600/30";
    textColor = "text-ember-600";
    statusText = "CITATION FAILURE · ENTITIES STRIPPED";
  } else if (score <= 4) {
    meterColor = "bg-marigold-400 border-marigold-600/30";
    textColor = "text-marigold-600";
    statusText = "PARTIALLY GROUNDED · AT RISK";
  }

  return (
    <div className="bg-surface border border-paper-200 rounded-lg p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-paper-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-4 h-4 text-steel-400 shrink-0" />
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-espresso-900">
            GEO CITATION-PROBABILITY METER
          </span>
          <span className="font-mono text-xs text-bone-700 bg-paper-50 px-2.5 py-0.5 border border-paper-200 rounded-sm shrink-0 font-semibold">
            THE WEDGE
          </span>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 truncate font-mono text-xs sm:text-sm">
            <span className="text-bone-700">Page:</span>
            <code className="text-espresso-900 bg-paper-50 px-2 py-0.5 rounded-sm border border-paper-200 truncate max-w-[140px] sm:max-w-[180px]">
              {url}
            </code>
          </div>
          {onReRunTest && (
            <button
              onClick={onReRunTest}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-paper-50 border border-paper-200 text-espresso-700 hover:text-espresso-900 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 min-h-[36px]"
            >
              <RefreshCw
                className={clsx(
                  "w-3.5 h-3.5 text-steel-400",
                  isLoading && "animate-spin text-ember-600",
                )}
              />
              <span>{isLoading ? "TESTING..." : "LIVE TEST"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-2xl sm:text-3xl font-black text-espresso-900 tabular-nums">
              {score} / 5
            </span>
            <span className="text-xs sm:text-sm text-bone-700 tabular-nums font-medium">
              ({Math.round((score / 5) * 100)}% grounded)
            </span>
          </div>
          <span
            className={clsx(
              "font-mono text-xs sm:text-sm font-bold uppercase tracking-wider",
              textColor,
            )}
          >
            {statusText}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 h-3">
          {Array.from({ length: totalSegments }).map((_, idx) => {
            const isFilled = idx < score;
            return (
              <div
                key={idx}
                className={clsx(
                  "h-full rounded-sm border transition-all duration-300",
                  isFilled
                    ? `${meterColor}`
                    : "bg-paper-200 border-paper-200 opacity-80",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col gap-2 bg-paper-50 p-3.5 rounded-sm border border-paper-200 font-mono">
          <span className="text-xs font-bold text-bone-700 uppercase tracking-wider">
            Target Facts / Structured Entities
          </span>
          <div className="flex flex-col gap-2 text-xs sm:text-sm">
            {groundedFacts.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {item.isGrounded ? (
                  <CheckCircle2 className="w-4 h-4 text-patina-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-ember-600 shrink-0 mt-0.5" />
                )}
                <span
                  className={clsx(
                    "font-sans",
                    item.isGrounded
                      ? "text-espresso-900 font-medium"
                      : "text-bone-500 line-through",
                  )}
                >
                  {item.fact}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 bg-paper-50 p-3.5 rounded-sm border border-paper-200 font-mono">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-bone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-steel-400 shrink-0" />
              <span>AI Answer Output</span>
            </span>
            <span className="text-xs text-bone-700 truncate max-w-[140px] font-medium">
              {modelUsed.split("/")[1] || modelUsed}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-espresso-700 leading-relaxed bg-surface p-3 rounded-sm border border-paper-200 italic font-mono">
            &ldquo;{modelAnswer}&rdquo;
          </p>

          <span className="text-xs text-bone-700 text-right truncate">
            Query: &ldquo;{query.slice(0, 35)}...&rdquo;
          </span>
        </div>
      </div>
    </div>
  );
};
