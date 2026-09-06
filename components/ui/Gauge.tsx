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
  let statusColor = "text-patina-600";
  let statusBg = "bg-patina-soft border-patina-500/40";
  let statusText = "PASS · OPTIMIZED";
  let StatusIcon = CheckCircle;

  if (clamped < 60) {
    strokeColor = "#C23F10";
    statusColor = "text-ember-600";
    statusBg = "bg-ember-soft border-ember-600/40";
    statusText = "REGRESSION DETECTED";
    StatusIcon = AlertTriangle;
  } else if (clamped < 85) {
    strokeColor = "#B4791F";
    statusColor = "text-marigold-600";
    statusBg = "bg-marigold-soft border-marigold-400/40";
    statusText = "DEGRADED · AT RISK";
    StatusIcon = TrendingDown;
  }

  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const arcDegrees = 240;
  const startAngle = 150;
  const totalCircumference = 2 * Math.PI * radius;
  const arcLength = (arcDegrees / 360) * totalCircumference;
  const dashOffset = animated
    ? arcLength - (clamped / 100) * arcLength
    : arcLength;

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div
      className={clsx(
        "relative flex w-full flex-col items-center justify-between rounded-lg border border-paper-200 bg-surface p-5 transition-all duration-[160ms] sm:p-6",
        className,
      )}
    >
      {/* Header Eyebrow */}
      <div className="mb-3 flex w-full items-center justify-between border-b border-paper-200 pb-3">
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
                ? "text-ember-600 bg-ember-soft border-ember-600/40"
                : delta > 0
                  ? "text-patina-600 bg-patina-soft border-patina-500/40"
                  : "text-bone-700 bg-paper-50 border-paper-200",
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
            stroke="#E0D4C0"
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
            className="font-mono text-mono-num-xl font-bold tabular-nums leading-none text-espresso-900"
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
      <div className="mt-3 flex w-full flex-col items-center gap-2 border-t border-paper-200 pt-3 text-center">
        <h4 className="font-sans text-base font-semibold leading-tight text-espresso-900 sm:text-lg">
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
