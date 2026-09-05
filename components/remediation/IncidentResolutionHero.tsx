"use client";

import React from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  Zap,
  GitMerge,
} from "lucide-react";

interface IncidentResolutionHeroProps {
  incidentId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  elapsedSeconds: number;
  deployNumber: number;
  affectedRoutes: number;
  status: "DETECTING" | "REMEDIATING" | "VERIFIED";
}

export const IncidentResolutionHero: React.FC<IncidentResolutionHeroProps> = ({
  incidentId,
  severity,
  title,
  elapsedSeconds,
  deployNumber,
  affectedRoutes,
  status,
}) => {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const statusConfig = {
    DETECTING: {
      color: "text-ember-600",
      bg: "bg-ember-tint border-ember-600/40",
      icon: AlertTriangle,
      label: "DETECTING REGRESSION",
    },
    REMEDIATING: {
      color: "text-marigold-400",
      bg: "bg-marigold-tint border-marigold-400/40",
      icon: Activity,
      label: "REMEDIATING",
    },
    VERIFIED: {
      color: "text-patina-400",
      bg: "bg-patina-tint border-patina-400/40",
      icon: CheckCircle,
      label: "VERIFIED & CLOSED",
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-full bg-ink-800 border border-ink-700 rounded-md p-5 sm:p-7 flex flex-col gap-5 shadow-card">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Severity Badge */}
          <span
            className={clsx(
              "font-mono text-xs font-black px-3 py-1.5 rounded-sm border uppercase tracking-widest flex items-center gap-1.5",
              severity === "CRITICAL"
                ? "text-ember-400 bg-ember-tint border-ember-400/40"
                : "text-marigold-400 bg-marigold-tint border-marigold-400/40",
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {severity} INCIDENT
          </span>

          {/* Incident ID */}
          <span className="font-mono text-sm text-bone-500 bg-ink-850 px-3 py-1.5 rounded-sm border border-ink-700">
            INC-{incidentId}
          </span>

          {/* Deploy Tag */}
          <span className="font-mono text-sm font-semibold text-ember-400">
            DEPLOY #{deployNumber}
          </span>
        </div>

        {/* Status Pill */}
        <div
          className={clsx(
            "flex items-center gap-2 font-mono text-sm font-black px-4 py-2 rounded-sm border",
            statusConfig.color,
            statusConfig.bg,
          )}
        >
          <StatusIcon className="w-4 h-4" />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Incident Title */}
      <div className="flex flex-col gap-2">
        <h2 className="font-sans font-bold text-xl sm:text-2xl text-bone-100 leading-snug">
          {title}
        </h2>
        <p className="font-sans text-sm text-bone-400">
          Automated closed-loop remediation pipeline activated. Zero manual
          intervention required.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Elapsed Time */}
        <div className="bg-ink-850 border border-ink-700 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <Clock className="w-4 h-4 text-bone-500" />
          <span className="font-display font-black text-2xl sm:text-3xl text-ember-400 tabular-nums">
            {timeStr}
          </span>
          <span className="font-mono text-2xs text-bone-500 uppercase tracking-wider">
            ELAPSED
          </span>
        </div>

        {/* Affected Routes */}
        <div className="bg-ink-850 border border-ink-700 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <Zap className="w-4 h-4 text-bone-500" />
          <span className="font-display font-black text-2xl sm:text-3xl text-ember-400 tabular-nums">
            {affectedRoutes}
          </span>
          <span className="font-mono text-2xs text-bone-500 uppercase tracking-wider">
            ROUTES AFFECTED
          </span>
        </div>

        {/* Deploy Number */}
        <div className="bg-ink-850 border border-ink-700 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <GitMerge className="w-4 h-4 text-bone-500" />
          <span className="font-display font-black text-2xl sm:text-3xl text-bone-100 tabular-nums">
            #{deployNumber}
          </span>
          <span className="font-mono text-2xs text-bone-500 uppercase tracking-wider">
            DEPLOY
          </span>
        </div>
      </div>
    </div>
  );
};
