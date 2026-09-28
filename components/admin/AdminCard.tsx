import React from "react";

type IconComponent = (props: { className?: string }) => React.ReactElement;

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  /** Fully custom header content (left side). Takes precedence over title/subtitle/icon. */
  header?: React.ReactNode;
  title?: string;
  subtitle?: React.ReactNode;
  /** Outlined icon circle shown before the title. */
  icon?: IconComponent;
  count?: number;
  /** Right side of the header — usually IconButtons or a text link. */
  action?: React.ReactNode;
  /** Drop body padding for edge-to-edge lists and tables. */
  flush?: boolean;
}

/** Outlined circle holding a line icon — the card-header and row marker. */
export function IconCircle({ Icon, className = "" }: { Icon: IconComponent; className?: string }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground ${className}`}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/**
 * White card with a hairline header row: [icon circle] Title … [round actions].
 * The header divider runs edge to edge; the body carries its own padding.
 */
export function AdminCard({ children, className = "", header, title, subtitle, icon, count, action, flush = false }: AdminCardProps) {
  const hasHeader = header || title;
  return (
    <section className={`admin-card overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border px-5 py-3">
          {header ?? (
            <div className="flex min-w-0 items-center gap-3">
              {icon && <IconCircle Icon={icon} />}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[15px] font-semibold text-foreground">{title}</h2>
                  {typeof count === "number" && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{count}</span>
                  )}
                </div>
                {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
              </div>
            </div>
          )}
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}
