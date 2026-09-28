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
  // Positioned with viewport coordinates (`fixed`) so a scrolling table or card can't clip it;
  // it opens upward when there isn't room below the button.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const open = pos !== null;
  const setOpen = (next: boolean) => {
    if (!next) return setPos(null);
    const r = menuRef.current?.querySelector("button")?.getBoundingClientRect();
    if (!r) return;
    const menuHeight = items.length * 38 + 12;
    const flip = r.bottom + 4 + menuHeight > window.innerHeight && r.top - 4 - menuHeight > 0;
    setPos({
      ...(flip ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      ...(align === "right" ? { right: window.innerWidth - r.right } : { left: r.left }),
    });
  };
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPos(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPos(null);
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
        onClick={() => setOpen(!open)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <IconMenuDots className="h-4 w-4" />
      </button>

      {open && (
        <div style={pos} className="animate-fade-in-down fixed z-50 w-44 space-y-0.5 rounded-xl border border-border bg-surface p-1 shadow-xl">
          {items.map((item, index) => {
            let textColor = "text-foreground hover:bg-surface-muted";
            if (item.variant === "danger") {
              textColor = "text-danger hover:bg-danger/10";
            } else if (item.variant === "success") {
              textColor = "text-growth-ink hover:bg-growth/10";
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
