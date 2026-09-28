import React from "react";
import Link from "next/link";

type IconComponent = (props: { className?: string }) => React.ReactElement;

type IconButtonProps = {
  Icon: IconComponent;
  label: string;
  /** Renders a link instead of a button. External URLs open in a new tab. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-haspopup">;

const base =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

/** Round outlined icon action — the card-header "edit / open / more" control. */
export function IconButton({ Icon, label, href, onClick, disabled, className = "", ...aria }: IconButtonProps) {
  const icon = <Icon className="h-[18px] w-[18px]" />;
  if (href) {
    const external = /^https?:\/\//.test(href) || href.startsWith("/api/") || href.startsWith("/audit/");
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={`${base} ${className}`}>
        {icon}
      </a>
    ) : (
      <Link href={href} aria-label={label} title={label} className={`${base} ${className}`}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`${base} ${className}`} {...aria}>
      {icon}
    </button>
  );
}
