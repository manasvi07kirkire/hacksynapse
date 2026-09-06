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
      bg: "bg-ember-soft border-ember-600/30",
      icon: AlertTriangle,
      label: "DETECTING REGRESSION",
    },
    REMEDIATING: {
      color: "text-marigold-600",
      bg: "bg-marigold-soft border-marigold-600/30",
      icon: Activity,
      label: "REMEDIATING",
    },
    VERIFIED: {
      color: "text-patina-600",
      bg: "bg-patina-soft border-patina-600/30",
      icon: CheckCircle,
      label: "VERIFIED & CLOSED",
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex w-full flex-col gap-5 rounded-lg border border-paper-200 bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={clsx(
              "font-mono text-xs font-black px-3 py-1.5 rounded-sm border uppercase tracking-widest flex items-center gap-1.5",
              severity === "CRITICAL"
                ? "text-ember-600 bg-ember-soft border-ember-600/30"
                : "text-marigold-600 bg-marigold-soft border-marigold-600/30",
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {severity} INCIDENT
          </span>

          <span className="font-mono text-sm text-bone-700 bg-paper-50 px-3 py-1.5 rounded-sm border border-paper-200">
            INC-{incidentId}
          </span>

          <span className="font-mono text-sm font-semibold text-ember-600">
            DEPLOY #{deployNumber}
          </span>
        </div>

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

      <div className="flex flex-col gap-2">
        <h2 className="font-sans font-bold text-xl sm:text-2xl text-espresso-900 leading-snug">
          {title}
        </h2>
        <p className="font-sans text-sm text-espresso-700">
          Automated closed-loop remediation pipeline activated. Zero manual
          intervention required.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-paper-50 border border-paper-200 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <Clock className="w-4 h-4 text-bone-700" />
          <span className="font-display font-black text-2xl sm:text-3xl text-ember-600 tabular-nums">
            {timeStr}
          </span>
          <span className="font-mono text-2xs text-bone-700 uppercase tracking-wider">
            ELAPSED
          </span>
        </div>

        <div className="bg-paper-50 border border-paper-200 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <Zap className="w-4 h-4 text-bone-700" />
          <span className="font-display font-black text-2xl sm:text-3xl text-ember-600 tabular-nums">
            {affectedRoutes}
          </span>
          <span className="font-mono text-2xs text-bone-700 uppercase tracking-wider">
            ROUTES AFFECTED
          </span>
        </div>

        <div className="bg-paper-50 border border-paper-200 rounded-sm p-4 flex flex-col gap-1.5 items-center justify-center text-center">
          <GitMerge className="w-4 h-4 text-bone-700" />
          <span className="font-display font-black text-2xl sm:text-3xl text-espresso-900 tabular-nums">
            #{deployNumber}
          </span>
          <span className="font-mono text-2xs text-bone-700 uppercase tracking-wider">
            DEPLOY
          </span>
        </div>
      </div>
    </div>
  );
};
