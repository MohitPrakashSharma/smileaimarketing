import type { Metadata } from "next";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import MinimalShell from "@/components/MinimalShell";
import { IconCheck } from "@/components/icons";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { TECHNICAL_REPORT_REQUEST_CONFIRMATION, TECHNICAL_REPORT_REQUEST_PARAM, TECHNICAL_REPORT_REQUEST_VALUE } from "@/lib/audit/technicalReport";

export const metadata: Metadata = {
  title: "Thank You",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // The technical report is never sent automatically — the copy must not suggest it is.
  const technicalReport = params[TECHNICAL_REPORT_REQUEST_PARAM] === TECHNICAL_REPORT_REQUEST_VALUE;
  return (
    <MinimalShell>
      <div className="card-elevated animate-scale-in w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
          <IconCheck className="h-7 w-7" />
        </div>
        <div className="mt-6 space-y-3">
          <Eyebrow className="justify-center">Request received</Eyebrow>
          <h1 className="text-heading-2 text-foreground">{technicalReport ? "Thank you — your request is with our team." : "Thanks — we\u2019ll be in touch."}</h1>
          <p className="text-body text-muted-foreground">
            {technicalReport
              ? TECHNICAL_REPORT_REQUEST_CONFIRMATION
              : "We\u2019ve received your request. A confirmation and any meeting details are on their way to your inbox, and a member of our team will follow up if anything needs adjusting."}
          </p>
        </div>
        <div className="mt-8">
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            <span>Back to the homepage</span>
            <ButtonArrow />
          </Link>
        </div>
      </div>
    </MinimalShell>
  );
}
