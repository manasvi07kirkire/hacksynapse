import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm text-espresso-900 transition-colors duration-[160ms] placeholder:text-bone-700 focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-ember-500"
          : "border-paper-200 hover:border-paper-200 focus-visible:border-ember-500/50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[100px] w-full resize-y rounded-md border bg-surface px-3 py-2.5 text-sm text-espresso-900 transition-colors duration-[160ms] placeholder:text-bone-700 focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-ember-500"
          : "border-paper-200 hover:border-paper-200 focus-visible:border-ember-500/50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full appearance-none rounded-md border bg-surface bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236E6353%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat px-3 py-2 pr-9 text-sm text-espresso-900 transition-colors duration-[160ms] focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-ember-500"
          : "border-paper-200 hover:border-paper-200 focus-visible:border-ember-500/50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  hint?: string;
}

export function Label({
  className,
  children,
  required,
  hint,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-sm font-medium text-espresso-700",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1">
        {children}
        {required && <span className="text-ember-600">*</span>}
      </span>
      {hint && (
        <span className="text-xs font-normal text-bone-700">{hint}</span>
      )}
    </label>
  );
}

export function FieldGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>{children}</div>
  );
}

export function FormRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
  );
}
