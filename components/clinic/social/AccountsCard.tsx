"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { IconLink, IconCheckCircle, IconAlertTriangle } from "@/components/icons";
import { PLATFORM_LABEL, type Platform } from "@/lib/social/platforms";
import { roleAtLeast, useClinicSession } from "@/components/clinic/ClinicSessionContext";
import type { SocialAccount } from "./types";

// Platforms without a live connection yet: the clinic just records its handle.
const TEST_ONLY: Platform[] = ["TIKTOK", "LINKEDIN"];

/** What comes back from Facebook's connect flow (?meta=…), in words. */
const META_RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Facebook and Instagram are connected. New posts to them go out for real." },
  connected_no_ig: {
    ok: true,
    text: "Facebook is connected. No Instagram account is linked to that Page — link one in the Page's settings, then reconnect.",
  },
  cancelled: { ok: false, text: "Connection cancelled. Nothing was changed." },
  no_pages: { ok: false, text: "That Facebook account doesn't manage any Pages. Posts go to a Facebook Page, so create or get admin access to one first." },
  expired: { ok: false, text: "The connection took too long or was started elsewhere. Try again." },
  failed: { ok: false, text: "Facebook didn't complete the connection. Try again." },
  not_configured: { ok: false, text: "Facebook connections aren't set up on this server yet." },
  forbidden: { ok: false, text: "Only the clinic owner or a manager can connect accounts." },
};

type Props = {
  accounts: SocialAccount[];
  metaAvailable: boolean;
  onChange: (accounts: SocialAccount[]) => void;
  reload: () => void;
};

export function AccountsCard({ accounts, metaAvailable, onChange, reload }: Props) {
  const session = useClinicSession();
  const canConnect = roleAtLeast(session.role, "MANAGER");
  const byPlatform = Object.fromEntries(accounts.map((a) => [a.platform, a])) as Partial<Record<Platform, SocialAccount>>;
  const fb = byPlatform.FACEBOOK?.live ? byPlatform.FACEBOOK : undefined;
  const ig = byPlatform.INSTAGRAM?.live ? byPlatform.INSTAGRAM : undefined;
  const metaError = fb?.lastError || ig?.lastError;

  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<"confirm" | "working" | null>(null);

  // Read (and then clear) the result of the Facebook redirect.
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("meta");
      if (!code) return;
      if (code === "choose") setChoosing(true);
      else setResult(META_RESULT[code] ?? null);
      url.searchParams.delete("meta");
      window.history.replaceState(null, "", url.pathname + url.search);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const disconnect = async () => {
    setDisconnecting("working");
    const res = await fetch("/api/clinic/social/oauth/meta", { method: "DELETE" }).catch(() => null);
    setDisconnecting(null);
    if (res?.ok) {
      setResult({ ok: true, text: "Disconnected. Facebook and Instagram posts are back in test mode." });
      reload();
    } else setResult({ ok: false, text: "Couldn't disconnect. Try again." });
  };

  return (
    <AdminCard title="Accounts" subtitle="Where your posts are published" icon={IconLink}>
      <div className="space-y-5">
        {result && (
          <p role="status" className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${result.ok ? "border-growth/30 bg-growth/10 text-growth-ink" : "border-danger/30 bg-danger/10 text-danger"}`}>
            {result.text}
          </p>
        )}

        <section className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Facebook &amp; Instagram</p>
          <ConnectedRow label="Facebook Page" account={fb} />
          <ConnectedRow label="Instagram" account={ig} prefix="@" />

          {metaError && (
            <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-foreground">
              <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>Facebook stopped accepting posts from this connection. Reconnect to fix it.</span>
            </p>
          )}

          {!metaAvailable ? (
            <p className="text-[11px] text-muted-foreground">Live Facebook and Instagram publishing isn&apos;t set up on this server yet.</p>
          ) : canConnect ? (
            disconnecting === "confirm" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted/60 p-3 text-xs">
                <span className="mr-auto font-semibold text-foreground">Disconnect Facebook and Instagram?</span>
                <Button size="sm" variant="secondary" onClick={() => setDisconnecting(null)}>
                  Keep
                </Button>
                <Button size="sm" variant="danger" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/clinic/social/oauth/meta/start"
                  className="inline-flex min-h-10 items-center rounded-full bg-background-dark px-4 text-xs font-semibold text-white transition-colors hover:bg-primary"
                >
                  {fb ? "Reconnect" : "Connect Facebook & Instagram"}
                </a>
                {fb && (
                  <Button size="sm" variant="secondary" onClick={() => setDisconnecting("confirm")} loading={disconnecting === "working"}>
                    Disconnect
                  </Button>
                )}
              </div>
            )
          ) : (
            !fb && <p className="text-[11px] text-muted-foreground">Ask your clinic owner or manager to connect Facebook and Instagram.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            You sign in on Facebook&apos;s own page and choose the Page to post to — we never see your password. Instagram must be a Professional account linked to that Page.
          </p>
        </section>

        <HandlesForm accounts={byPlatform} onSaved={onChange} />
      </div>

      {choosing && (
        <PagePicker
          onClose={() => setChoosing(false)}
          onConnected={(text) => {
            setChoosing(false);
            setResult({ ok: true, text });
            reload();
          }}
        />
      )}
    </AdminCard>
  );
}

function ConnectedRow({ label, account, prefix = "" }: { label: string; account?: SocialAccount; prefix?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{account ? `${prefix}${account.handle}` : "Not connected"}</p>
      </div>
      {account ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-growth/10 px-2.5 py-1 text-[11px] font-semibold text-growth-ink">
          <IconCheckCircle className="h-3.5 w-3.5" /> Live
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Test mode</span>
      )}
    </div>
  );
}

function HandlesForm({ accounts, onSaved }: { accounts: Partial<Record<Platform, SocialAccount>>; onSaved: (a: SocialAccount[]) => void }) {
  const initial = () => Object.fromEntries(TEST_ONLY.map((p) => [p, accounts[p]?.handle ?? ""])) as Record<string, string>;
  const [handles, setHandles] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = TEST_ONLY.some((p) => handles[p].trim().replace(/^@/, "") !== (accounts[p]?.handle ?? ""));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/clinic/social/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: TEST_ONLY.map((p) => ({ platform: p, handle: handles[p] })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      onSaved(data.accounts);
      setMessage({ ok: true, text: "Saved." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-xs font-semibold text-foreground">TikTok &amp; LinkedIn</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Test mode for now — posts are recorded here but not sent.</p>
      </div>
      {TEST_ONLY.map((p) => (
        <label key={p} className="block text-xs font-semibold text-foreground">
          {PLATFORM_LABEL[p]}
          <Input
            value={handles[p]}
            onChange={(e) => setHandles({ ...handles, [p]: e.target.value })}
            placeholder={p === "LINKEDIN" ? "company page name" : "@yourclinic"}
            className="mt-1.5"
          />
        </label>
      ))}
      <div className="flex items-center justify-end gap-3">
        {message && <span className={`text-xs font-semibold ${message.ok ? "text-growth-ink" : "text-danger"}`}>{message.text}</span>}
        <Button size="sm" variant="secondary" onClick={save} disabled={!dirty || saving} loading={saving}>
          Save handles
        </Button>
      </div>
    </section>
  );
}

type PageOption = { id: string; name: string; instagram: string | null };

/** Shown after Facebook returns when the person manages more than one Page. */
function PagePicker({ onClose, onConnected }: { onClose: () => void; onConnected: (text: string) => void }) {
  const [pages, setPages] = useState<PageOption[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clinic/social/oauth/meta/pages")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setPages(data.pages);
      })
      .catch((e: Error) => setError(e.message || "Couldn't load your Pages."));
  }, []);

  const connect = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clinic/social/oauth/meta/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onConnected(
        data.connected.instagram
          ? `Connected ${data.connected.facebook} and @${data.connected.instagram}. New posts to them go out for real.`
          : `Connected ${data.connected.facebook}. No Instagram account is linked to that Page yet.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect that Page.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="page-picker-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="admin-card relative w-full max-w-md space-y-4 p-5 shadow-xl">
        <div>
          <h2 id="page-picker-title" className="font-display text-lg font-semibold text-foreground">
            Which Page should we post to?
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Instagram posts go to the account linked to the Page you choose.</p>
        </div>
        {!pages && !error && <p className="text-sm text-muted-foreground">Loading your Pages…</p>}
        {pages && (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {pages.map((p) => (
              <li key={p.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${picked === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface-muted"}`}
                >
                  <input type="radio" name="page" value={p.id} checked={picked === p.id} onChange={() => setPicked(p.id)} className="accent-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{p.instagram ? `Instagram: @${p.instagram}` : "No Instagram linked"}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={connect} disabled={!picked || saving} loading={saving}>
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}
