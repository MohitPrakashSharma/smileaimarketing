import React from "react";

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  title?: string;
  count?: number;
  action?: React.ReactNode;
}

export function AdminCard({ children, className = "", header, title, count, action }: AdminCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors ${className}`}>
      {(header || title) && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          {header ? (
            header
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
              {typeof count === "number" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {count}
                </span>
              )}
            </div>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
