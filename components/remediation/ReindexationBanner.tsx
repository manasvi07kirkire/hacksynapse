"use client";

import React from "react";
import clsx from "clsx";
import { CheckCircle, RefreshCw, Clock, Database } from "lucide-react";

interface ReindexationBannerProps {
  status: "IN_PROGRESS" | "COMPLETE" | "SCHEDULED";
  routesReindexed: number;
  totalRoutes: number;
  estimatedMinutes?: number;
  deployNumber: number;
}

export const ReindexationBanner: React.FC<ReindexationBannerProps> = ({
  status,
  routesReindexed,
  totalRoutes,
  estimatedMinutes,
  deployNumber,
}) => {
  const pct = Math.round((routesReindexed / totalRoutes) * 100);

  const statusConfig = {
    IN_PROGRESS: {
      label: "REINDEXATION IN PROGRESS",
      color: "text-marigold-400",
      bg: "bg-marigold-tint border-marigold-400/30",
      icon: RefreshCw,
      animate: true,
    },
    COMPLETE: {
      label: "REINDEXATION COMPLETE",
      color: "text-patina-400",
      bg: "bg-patina-tint border-patina-400/30",
      icon: CheckCircle,
      animate: false,
    },
    SCHEDULED: {
      label: "REINDEXATION SCHEDULED",
      color: "text-steel-400",
      bg: "bg-ink-850 border-ink-700",
      icon: Clock,
      animate: false,
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={clsx(
        "w-full border rounded-md p-5 flex flex-col gap-4",
        statusConfig.bg,
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusIcon
            className={clsx(
              "w-5 h-5 shrink-0",
              statusConfig.color,
              statusConfig.animate && "animate-spin",
            )}
          />
          <span
            className={clsx(
              "font-mono text-sm font-black uppercase tracking-wider",
              statusConfig.color,
            )}
          >
            {statusConfig.label}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-bone-700">
          DEPLOY #{deployNumber}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-bone-500" />
            <span className="font-sans text-sm text-bone-700">
              <strong className="text-ink-900 font-mono">
                {routesReindexed.toLocaleString()}
              </strong>
              {" / "}
              <strong className="text-ink-900 font-mono">
                {totalRoutes.toLocaleString()}
              </strong>
              {" routes reindexed"}
            </span>
          </div>
          <span
            className={clsx(
              "font-mono text-xl font-black tabular-nums",
              statusConfig.color,
            )}
          >
            {pct}%
          </span>
        </div>
        <div className="w-full bg-bone-300/40 h-3 rounded-sm overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-sm transition-all duration-700",
              status === "COMPLETE"
                ? "bg-patina-400"
                : status === "IN_PROGRESS"
                  ? "bg-marigold-400"
                  : "bg-steel-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ETA */}
      {estimatedMinutes !== undefined && status === "IN_PROGRESS" && (
        <div className="flex items-center gap-2 font-sans text-sm text-bone-700">
          <Clock className="w-4 h-4 text-bone-500" />
          <span>
            Estimated completion:{" "}
            <strong className="text-ink-900">{estimatedMinutes} minutes</strong>
          </span>
        </div>
      )}

      {status === "COMPLETE" && (
        <div className="flex items-center gap-2 font-sans text-sm text-patina-600 font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>
            All {totalRoutes} routes successfully reindexed. Health scores
            restored.
          </span>
        </div>
      )}
    </div>
  );
};
