"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError = false, className = "", rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={hasError || undefined}
      className={`w-full resize-none rounded-[var(--radius-small)] border bg-input px-4 py-3 text-body text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] placeholder:text-placeholder hover:border-border-strong focus:outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 ${
        hasError ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border"
      } ${className}`}
      {...props}
    />
  );
});

export default Textarea;
