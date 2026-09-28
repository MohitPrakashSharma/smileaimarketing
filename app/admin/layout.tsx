"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import {
  IconGrid,
  IconStorefront,
  IconTarget,
  IconChat,
  IconCalendarCheck,
  IconClipboardCheck,
  IconTrendingUp,
  IconGauge,
  IconLink,
  IconClock,
  IconSettings,
  IconLogout,
  IconSearch,
  IconMenu,
  IconClose,
  IconChevronDown,
  IconSidebar,
} from "@/components/icons";

const SIDEBAR_KEY = "admin.sidebarCollapsed";

type NavItem = {
  label: string;
  path: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** Extra routes that should light this item up (detail pages, aliases). */
  match?: (pathname: string) => boolean;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", path: "/admin", Icon: IconGrid },
      { label: "Campaigns", path: "/admin/campaigns", Icon: IconTarget },
      { label: "Leads", path: "/admin/businesses", Icon: IconStorefront },
      { label: "Outreach", path: "/admin/outreach", Icon: IconChat },
      {
        label: "Meetings",
        path: "/admin/meetings",
        Icon: IconCalendarCheck,
        match: (p) => p.startsWith("/admin/appointments"),
      },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Audits", path: "/admin/audits", Icon: IconClipboardCheck },
      { label: "Pipeline", path: "/admin/pipeline", Icon: IconTrendingUp },
      { label: "Analytics", path: "/admin/analytics", Icon: IconGauge },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Integrations", path: "/admin/integrations", Icon: IconLink },
      { label: "Automations", path: "/admin/automations", Icon: IconClock },
      { label: "Settings", path: "/admin/settings", Icon: IconSettings },
    ],
  },
];

const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function isItemActive(item: NavItem, pathname: string) {
  if (item.path === "/admin") return pathname === "/admin";
  return pathname === item.path || pathname.startsWith(`${item.path}/`) || !!item.match?.(pathname);
}

/*
 * Shell: one white "L" (header across the top, sidebar down the left, no divider
 * between them) framing a soft-grey content panel. On desktop the panel is fixed
 * and scrolls on its own, so its rounded top-left corner — where header and
 * sidebar meet — stays put while content moves underneath.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/admin/businesses?q=${encodeURIComponent(q)}` : "/admin/businesses");
  };

  const pageTitle = NAV_ITEMS.find((item) => isItemActive(item, pathname))?.label ?? "Command Centre";

  // `compact` is the collapsed desktop rail: icons only, labels move to tooltips.
  const renderNav = (compact: boolean) => (
    <nav aria-label="Admin" className={`space-y-6 pb-6 pt-2 ${compact ? "px-3" : "px-4"}`}>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          {compact ? (
            <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-border" />
          ) : (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">{section.title}</p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = isItemActive(item, pathname);
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setDrawerOpen(false)}
                    aria-label={compact ? item.label : undefined}
                    title={compact ? item.label : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-full text-sm font-semibold ${compact ? "mx-auto w-11 justify-center" : "px-4"} transition-colors duration-[var(--duration-normal)] ${
                      active
                        ? "bg-background-dark text-white shadow-sm"
                        : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    <item.Icon className="h-[18px] w-[18px] shrink-0" />
                    {!compact && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="ui-copy min-h-screen bg-surface font-body text-foreground">
      {/* Header — spans the full width; its left cell is the sidebar's top, so the two read as one surface */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[72px] items-center bg-surface">
        <div
          className={`flex h-full shrink-0 items-center gap-2 px-4 transition-[width] duration-[var(--duration-normal)] ${
            collapsed ? "lg:w-[88px] lg:justify-center lg:px-0" : "lg:w-[264px] lg:pl-7 lg:pr-2"
          }`}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-surface-muted lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          {!collapsed && (
            <Link href="/admin" className="hidden whitespace-nowrap rounded-sm lg:block" aria-label="Smile AI Marketing admin — overview">
              <Wordmark full className="text-[1.1rem]" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:flex ${
              collapsed ? "" : "ml-auto"
            }`}
          >
            <IconSidebar className="h-5 w-5" />
          </button>
          <p className="truncate font-display text-lg font-semibold lg:hidden">{pageTitle}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-4 sm:pr-6 lg:pl-2">
          <form onSubmit={handleSearch} role="search" className="relative hidden w-full max-w-sm md:block">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search practices, cities, domains…"
              aria-label="Search practices"
              className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/admin/campaigns"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-background-dark px-5 text-sm font-semibold text-white transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span aria-hidden className="text-base leading-none">+</span>
              <span className="hidden sm:inline">New Campaign</span>
            </Link>

            <span aria-hidden className="mx-2 hidden h-7 w-px bg-border sm:block" />

            <Link
              href="/admin/integrations"
              aria-label="Integrations"
              title="Integrations"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-surface-muted sm:flex"
            >
              <IconLink className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/admin/settings"
              aria-label="Settings"
              title="Settings"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-surface-muted sm:flex"
            >
              <IconSettings className="h-[18px] w-[18px]" />
            </Link>

            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Account menu"
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">A</span>
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-semibold text-foreground">Admin</span>
                  <span className="block text-[11px] text-muted-foreground">Superadmin</span>
                </span>
                <IconChevronDown
                  className={`hidden h-4 w-4 text-muted-foreground transition-transform xl:block ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userMenuOpen && (
                <div className="animate-fade-in-down absolute right-0 top-14 z-50 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground">hello@smileaimarketing.com</p>
                  <div className="my-1 border-t border-border" />
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-surface-muted"
                  >
                    <IconSettings className="h-4 w-4 text-muted-foreground" /> Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-danger hover:bg-danger/10"
                  >
                    <IconLogout className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar — continues the header surface; no border between them */}
      <aside
        className={`fixed bottom-0 left-0 top-[72px] z-30 hidden overflow-y-auto overflow-x-hidden bg-surface transition-[width] duration-[var(--duration-normal)] lg:block ${
          collapsed ? "w-[88px]" : "w-[264px]"
        }`}
      >
        {renderNav(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="animate-fade-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex h-[72px] shrink-0 items-center justify-between px-6">
              <Wordmark full className="text-[1.2rem]" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNav(false)}</div>
          </aside>
        </div>
      )}

      {/* Content panel — inset into the white shell, curved where header meets sidebar */}
      <main className={`min-h-screen bg-background-alt pt-[72px] lg:fixed lg:bottom-0 lg:right-0 lg:transition-[left] lg:duration-[var(--duration-normal)] ${collapsed ? "lg:left-[88px]" : "lg:left-[264px]"} lg:top-[72px] lg:min-h-0 lg:overflow-y-auto lg:rounded-tl-[28px] lg:pt-0`}>
        <div className="px-4 py-5 sm:px-6 lg:px-6 lg:py-6 2xl:px-8">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm shadow-xs">
            <IconGrid className="h-4 w-4 text-muted-foreground" />
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            <span aria-hidden className="text-border-strong">/</span>
            <span aria-current="page" className="font-semibold text-foreground">
              {pageTitle}
            </span>
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}
