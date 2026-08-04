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
      className={`h-12 w-full rounded-lg border bg-background px-3.5 text-body text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
        hasError ? "border-danger focus:ring-danger" : "border-border"
      } ${className}`}
      {...props}
    />
  );
});

export default Input;
