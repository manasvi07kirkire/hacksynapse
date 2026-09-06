import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("instrument-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-paper-200 px-5 py-4 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={cn(
        "font-display text-heading-m font-normal text-espresso-900",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-sm text-espresso-700", className)}>{children}</p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-paper-200 px-5 py-4 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Panel({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "muted" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-paper-200",
        variant === "default" && "bg-surface",
        variant === "muted" && "bg-paper-50",
        variant === "dark" &&
          "border-paper-200 bg-paper-50 text-espresso-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-paper-200 bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <h3 className="font-display text-heading-m text-espresso-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-espresso-700">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
