"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle, AlertTriangle, TrendingDown } from "lucide-react";

interface RadialGaugeProps {
  value: number;
  label: string;
  sublabel: string;
  previousValue?: number;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  label,
  sublabel,
  previousValue,
}) => {
  const [animated, setAnimated] = useState(false);
  const clamped = Math.max(0, Math.min(100, value));
  const size = 220;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, [value]);

  let strokeColor = "#4FA695";
  let valueColor = "text-patina-400";
  let StatusIcon = CheckCircle;
  let statusText = "PASS";
  let statusBg = "bg-patina-tint/60 border-patina-400/30";

  if (clamped < 60) {
    strokeColor = "#F26A2E";
    valueColor = "text-ember-400";
    StatusIcon = AlertTriangle;
    statusText = "CRITICAL";
    statusBg = "bg-ember-tint/60 border-ember-400/30";
  } else if (clamped < 85) {
    strokeColor = "#E7A13A";
    valueColor = "text-marigold-400";
    StatusIcon = TrendingDown;
    statusText = "DEGRADED";
    statusBg = "bg-marigold-tint/60 border-marigold-400/30";
  }

  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const arcDegrees = 270;
  const startAngle = 135;
  const totalCircumference = 2 * Math.PI * radius;
  const arcLength = (arcDegrees / 360) * totalCircumference;
  const dashOffset = animated
    ? arcLength - (clamped / 100) * arcLength
    : arcLength;

  const delta = previousValue !== undefined ? value - previousValue : undefined;

  return (
    <div className="bg-ink-800 border border-ink-700 rounded-md p-5 flex flex-col items-center gap-4 shadow-card">
      {/* Label */}
      <div className="w-full flex items-center justify-between border-b border-ink-700 pb-3">
        <span className="font-mono text-xs font-bold text-bone-500 uppercase tracking-widest">
          {label}
        </span>
        {delta !== undefined && (
          <span
            className={clsx(
              "font-mono text-sm font-black tabular-nums px-2.5 py-1 rounded-sm border",
              delta < 0
                ? "text-ember-400 bg-ember-tint border-ember-600/40"
                : "text-patina-400 bg-patina-tint border-patina-600/40",
            )}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>

      {/* SVG Arc */}
      <div className="relative w-full max-w-[220px]">
        <svg
          viewBox={`0 0 ${size} ${size * 0.88}`}
          className="w-full h-auto overflow-visible"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#15110D"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${totalCircumference}`}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${totalCircumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
            style={{
              transition:
                "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.6, 0.2, 1)",
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
          <span
            className={clsx(
              "font-display font-black tabular-nums leading-none",
              valueColor,
            )}
            style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}
          >
            {clamped}
          </span>
          <span className="font-mono text-xs tracking-widest text-bone-500 uppercase mt-1">
            / 100
          </span>
        </div>
      </div>

      {/* Status + Sublabel */}
      <div className="w-full text-center border-t border-ink-700 pt-3 flex flex-col items-center gap-2">
        <p className="font-sans text-sm font-semibold text-bone-300">
          {sublabel}
        </p>
        <div
          className={clsx(
            "flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm border",
            valueColor,
            statusBg,
          )}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};

interface RemediationRadialGaugesProps {
  beforeSearch: number;
  afterSearch: number;
  beforeGeo: number;
  afterGeo: number;
}

export const RemediationRadialGauges: React.FC<
  RemediationRadialGaugesProps
> = ({ beforeSearch, afterSearch, beforeGeo, afterGeo }) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b-2 border-bone-300 pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
            HEALTH RECOVERY
          </span>
          <span className="font-mono text-xs font-bold text-patina-600 bg-patina-400/15 px-2.5 py-0.5 rounded-sm border border-patina-400/30">
            AFTER MERGE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RadialGauge
          value={afterSearch}
          previousValue={beforeSearch}
          label="SEARCH LENS — AFTER"
          sublabel="Search Crawler Health"
        />
        <RadialGauge
          value={afterGeo}
          previousValue={beforeGeo}
          label="AI-ANSWER LENS — AFTER"
          sublabel="GEO Citation Readiness"
        />
      </div>

      {/* Before → After Summary Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bone-100 border border-bone-300 rounded-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs text-bone-700 uppercase tracking-wider block mb-0.5">
              Search Before
            </span>
            <span className="font-display font-black text-2xl text-ember-600 tabular-nums">
              {beforeSearch}
            </span>
          </div>
          <span className="font-mono text-2xl text-bone-400">→</span>
          <div className="text-right">
            <span className="font-mono text-xs text-bone-700 uppercase tracking-wider block mb-0.5">
              After
            </span>
            <span className="font-display font-black text-2xl text-patina-600 tabular-nums">
              {afterSearch}
            </span>
          </div>
        </div>

        <div className="bg-bone-100 border border-bone-300 rounded-sm p-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs text-bone-700 uppercase tracking-wider block mb-0.5">
              GEO Before
            </span>
            <span className="font-display font-black text-2xl text-ember-600 tabular-nums">
              {beforeGeo}
            </span>
          </div>
          <span className="font-mono text-2xl text-bone-400">→</span>
          <div className="text-right">
            <span className="font-mono text-xs text-bone-700 uppercase tracking-wider block mb-0.5">
              After
            </span>
            <span className="font-display font-black text-2xl text-patina-600 tabular-nums">
              {afterGeo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
