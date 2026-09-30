"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import {
  IconGrid,
  IconUsers,
  IconBox,
  IconReceipt,
  IconMegaphone,
  IconUser,
  IconSettings,
  IconLogout,
  IconMenu,
  IconClose,
  IconChevronDown,
  IconSidebar,
} from "@/components/icons";
import { ClinicSessionContext, roleAtLeast, type ClinicRole, type ClinicSessionUser } from "@/components/clinic/ClinicSessionContext";

const SIDEBAR_KEY = "clinic.sidebarCollapsed";
const PUBLIC_PATHS = ["/clinic/login", "/clinic/accept-invite"];

type NavItem = {
  label: string;
  path: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** Lowest role that sees this item. */
  minRole?: ClinicRole;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Practice",
    items: [
      { label: "Overview", path: "/clinic", Icon: IconGrid },
      { label: "Patients", path: "/clinic/patients", Icon: IconUsers },
      { label: "Inventory", path: "/clinic/inventory", Icon: IconBox },
      { label: "Accounting", path: "/clinic/accounting", Icon: IconReceipt, minRole: "MANAGER" },
    ],
  },
  {
    title: "Marketing",
    items: [{ label: "Social media", path: "/clinic/social", Icon: IconMegaphone }],
  },
  {
    title: "Clinic",
    items: [
      { label: "Team", path: "/clinic/team", Icon: IconUser, minRole: "OWNER" },
      { label: "Settings", path: "/clinic/settings", Icon: IconSettings, minRole: "OWNER" },
    ],
  },
];

const ROLE_LABEL: Record<ClinicRole, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

function isItemActive(item: NavItem, pathname: string) {
  if (item.path === "/clinic") return pathname === "/clinic";
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/* Same white-L shell as the superadmin console, with the clinic's own navigation and session. */
export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [session, setSession] = useState<ClinicSessionUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    fetch("/api/clinic/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/clinic/login");
          return;
        }
        const data = await res.json();
        if (!cancelled && data.user) setSession(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPublic, router]);

  useEffect(() => {
    // Deferred so the server render and first client render match.
    const timer = setTimeout(() => {
      try {
        setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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

  if (isPublic) return <>{children}</>;

  const toggleSidebar = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const handleLogout = async () => {
    await fetch("/api/clinic/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/clinic/login");
    router.refresh();
  };

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.minRole || roleAtLeast(session?.role, i.minRole)),
  })).filter((s) => s.items.length > 0);
  const allowedItems = sections.flatMap((s) => s.items);
  const pageTitle = NAV_SECTIONS.flatMap((s) => s.items).find((i) => isItemActive(i, pathname))?.label ?? "Overview";
  const initial = (session?.name || "?").charAt(0).toUpperCase();

  const renderNav = (compact: boolean) => (
    <nav aria-label="Clinic" className={`space-y-6 pb-6 pt-2 ${compact ? "px-3" : "px-4"}`}>
      {sections.map((section) => (
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
                      active ? "bg-background-dark text-white shadow-sm" : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
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

  // A staff member who types a manager-only URL sees a plain notice instead of the page.
  const currentItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) => isItemActive(i, pathname));
  const blocked = session && currentItem && !allowedItems.includes(currentItem);

  return (
    <div className="ui-copy min-h-screen bg-surface font-body text-foreground">
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
            <Link href="/clinic" className="hidden whitespace-nowrap rounded-sm lg:block" aria-label="Clinic overview">
              <Wordmark full className="text-[1.1rem]" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:flex ${collapsed ? "" : "ml-auto"}`}
          >
            <IconSidebar className="h-5 w-5" />
          </button>
          <p className="truncate font-display text-lg font-semibold lg:hidden">{pageTitle}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-4 sm:pr-6 lg:pl-2">
          <p className="hidden truncate font-display text-lg font-semibold text-foreground md:block">{session?.clinicName ?? ""}</p>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/clinic/social"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-background-dark px-5 text-sm font-semibold text-white transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span aria-hidden className="text-base leading-none">+</span>
              <span className="hidden sm:inline">New Post</span>
            </Link>

            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Account menu"
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{initial}</span>
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-semibold text-foreground">{session?.name ?? ""}</span>
                  <span className="block text-[11px] text-muted-foreground">{session ? ROLE_LABEL[session.role] : ""}</span>
                </span>
                <IconChevronDown className={`hidden h-4 w-4 text-muted-foreground transition-transform xl:block ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="animate-fade-in-down absolute right-0 top-14 z-50 w-60 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground">{session?.email}</p>
                  <div className="my-1 border-t border-border" />
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

      <aside
        className={`fixed bottom-0 left-0 top-[72px] z-30 hidden overflow-y-auto overflow-x-hidden bg-surface transition-[width] duration-[var(--duration-normal)] lg:block ${
          collapsed ? "w-[88px]" : "w-[264px]"
        }`}
      >
        {renderNav(collapsed)}
      </aside>

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

      <main
        className={`min-h-screen bg-background-alt pt-[72px] lg:fixed lg:bottom-0 lg:right-0 lg:transition-[left] lg:duration-[var(--duration-normal)] ${
          collapsed ? "lg:left-[88px]" : "lg:left-[264px]"
        } lg:top-[72px] lg:min-h-0 lg:overflow-y-auto lg:rounded-tl-[28px] lg:pt-0`}
      >
        <div className="px-4 py-5 sm:px-6 lg:px-6 lg:py-6 2xl:px-8">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm shadow-xs">
            <IconGrid className="h-4 w-4 text-muted-foreground" />
            <Link href="/clinic" className="text-muted-foreground hover:text-foreground">
              {session?.clinicName ?? "Clinic"}
            </Link>
            <span aria-hidden className="text-border-strong">/</span>
            <span aria-current="page" className="font-semibold text-foreground">
              {pageTitle}
            </span>
          </nav>
          {!session ? (
            <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : blocked ? (
            <div className="admin-card p-8 text-center">
              <p className="font-semibold text-foreground">You don&apos;t have access to {pageTitle}.</p>
              <p className="mt-1 text-sm text-muted-foreground">Ask your clinic owner if you need it.</p>
            </div>
          ) : (
            <ClinicSessionContext.Provider value={session}>{children}</ClinicSessionContext.Provider>
          )}
        </div>
      </main>
    </div>
  );
}
