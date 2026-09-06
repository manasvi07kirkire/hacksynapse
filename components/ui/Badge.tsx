import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-paper-100 text-espresso-700 border-paper-200",
  success: "bg-patina-soft text-patina-600 border-patina-500/30",
  warning: "bg-marigold-soft text-marigold-600 border-marigold-400/30",
  danger: "bg-ember-soft text-ember-600 border-ember-500/30",
  info: "bg-paper-50 text-steel-400 border-paper-200",
  neutral: "bg-surface text-bone-700 border-paper-200",
};

export function Badge({
  className,
  variant = "default",
  children,
  dot,
}: {
  className?: string;
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.6875rem] font-bold uppercase tracking-wider",
        badgeVariants[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-patina-500",
            variant === "warning" && "bg-marigold-400",
            variant === "danger" && "bg-ember-500",
            variant === "info" && "bg-steel-400",
            (variant === "default" || variant === "neutral") && "bg-bone-500",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toUpperCase();
  let variant: BadgeVariant = "neutral";
  if (
    ["HEALTHY", "PASS", "COMPLETE", "REMEDIATED", "VERIFIED"].includes(
      normalized,
    )
  )
    variant = "success";
  else if (
    ["DEGRADED", "OPEN", "RUNNING", "QUEUED", "WATCHING"].includes(normalized)
  )
    variant = "warning";
  else if (["FAILED", "CRITICAL", "REGRESSION", "ERROR"].includes(normalized))
    variant = "danger";

  return (
    <Badge variant={variant} dot className={className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border border-paper-200 border-l-[3px] border-l-steel-400 bg-paper-50 text-espresso-700",
    success: "success-region border border-paper-200 text-patina-600",
    warning: "warning-region border border-paper-200 text-marigold-600",
    error: "alert-region border border-paper-200 text-ember-600",
  };

  return (
    <div
      role="alert"
      className={cn("rounded-md px-4 py-3 text-sm", styles[variant], className)}
    >
      {title && (
        <p className="mb-1 font-semibold text-espresso-900">{title}</p>
      )}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
