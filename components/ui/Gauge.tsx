"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle, AlertTriangle, TrendingDown } from "lucide-react";

interface GaugeProps {
  value: number;
  title: string;
  subtitle?: string;
  delta?: number;
  lensLabel: "SEARCH LENS" | "AI-ANSWER LENS";
  size?: number;
  className?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  title,
  subtitle,
  delta,
  lensLabel,
  size = 260,
  className,
}) => {
  const [animated, setAnimated] = useState(false);
  const clamped = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, [value]);

  // Score threshold mapping
  let strokeColor = "#4FA695"; // patina-400 — PASS
  let statusColor = "text-patina-400";
  let statusBg = "bg-patina-tint/60 border-patina-400/40";
  let statusText = "PASS · OPTIMIZED";
  let StatusIcon = CheckCircle;

  if (clamped < 60) {
    strokeColor = "#F26A2E";
    statusColor = "text-ember-400";
    statusBg = "bg-ember-tint/60 border-ember-400/40";
    statusText = "REGRESSION DETECTED";
    StatusIcon = AlertTriangle;
  } else if (clamped < 85) {
    strokeColor = "#E7A13A";
    statusColor = "text-marigold-400";
    statusBg = "bg-marigold-tint/60 border-marigold-400/40";
    statusText = "DEGRADED · AT RISK";
    StatusIcon = TrendingDown;
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

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center justify-between p-5 sm:p-6 bg-ink-800 border border-ink-700 rounded-md transition-all duration-200 w-full shadow-card",
        className,
      )}
    >
      {/* Header Eyebrow */}
      <div className="w-full flex items-center justify-between border-b border-ink-700 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-widest text-bone-500 uppercase">
            {lensLabel}
          </span>
        </div>
        {delta !== undefined && (
          <span
            className={clsx(
              "font-mono text-sm font-bold px-2.5 py-1 rounded-sm tabular-nums border flex items-center gap-1 shrink-0",
              delta < 0
                ? "text-ember-400 bg-ember-tint border-ember-600/40"
                : delta > 0
                  ? "text-patina-400 bg-patina-tint border-patina-600/40"
                  : "text-bone-500 bg-ink-850 border-ink-700",
            )}
          >
            {delta > 0 ? `+${delta}` : delta} PTS
          </span>
        )}
      </div>

      {/* SVG Arc Dial */}
      <div className="relative flex items-center justify-center w-full max-w-[260px]">
        <svg
          viewBox={`0 0 ${size} ${size * 0.88}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Background Track */}
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

          {/* Value Arc */}
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
                "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.6, 0.2, 1), stroke 0.3s ease",
            }}
          />

          {/* Tick marks */}
          {ticks.map((t) => {
            const angle = startAngle + (t / 100) * arcDegrees;
            const rad = (angle * Math.PI) / 180;
            const innerR = radius - strokeWidth / 2 - 7;
            const outerR = radius - strokeWidth / 2 - 2;
            return (
              <line
                key={t}
                x1={center + innerR * Math.cos(rad)}
                y1={center + innerR * Math.sin(rad)}
                x2={center + outerR * Math.cos(rad)}
                y2={center + outerR * Math.sin(rad)}
                stroke="#383027"
                strokeWidth={t === 0 || t === 100 ? 2 : 1.5}
              />
            );
          })}
        </svg>

        {/* Center Score Number & Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
          <span
            className="font-display font-black text-bone-100 tabular-nums leading-none"
            style={{ fontSize: "clamp(3rem, 5vw, 4rem)" }}
          >
            {clamped}
          </span>
          <span className="font-mono text-xs tracking-widest text-bone-500 uppercase mt-1">
            / 100
          </span>
        </div>
      </div>

      {/* Footer: Title + Status */}
      <div className="w-full text-center mt-3 border-t border-ink-700 pt-3 flex flex-col items-center gap-2">
        <h4 className="font-sans font-semibold text-base sm:text-lg text-bone-100 leading-tight">
          {title}
        </h4>
        {subtitle && (
          <p className="font-sans text-sm text-bone-400">{subtitle}</p>
        )}
        <div
          className={clsx(
            "flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm border",
            statusColor,
            statusBg,
          )}
        >
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
