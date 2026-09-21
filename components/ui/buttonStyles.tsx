/**
 * Server-safe half of the button system: class builder + arrow glyph. Kept
 * free of "use client" so server components (services, case studies, thank-you)
 * can style plain <Link>s without shipping the Button bundle.
 */

export type ButtonVariant = "primary" | "secondary" | "dark" | "light" | "text" | "outline" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const BASE =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 text-center rounded-full text-button transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

// min-height rather than a fixed height so a long label can wrap on very
// narrow screens (WCAG 1.4.10 reflow at 320px) instead of overflowing.
const SIZE: Record<ButtonSize, string> = {
  md: "min-h-[var(--button-height)] px-7 py-2",
  sm: "min-h-[var(--button-height-sm)] px-5 py-1.5",
};

/* Every variant shares one hover: the accent fill with a lifted shadow, the
   same move the header CTA makes (ink at rest → pink on hover). */
const HOVER = "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md";
const HOVER_PRIMARY = "hover:bg-primary-hover hover:shadow-md";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    `bg-primary text-primary-foreground shadow-sm ${HOVER_PRIMARY} active:bg-primary-pressed active:shadow-sm`,
  secondary:
    `border border-border-strong bg-transparent text-foreground ${HOVER} active:bg-primary-pressed`,
  dark:
    `bg-background-dark text-white shadow-sm ${HOVER} active:bg-primary-pressed`,
  light:
    `bg-white text-[var(--color-text)] shadow-sm ${HOVER} active:bg-primary-pressed`,
  text:
    "h-auto rounded-none px-0 text-primary-ink underline decoration-1 underline-offset-[6px] decoration-transparent hover:decoration-current active:translate-y-0",
  outline:
    `border border-border-strong bg-transparent text-foreground ${HOVER} active:bg-primary-pressed`,
  ghost:
    `text-foreground ${HOVER} active:bg-primary-pressed`,
  danger:
    "bg-error text-white hover:bg-[#b52626] active:bg-[#9a2020]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  const sizing = variant === "text" ? "" : SIZE[size];
  return `${BASE} ${sizing} ${VARIANT[variant]} ${fullWidth ? "w-full" : ""} ${className}`.replace(/\s+/g, " ").trim();
}

export function ButtonArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`arrow-shift h-[1.05em] w-[1.05em] shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 10h12M11 5l4.5 5-4.5 5" />
    </svg>
  );
}
