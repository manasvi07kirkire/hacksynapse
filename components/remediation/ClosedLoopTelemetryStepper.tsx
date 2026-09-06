"use client";

import React from "react";
import clsx from "clsx";
import {
  CheckCircle,
  Clock,
  Activity,
  GitMerge,
  Search,
  RefreshCw,
} from "lucide-react";

interface TelemetryStep {
  step: number;
  label: string;
  description: string;
  timing: string;
  status: "done" | "active" | "pending";
  icon?: React.ElementType;
}

interface ClosedLoopTelemetryStepperProps {
  steps: TelemetryStep[];
  title?: string;
}

const DEFAULT_STEPS: TelemetryStep[] = [
  {
    step: 1,
    label: "REGRESSION DETECTED",
    description:
      "AST parser flagged missing canonical emitter in ProductMetadata.tsx. 127 routes affected.",
    timing: "0.8ms",
    status: "done",
    icon: Activity,
  },
  {
    step: 2,
    label: "ROOT CAUSE ATTRIBUTED",
    description:
      "Git blame isolated commit abc1234. Deterministic evidence: 0 regressions in deploy #183.",
    timing: "1.2ms",
    status: "done",
    icon: Search,
  },
  {
    step: 3,
    label: "PATCH GENERATED",
    description:
      "Tier-A auto-fix PR #185 created. Restores alternates.canonical across all product routes.",
    timing: "340ms",
    status: "done",
    icon: GitMerge,
  },
  {
    step: 4,
    label: "MERGE APPLIED",
    description:
      "PR #185 merged to main. CI/CD pipeline triggered. Build: PASSED.",
    timing: "12s",
    status: "active",
    icon: GitMerge,
  },
  {
    step: 5,
    label: "RECRAWL & VERIFY",
    description:
      "Googlebot + AI engine re-verification in progress across all 127 routes.",
    timing: "~4min",
    status: "pending",
    icon: RefreshCw,
  },
];

export const ClosedLoopTelemetryStepper: React.FC<
  ClosedLoopTelemetryStepperProps
> = ({ steps = DEFAULT_STEPS, title = "CLOSED-LOOP REMEDIATION PIPELINE" }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b-2 border-bone-300 pb-3">
        <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
          {title}
        </span>
        <span className="font-mono text-xs font-bold text-patina-600 bg-patina-400/15 px-2.5 py-0.5 rounded-sm border border-patina-400/30">
          AUTOMATED
        </span>
      </div>

      <div className="relative flex flex-col gap-0">
        {steps.map((step, idx) => {
          const Icon = step.icon ?? CheckCircle;
          const isDone = step.status === "done";
          const isActive = step.status === "active";
          const isPending = step.status === "pending";
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.step} className="relative flex gap-4 pb-4">
              {/* Vertical Line */}
              {!isLast && (
                <div
                  className={clsx(
                    "absolute left-[18px] top-9 bottom-0 w-0.5",
                    isDone ? "bg-patina-400/50" : "bg-bone-300",
                  )}
                />
              )}

              {/* Step Icon */}
              <div
                className={clsx(
                  "shrink-0 w-9 h-9 rounded-sm flex items-center justify-center border-2 z-10",
                  isDone
                    ? "bg-patina-soft border-patina-600 text-patina-600"
                    : isActive
                      ? "bg-ember-soft border-ember-600 text-ember-600 node-active"
                      : "bg-bone-300/30 border-bone-300 text-bone-500",
                )}
              >
                {isDone ? (
                  <CheckCircle className="w-4.5 h-4.5" />
                ) : (
                  <Icon className="w-4.5 h-4.5" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs font-bold text-bone-500 uppercase tracking-widest">
                      STEP {step.step}
                    </span>
                    <span
                      className={clsx(
                        "font-mono text-xs font-black uppercase tracking-wider",
                        isDone
                          ? "text-patina-400"
                          : isActive
                            ? "text-ember-400"
                            : "text-bone-500",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-bone-500" />
                    <span className="font-mono text-xs font-bold text-ink-900 tabular-nums">
                      {step.timing}
                    </span>
                  </div>
                </div>
                <p className="font-sans text-sm text-bone-700 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
