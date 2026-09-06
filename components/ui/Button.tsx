import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ember-500 text-white hover:bg-ember-400 active:bg-ember-600 shadow-cta disabled:shadow-none border border-ember-600 font-mono uppercase tracking-wider text-xs font-bold",
  secondary:
    "bg-espresso-900 text-bone-100 border border-espresso-900 hover:bg-espresso-700",
  outline:
    "border border-paper-200 bg-surface text-espresso-900 hover:bg-paper-50 hover:border-paper-200",
  ghost:
    "text-espresso-700 hover:bg-paper-100 hover:text-espresso-900 active:bg-paper-200",
  danger:
    "border border-ember-600 text-ember-600 bg-transparent hover:bg-ember-soft",
  success:
    "bg-patina-600 text-white border border-patina-600 hover:bg-patina-500 active:bg-patina-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 min-h-touch px-3 gap-1.5 rounded-sm",
  md: "h-10 min-h-touch px-4 gap-2 rounded-md",
  lg: "h-11 min-h-touch px-5 gap-2 rounded-md",
  icon: "h-10 w-10 min-h-touch p-0 rounded-md",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-[160ms] ease-instrument focus-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" ? "font-mono" : "font-semibold text-sm",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  ),
);
Button.displayName = "Button";

export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  className,
  variant = "outline",
  size = "md",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center transition-all duration-[160ms] ease-instrument focus-ring no-underline text-sm font-semibold",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
