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
      className={`h-[var(--control-height)] w-full rounded-[var(--radius-small)] border bg-input px-4 text-body text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] hover:border-border-strong focus:outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c6f79' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:16px_16px] bg-[position:right_0.9rem_center] bg-no-repeat pr-10 ${
        hasError ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border"
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
