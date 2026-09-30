"use client";

import { useState } from "react";

export type InviteResult = {
  link: string;
  emailed: boolean;
  emailMode: "test" | "live";
  emailError?: string;
};

/**
 * Shows a freshly issued invite link with a copy button and says honestly
 * whether the email went out — in test mode it only reaches the test inbox.
 */
export function InviteLinkNotice({ invite, email, onDismiss }: { invite: InviteResult; email: string; onDismiss?: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const emailNote = !invite.emailed
    ? `The invite email to ${email} could not be sent${invite.emailError ? ` (${invite.emailError})` : ""}. Share the link below yourself.`
    : invite.emailMode === "live"
      ? `Invite emailed to ${email}.`
      : `Email is in test mode, so the invite went to the test inbox, not ${email}. Share the link below yourself.`;

  return (
    <div role="status" className="rounded-xl border border-primary/20 bg-accent-soft p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground">{emailNote}</p>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground">{invite.link}</code>
        <button
          onClick={copy}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-background-dark px-4 text-xs font-semibold text-white hover:bg-primary"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">The link expires in 7 days.</p>
    </div>
  );
}
