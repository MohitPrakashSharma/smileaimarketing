"use client";

import { useState } from "react";

/**
 * Downloads the report PDF from /api/audit/[token]/pdf. Fetch-based so a
 * generation failure shows a message inline instead of a JSON page; the href
 * still points at the endpoint for right-click / no-JS use. On the first
 * request the server renders the PDF, which can take a few seconds.
 */
/**
 * Customer report only. The technical report is not downloadable from the
 * public report — see RequestTechnicalReportLink.
 */
export default function DownloadPdfButton({ publicToken, variant = "primary", className = "" }: { publicToken: string; variant?: "primary" | "secondary" | "link"; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const href = `/api/audit/${publicToken}/pdf`;
  const label = "Download PDF";

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser handle new-tab clicks
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch(href, { headers: { Accept: "application/pdf" } });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/pdf")) throw new Error("not ready");
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "seo-audit.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const base = variant === "link" ? "inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-metadata font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" : "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-body-small font-bold transition-colors sm:w-auto";
  const look = variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary-hover" : variant === "secondary" ? "border border-border bg-surface text-foreground hover:border-border-strong" : "";
  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <a href={href} onClick={onClick} aria-busy={state === "loading"} className={`${base} ${look}`} download>
        <svg aria-hidden viewBox="0 0 24 24" className={variant === "link" ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4 19h16" />
        </svg>
        {state === "loading" ? "Preparing PDF…" : label}
      </a>
      {state === "error" && (
        <span role="alert" className="text-[12px] text-danger">
          We couldn&apos;t generate the PDF just now. <a href={href} className="underline">Try again</a> in a moment.
        </span>
      )}
    </span>
  );
}
