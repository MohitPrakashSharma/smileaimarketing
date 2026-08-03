"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";

const SIDEBAR_ITEMS = [
  { label: "Campaigns", path: "/admin/campaigns" },
  { label: "Discovered Clinics", path: "/admin/businesses" },
  { label: "Audit Reports", path: "/admin/audits" },
  { label: "Outreach & Sequences", path: "/admin/outreach" },
  { label: "Consultation Bookings", path: "/admin/appointments" },
  { label: "Sales Pipeline", path: "/admin/pipeline" },
  { label: "Settings", path: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // If we are on the login page, do not render the sidebar layout
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

  return (
    <div className="flex min-h-screen bg-ink text-white font-body">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-ink-2 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
            Smile AI<span className="text-teal">.</span>
          </Link>
          <div className="mt-1">
            <Eyebrow tone="dark">Admin Console</Eyebrow>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors ${
                  isActive
                    ? "bg-teal text-ink font-bold shadow-md"
                    : "text-slate hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate px-2 mb-3">
            <span>admin@smileaimarketing.com</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-full border border-white/10 py-3 text-xs font-bold text-coral hover:bg-coral hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden bg-ink">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-ink-2/40">
          <h2 className="font-display text-lg font-medium text-white capitalize">
            {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
          </h2>
          <span className="rounded-full bg-teal/10 px-3 py-1 font-label text-[10px] uppercase tracking-widest text-teal border border-teal/20">
            Active Session
          </span>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
