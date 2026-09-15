"use client";

import { InputHTMLAttributes, forwardRef } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={`h-[var(--control-height)] w-full rounded-[var(--radius-small)] border bg-input px-4 text-body text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] placeholder:text-placeholder hover:border-border-strong focus:outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 ${
        hasError ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border"
      } ${className}`}
      {...props}
    />
  );
});

export default Input;
