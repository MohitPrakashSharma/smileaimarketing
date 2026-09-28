"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ButtonArrow, buttonClasses } from "@/components/ui/buttonStyles";
import { IconChevronDown, IconChevronRight } from "@/components/icons";
import { SOLUTIONS_TABS } from "@/components/nav/solutionsMenu";

/**
 * Solutions mega menu (desktop), laid out like HubSpot's: a vertical rail of
 * categories on the left, and a three-column grid of grouped links on the
 * right that swaps as the category changes.
 *
 * It is a disclosure containing a tab set, not a `menu` role — the contents
 * are ordinary navigation links, so a screen reader gets links rather than
 * menu items. The rail is a real vertical tablist: Arrow Up/Down move between
 * categories, Home/End jump to the ends, and only the selected tab is in the
 * tab sequence, so Tab from the rail lands in the panel.
 *
 * Opens on hover (with a grace period so the pointer can travel from trigger
 * to panel), on click, and from the keyboard; closes on Escape (focus returns
 * to the trigger), on an outside click, when focus leaves, and after any link.
 */

const HOVER_CLOSE_DELAY = 160;
/** Long enough to feel deliberate, short enough not to lag the pointer. */
const RAIL_HOVER_DELAY = 90;

export default function SolutionsMenu({
  current,
  label = "Solutions",
  navLinkClass,
  underline,
}: {
  current: boolean;
  label?: string;
  navLinkClass: (active: boolean) => string;
  underline: (active: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const railTimer = useRef<number | null>(null);
  const baseId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }, [cancelClose]);

  const close = useCallback(
    (refocus = false) => {
      cancelClose();
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    },
    [cancelClose],
  );

  // Hovering a category switches to it, but only after a beat — otherwise
  // crossing the rail on the way to the grid flickers through every category.
  const hoverTab = useCallback((index: number) => {
    if (railTimer.current) window.clearTimeout(railTimer.current);
    railTimer.current = window.setTimeout(() => setActiveTab(index), RAIL_HOVER_DELAY);
  }, []);
  const cancelHoverTab = useCallback(() => {
    if (railTimer.current) window.clearTimeout(railTimer.current);
    railTimer.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, close]);

  useEffect(
    () => () => {
      cancelClose();
      cancelHoverTab();
    },
    [cancelClose, cancelHoverTab],
  );

  const focusTab = (index: number) => {
    setActiveTab(index);
    railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
  };

  const onRailKeyDown = (e: React.KeyboardEvent) => {
    const last = SOLUTIONS_TABS.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusTab(activeTab === last ? 0 : activeTab + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusTab(activeTab === 0 ? last : activeTab - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(last);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      panelRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-panel-${activeTab}`)} a`)?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className="static"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${baseId}-panel-wrap`}
        aria-current={current ? "page" : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            window.setTimeout(() => railRef.current?.querySelector<HTMLElement>('[role="tab"]')?.focus(), 0);
          }
        }}
        className={`${navLinkClass(current || open)} cursor-pointer`}
      >
        {label}
        <IconChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)] ${open ? "rotate-180" : ""}`}
        />
        {underline(current || open)}
      </button>

      {/* Full-width panel under the header; hidden rather than unmounted so aria-controls always resolves. */}
      <div
        id={`${baseId}-panel-wrap`}
        ref={panelRef}
        hidden={!open}
        aria-label={label}
        className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-lg"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="container-site grid gap-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          {/* Left rail */}
          <div
            ref={railRef}
            role="tablist"
            aria-orientation="vertical"
            aria-label={`${label} categories`}
            onKeyDown={onRailKeyDown}
            onMouseLeave={cancelHoverTab}
            className="flex flex-col gap-1 border-border-subtle py-6 lg:border-r lg:pr-6"
          >
            {SOLUTIONS_TABS.map((tab, i) => {
              const selected = i === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${i}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(i)}
                  onMouseEnter={() => hoverTab(i)}
                  onFocus={() => setActiveTab(i)}
                  className={`flex items-center justify-between gap-3 rounded-[var(--radius-medium)] px-4 py-3 text-left font-copy text-[0.9375rem] font-medium transition-colors duration-[var(--duration-fast)] ${
                    selected
                      ? "bg-background-alt text-primary-ink"
                      : "text-foreground-secondary hover:bg-background-alt hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <IconChevronRight className={`h-4 w-4 shrink-0 ${selected ? "opacity-100" : "opacity-40"}`} />
                </button>
              );
            })}
          </div>

          {/* Right panel */}
          <div className="py-6 lg:pl-10">
            {SOLUTIONS_TABS.map((tab, i) => (
              <div
                key={tab.id}
                role="tabpanel"
                id={`${baseId}-panel-${i}`}
                aria-labelledby={`${baseId}-tab-${i}`}
                hidden={i !== activeTab}
              >
                <p className="text-eyebrow text-muted-foreground">{tab.blurb}</p>
                <div className="mt-5 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                  {tab.groups.map((group) => (
                    <div key={group.heading}>
                      <p className="font-display text-[0.9375rem] font-bold tracking-[-0.01em] text-foreground">
                        {group.heading}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {group.entries.map((entry) => (
                          <li key={`${entry.title}-${entry.href}`}>
                            <Link
                              href={entry.href}
                              onClick={() => close()}
                              className="group/item block rounded-[var(--radius-medium)] px-3 py-2.5 -mx-3 transition-colors duration-[var(--duration-fast)] hover:bg-background-alt focus-visible:bg-background-alt"
                            >
                              <span className="block font-copy text-[0.9375rem] font-medium text-foreground group-hover/item:text-primary-ink">
                                {entry.title}
                              </span>
                              <span className="mt-0.5 block text-body-small text-muted-foreground">{entry.detail}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Closing strip: the two actions the menu should always offer. */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-subtle pt-5">
              <Link
                href="/free-dental-audit"
                onClick={() => close()}
                className={buttonClasses({ size: "sm" })}
              >
                <span>Get Your Free Website Audit</span>
                <ButtonArrow />
              </Link>
              <Link
                href="/book-consultation"
                onClick={() => close()}
                className="inline-flex items-center gap-1.5 text-body-small font-medium text-primary-ink"
              >
                Or book a consultation
                <ButtonArrow className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
