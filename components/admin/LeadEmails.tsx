"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { IconButton } from "@/components/admin/IconButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, primaryButton, secondaryButton } from "@/components/admin/pipeline/ui";
import { IconMail, IconPlus, IconChevronDown, IconCursorClick, IconCheckCircle, IconInfo } from "@/components/icons";

type Contact = { id: string; firstName: string; lastName: string; email: string };

type LeadEmail = {
  id: string;
  subject: string;
  kind: "sequence" | "manual";
  status: string;
  contact: Contact;
  sentBy: string | null;
  sentAt: string | null;
  createdAt: string;
  failureReason: string | null;
  openCount: number;
  clickCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  firstClickedAt: string | null;
  repliedAt: string | null;
  events: { id: string; eventType: string; linkClicked: string | null; timestamp: string }[];
};

type Sending = { mode: "live" } | { mode: "test"; redirectTo: string };

const MERGE_TAGS = [
  { tag: "{{contactName}}", label: "First name" },
  { tag: "{{clinicName}}", label: "Practice" },
  { tag: "{{city}}", label: "City" },
  { tag: "{{auditUrl}}", label: "Audit link" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Compose, send and track emails to one lead's contacts. */
export function LeadEmails({ businessId, contacts, onSent }: { businessId: string; contacts: Contact[]; onSent: () => void }) {
  const [emails, setEmails] = useState<LeadEmail[] | null>(null);
  const [sending, setSending] = useState<Sending | null>(null);
  const [loadError, setLoadError] = useState("");
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/emails`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't load emails");
      setEmails(json.messages);
      setSending(json.sending);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load emails");
    }
  }, [businessId]);

  // Opens and clicks arrive while the page sits open — refresh when the admin comes back to the tab.
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const sent = (emails ?? []).filter((e) => e.sentAt);
  const opened = sent.filter((e) => e.firstOpenedAt).length;
  const clicked = sent.filter((e) => e.firstClickedAt).length;
  const replied = sent.filter((e) => e.status === "REPLIED").length;
  const pct = (n: number) => (sent.length ? ` · ${Math.round((n / sent.length) * 100)}%` : "");

  async function showPreview(id: string) {
    const res = await fetch(`/api/admin/outreach/${id}/preview`);
    const json = await res.json();
    if (res.ok) setPreview(json);
    else setNotice(json.error || "Couldn't load the email");
  }

  async function markReplied(id: string) {
    const res = await fetch(`/api/admin/outreach/mark-replied`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id }),
    });
    if (res.ok) {
      await load();
      onSent();
    } else setNotice("Couldn't mark it as replied");
  }

  return (
    <AdminCard
      title="Emails"
      icon={IconMail}
      count={emails?.length}
      action={
        <IconButton
          Icon={IconPlus}
          label={contacts.length ? "Write email" : "Add a contact first"}
          onClick={() => (contacts.length ? setComposing(true) : setNotice("Add a decision maker with an email address first."))}
        />
      }
    >
      {sending?.mode === "test" && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-warning/10 px-4 py-3 text-xs text-foreground">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            <strong>Test mode:</strong> emails are delivered to {sending.redirectTo}, not the contact. Set EMAIL_SEND_MODE=live with Gmail
            credentials to send for real.
          </span>
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-2xl bg-surface-muted px-4 py-3 text-xs text-foreground">
          {notice}
        </p>
      )}

      {loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : emails === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : emails.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          <p>No emails sent to this practice yet.</p>
          {contacts.length > 0 && (
            <button onClick={() => setComposing(true)} className={`${primaryButton} mt-4`}>
              Write the first email
            </button>
          )}
        </div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Sent", `${sent.length}`],
              ["Opened", `${opened}${pct(opened)}`],
              ["Clicked", `${clicked}${pct(clicked)}`],
              ["Replied", `${replied}${pct(replied)}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface-muted px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-display text-lg font-bold text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <ul className="-mx-5 divide-y divide-border border-t border-border">
            {emails.map((e) => {
              const expanded = openId === e.id;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setOpenId(expanded ? null : e.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{e.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        To {e.contact.firstName} {e.contact.lastName} · {when(e.sentAt ?? e.createdAt)}
                        {e.kind === "sequence" ? " · Campaign sequence" : e.sentBy ? ` · by ${e.sentBy}` : ""}
                      </p>
                    </div>
                    <span className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                      <span title="Opens">
                        <IconMail className="mr-1 inline h-3.5 w-3.5" />
                        {e.openCount}
                      </span>
                      <span title="Clicks">
                        <IconCursorClick className="mr-1 inline h-3.5 w-3.5" />
                        {e.clickCount}
                      </span>
                    </span>
                    <StatusBadge status={e.status} className="shrink-0" />
                    <IconChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && <EmailDetail email={e} onPreview={() => showPreview(e.id)} onMarkReplied={() => markReplied(e.id)} />}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Opens are approximate: some mail apps load images automatically (inflating opens) and others block them.
          </p>
        </>
      )}

      {composing && (
        <ComposeDialog
          businessId={businessId}
          contacts={contacts}
          sending={sending}
          onClose={() => setComposing(false)}
          onSent={async (msg) => {
            setComposing(false);
            setNotice(msg);
            await load();
            onSent();
          }}
        />
      )}

      {preview && (
        <Dialog title={preview.subject} onClose={() => setPreview(null)} width="max-w-2xl">
          <p className="mt-1 text-xs text-muted-foreground">To {preview.to}</p>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview.html}
            className="mt-4 h-[60vh] w-full rounded-2xl border border-border bg-white"
          />
        </Dialog>
      )}
    </AdminCard>
  );
}

function EmailDetail({ email, onPreview, onMarkReplied }: { email: LeadEmail; onPreview: () => void; onMarkReplied: () => void }) {
  // Oldest first reads as a story: sent → opened → clicked → replied.
  const timeline: { at: string; text: string; href?: string }[] = [];
  if (email.sentAt) timeline.push({ at: email.sentAt, text: `Sent to ${email.contact.email}` });
  for (const ev of [...email.events].reverse()) {
    if (ev.eventType === "email_opened") timeline.push({ at: ev.timestamp, text: "Opened" });
    else timeline.push({ at: ev.timestamp, text: "Clicked", href: ev.linkClicked ?? undefined });
  }
  if (email.repliedAt) timeline.push({ at: email.repliedAt, text: "Replied" });

  return (
    <div className="bg-surface-muted/40 px-5 pb-4 pt-1">
      {email.failureReason && <p className="mb-3 text-xs font-semibold text-danger">Not delivered: {email.failureReason}</p>}
      {timeline.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not sent yet.</p>
      ) : (
        <ol className="space-y-2 border-l border-border pl-4">
          {timeline.map((t, i) => (
            <li key={i} className="relative text-xs">
              <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border-strong" />
              <span className="font-semibold text-foreground">{t.text}</span>
              {t.href && (
                <>
                  {" "}
                  <a href={t.href} target="_blank" rel="noreferrer" className="break-all text-primary-ink underline">
                    {t.href}
                  </a>
                </>
              )}
              <span className="text-muted-foreground"> · {when(t.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onPreview} className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-surface-muted">
          View email
        </button>
        {email.sentAt && email.status !== "REPLIED" && email.status !== "BOUNCED" && (
          <button
            onClick={onMarkReplied}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            <IconCheckCircle className="h-3.5 w-3.5" /> Mark as replied
          </button>
        )}
      </div>
    </div>
  );
}

function ComposeDialog({
  businessId,
  contacts,
  sending,
  onClose,
  onSent,
}: {
  businessId: string;
  contacts: Contact[];
  sending: Sending | null;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {{contactName}},\n\n");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertTag(tag: string) {
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + tag);
    const { selectionStart: a, selectionEnd: b } = el;
    setBody((v) => v.slice(0, a) + tag + v.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + tag.length, a + tag.length);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, subject, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      onSent(json.mode === "test" ? `Sent in test mode — delivered to ${json.deliveredTo}.` : `Email sent to ${json.deliveredTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1.5 w-full rounded-2xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <Dialog title="Write email" onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email-to" className="text-xs font-semibold text-foreground">
            To
          </label>
          <select id="email-to" value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${field} h-11`}>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} &lt;{c.email}&gt;
              </option>
            ))}
          </select>
          {sending?.mode === "test" && <p className="mt-1.5 text-[11px] text-warning">Test mode — this will actually go to {sending.redirectTo}.</p>}
        </div>
        <div>
          <label htmlFor="email-subject" className="text-xs font-semibold text-foreground">
            Subject
          </label>
          <input
            id="email-subject"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. A few quick wins for {{clinicName}}"
            className={`${field} h-11`}
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="email-body" className="text-xs font-semibold text-foreground">
              Message
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((m) => (
                <button
                  key={m.tag}
                  type="button"
                  onClick={() => insertTag(m.tag)}
                  title={`Insert ${m.tag}`}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  + {m.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="email-body"
            ref={bodyRef}
            required
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${field} py-3 leading-relaxed`}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Plain text. Links are tracked automatically; an unsubscribe footer is added for you.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={busy || !contactId || !subject.trim() || !body.trim()} className={primaryButton}>
            {busy ? "Sending…" : "Send email"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
