import type { Metadata } from "next";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import MinimalShell from "@/components/MinimalShell";
import { IconCheck } from "@/components/icons";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";

export const metadata: Metadata = {
  title: "Thank You",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <MinimalShell>
      <div className="card-elevated animate-scale-in w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
          <IconCheck className="h-7 w-7" />
        </div>
        <div className="mt-6 space-y-3">
          <Eyebrow className="justify-center">Booking Confirmed</Eyebrow>
          <h1 className="text-heading-2 text-foreground">Thank you!</h1>
          <p className="text-body text-muted-foreground">
            Your review has been scheduled. A confirmation and any meeting details have been sent to your inbox.
          </p>
        </div>
        <div className="mt-8">
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            <span>Return Home</span>
            <ButtonArrow />
          </Link>
        </div>
      </div>
    </MinimalShell>
  );
}
