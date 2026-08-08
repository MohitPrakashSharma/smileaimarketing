"use client";

import { useEffect, useRef, useState } from "react";
import { IconMenuDots } from "@/components/icons";

export interface MenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "muted";
  disabled?: boolean;
}

interface ActionMenuProps {
  items: MenuItem[];
  align?: "left" | "right";
  ariaLabel?: string;
}

export function ActionMenu({ items, align = "right", ariaLabel = "Actions" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <IconMenuDots className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`animate-fade-in-down absolute top-9 z-40 w-44 rounded-xl border border-border bg-surface p-1 shadow-xl space-y-0.5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, index) => {
            let textColor = "text-foreground hover:bg-surface-muted";
            if (item.variant === "danger") {
              textColor = "text-rose-400 hover:bg-rose-500/10";
            } else if (item.variant === "success") {
              textColor = "text-emerald-400 hover:bg-emerald-500/10";
            } else if (item.variant === "muted") {
              textColor = "text-muted-foreground hover:bg-surface-muted hover:text-foreground";
            }

            return (
              <button
                key={index}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full min-h-[36px] items-center rounded-lg px-3 text-left text-xs font-semibold transition-colors disabled:opacity-50 ${textColor}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
