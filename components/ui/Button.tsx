"use client";

import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";

/**
 * Button system.
 *
 *  primary   — accent fill, the one action we want on a screen
 *  secondary — outlined on light surfaces
 *  dark      — ink fill, for light bands where the accent would be too loud
 *  light     — white fill, for use on the dark band
 *  text      — underlined text link with an arrow, no chrome
 *
 *  `outline`, `ghost` and `danger` are kept for the admin/legacy call sites.
 *
 * `buttonClasses()` is exported so anchors can share the exact same styling
 * (`ButtonLink` below wraps it). `arrow` appends a trailing arrow that eases
 * right on hover/focus via the global `.arrow-shift` rule.
 */

export { buttonClasses, ButtonArrow } from "./buttonStyles";
export type { ButtonVariant, ButtonSize } from "./buttonStyles";
import { buttonClasses, ButtonArrow, type ButtonVariant, type ButtonSize } from "./buttonStyles";

function Spinner() {
  return (
    <span
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  arrow?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, arrow = false, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <Spinner />}
      <span>{children}</span>
      {arrow && !loading && <ButtonArrow />}
    </button>
  );
});

export default Button;

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  arrow?: boolean;
};

/** Anchor styled exactly like <Button>. Use for navigation; keep <Button> for actions. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = "primary", size = "md", fullWidth = false, arrow = false, className = "", children, ...props },
  ref
) {
  return (
    <a ref={ref} className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      <span>{children}</span>
      {arrow && <ButtonArrow />}
    </a>
  );
});
