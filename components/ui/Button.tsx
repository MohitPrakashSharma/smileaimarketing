"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-muted active:scale-[0.98]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-surface-muted active:scale-[0.98]",
  ghost: "text-foreground hover:bg-surface-muted active:scale-[0.98]",
  danger: "bg-danger text-white hover:bg-red-600 active:scale-[0.98]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, fullWidth = false, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-full px-6 font-body text-base font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </button>
  );
});

export default Button;
