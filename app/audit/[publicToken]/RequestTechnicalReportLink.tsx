import { technicalReportRequestUrl, TECHNICAL_REPORT_REQUEST_VALUE } from "@/lib/audit/technicalReport";

/**
 * Replaces the old technical-report download. The full report is provided by
 * our team after a website review, so this opens the existing consultation
 * form (new tab) with the audit reference attached; nothing is downloaded and
 * nothing is sent automatically when the form is submitted.
 */
export default function RequestTechnicalReportLink({ publicToken, className = "" }: { publicToken: string; className?: string }) {
  const href = technicalReportRequestUrl("", publicToken);
  return (
    <span className={`inline-flex flex-col items-start gap-0.5 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        data-request={TECHNICAL_REPORT_REQUEST_VALUE}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-metadata font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Request Full Technical Report
      </a>
      <span className="text-[12px] leading-snug text-muted-foreground">Book a website review to request the complete technical breakdown.</span>
    </span>
  );
}
