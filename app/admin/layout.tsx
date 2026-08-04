"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconGrid,
  IconStorefront,
  IconTarget,
  IconChat,
  IconCalendarCheck,
  IconTrendingUp,
  IconSettings,
  IconLogout,
  IconMenuDots,
  IconSearch,
  IconCheck,
} from "@/components/icons";

const NAV_ITEMS = [
  { label: "Overview", path: "/admin", Icon: IconGrid },
  { label: "Campaigns", path: "/admin/campaigns", Icon: IconTarget },
  { label: "Businesses", path: "/admin/businesses", Icon: IconStorefront },
  { label: "Audits", path: "/admin/audits", Icon: IconTarget },
  { label: "Outreach", path: "/admin/outreach", Icon: IconChat },
  { label: "Meetings", path: "/admin/meetings", Icon: IconCalendarCheck },
  { label: "Pipeline", path: "/admin/pipeline", Icon: IconTrendingUp },
  { label: "Integrations", path: "/admin/integrations", Icon: IconCheck },
  { label: "Automations", path: "/admin/automations", Icon: IconSettings },
];

const MOBILE_NAV_ITEMS = [
  { label: "Overview", path: "/admin", Icon: IconGrid },
  { label: "Campaigns", path: "/admin/campaigns", Icon: IconTarget },
  { label: "Leads", path: "/admin/businesses", Icon: IconStorefront },
  { label: "Outreach", path: "/admin/outreach", Icon: IconChat },
];

const MORE_ITEMS = [
  { label: "Audits", path: "/admin/audits", Icon: IconTarget },
  { label: "Meetings", path: "/admin/meetings", Icon: IconCalendarCheck },
  { label: "Pipeline", path: "/admin/pipeline", Icon: IconTrendingUp },
  { label: "Integrations", path: "/admin/integrations", Icon: IconCheck },
  { label: "Automations", path: "/admin/automations", Icon: IconSettings },
  { label: "Settings", path: "/admin/settings", Icon: IconSettings },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/campaigns": "Campaigns",
  "/admin/businesses": "Businesses",
  "/admin/audits": "Audits",
  "/admin/outreach": "Outreach",
  "/admin/meetings": "Meetings",
  "/admin/appointments": "Meetings",
  "/admin/pipeline": "Pipeline",
  "/admin/integrations": "Integrations",
  "/admin/automations": "Automations",
  "/admin/settings": "Settings",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const showPrimaryAction = pathname !== "/admin/campaigns";
  const pageTitle = PAGE_TITLES[pathname] || "Command Centre";

  return (
    <div className="theme-navy min-h-screen bg-background font-body text-foreground">
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-surface/95 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6">
          <Link href="/admin" className="shrink-0 text-lg font-bold tracking-tight text-foreground">
            Smile AI<span className="text-primary">.</span>
          </Link>

          {/* Test Mode Indicator */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            TEST MODE
          </div>

          <nav aria-label="Admin primary" className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path || (item.path === "/admin/meetings" && pathname === "/admin/appointments");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <item.Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 items-center xl:flex">
            <div className="relative w-full">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search businesses..."
                aria-label="Search businesses"
                className="h-9 w-full rounded-full border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          {showPrimaryAction && (
            <Link
              href="/admin/campaigns"
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              + Campaign
            </Link>
          )}

          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-foreground transition-colors hover:bg-primary/15"
              aria-label="Account menu"
            >
              A
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-11 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
                <p className="truncate px-3 py-2 text-metadata text-muted-foreground">
                  admin@smileaimarketing.com
                </p>
                <Link
                  href="/admin/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-body-small font-semibold text-foreground hover:bg-surface-muted"
                >
                  <IconSettings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-small font-semibold text-danger hover:bg-danger/10"
                >
                  <IconLogout className="h-4 w-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-body font-bold text-foreground">{pageTitle}</h1>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
            TEST MODE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showPrimaryAction && (
            <Link
              href="/admin/campaigns"
              className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-metadata font-bold text-primary-foreground"
            >
              + Campaign
            </Link>
          )}
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground"
          >
            <IconLogout className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Admin primary mobile"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
              moreOpen || MORE_ITEMS.some((i) => i.path === pathname) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <IconMenuDots className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
          <div className="pb-safe animate-fade-in-up fixed inset-x-0 bottom-16 z-50 rounded-t-2xl border-t border-border bg-surface p-4 shadow-xl lg:hidden">
            <div className="space-y-1">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-body-small font-semibold text-foreground hover:bg-surface-muted"
                >
                  <item.Icon className="h-5 w-5 text-primary" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMoreOpen(false);
                  handleLogout();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-body-small font-semibold text-danger hover:bg-danger/10"
              >
                <IconLogout className="h-5 w-5" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
