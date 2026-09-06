import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-paper-200 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="font-display text-display-l font-normal text-espresso-900 sm:text-display-xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-espresso-700 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="font-display text-heading-m text-espresso-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-espresso-700">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("instrument-card rounded-md px-4 py-3", className)}>
      <p className="mono-label text-bone-700">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-espresso-900 sm:text-3xl">
        {value}
      </p>
      {(hint || trend) && (
        <p
          className={cn(
            "mt-1 font-mono text-xs font-medium tabular-nums",
            trend === "up" && "text-patina-600",
            trend === "down" && "text-ember-600",
            !trend && "text-bone-700",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-md border border-paper-200 bg-darkSurface-code p-4 font-mono text-xs leading-relaxed text-bone-300",
        className,
      )}
    >
      {children}
    </pre>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-paper-200", className)} />;
}

export function SectionRule({ className }: { className?: string }) {
  return (
    <div
      className={cn("border-b-2 border-double border-paper-200 pb-0.5", className)}
      aria-hidden
    />
  );
}
