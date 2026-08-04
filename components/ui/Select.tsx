"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError = false, className = "", children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={hasError || undefined}
      className={`h-12 w-full rounded-lg border bg-background px-3.5 text-body text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
        hasError ? "border-danger focus:ring-danger" : "border-border"
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
