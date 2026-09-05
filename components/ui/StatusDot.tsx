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

  // Shape symbol according to design system:
  // ● filled circle -> regression (ember)
  // ■ filled square -> healthy (patina)
  // ◆ diamond -> remediated (patina)
  // ▲ triangle -> degraded (marigold)
  let symbol = "■";
  let textLabel = label || status;
  let colorClasses = "text-patina-400 border-patina-600/40 bg-patina-tint";

  if (isRegression) {
    symbol = "●";
    colorClasses = "text-ember-400 border-ember-600/40 bg-ember-tint";
  } else if (isDegraded) {
    symbol = "▲";
    colorClasses = "text-marigold-400 border-marigold-400/30 bg-marigold-tint";
  } else if (isRemediated) {
    symbol = "◆";
    colorClasses = "text-patina-400 border-patina-600/40 bg-patina-tint";
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
