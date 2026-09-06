import React from "react";
import clsx from "clsx";

export type StatusType =
  "PASS" | "DEGRADED" | "REGRESSION" | "HEALTHY" | "REMEDIATED";

interface StatusDotProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  label,
  size = "md",
  className,
}) => {
  const isHealthy = status === "PASS" || status === "HEALTHY";
  const isRemediated = status === "REMEDIATED";
  const isDegraded = status === "DEGRADED";
  const isRegression = status === "REGRESSION";

  // Shape per design.md §5.2: ● PASS · ▲ DEGRADED · ■ REGRESSION
  let symbol = "●";
  let textLabel = label || status;
  let colorClasses = "text-patina-600 border-patina-500/40 bg-patina-soft";

  if (isRegression) {
    symbol = "■";
    colorClasses = "text-ember-600 border-ember-600/40 bg-ember-soft";
  } else if (isDegraded) {
    symbol = "▲";
    colorClasses = "text-marigold-600 border-marigold-400/30 bg-marigold-soft";
  } else if (isRemediated) {
    symbol = "◆";
    colorClasses = "text-patina-600 border-patina-500/40 bg-patina-soft";
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1.5 font-bold",
    md: "text-xs px-2.5 py-1 gap-1.5 font-bold",
    lg: "text-sm px-3 py-1 gap-2 font-bold",
  }[size];

  return (
    <span
      className={clsx(
        "inline-flex items-center font-mono uppercase tracking-wider rounded-sm border",
        colorClasses,
        sizeClasses,
        className,
      )}
    >
      <span className="text-xs leading-none" aria-hidden="true">
        {symbol}
      </span>
      <span>{textLabel}</span>
    </span>
  );
};
