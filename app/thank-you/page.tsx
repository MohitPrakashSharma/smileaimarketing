import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { IconCheck } from "@/components/icons";

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Smile AI<span className="text-primary">.</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:py-16">
        <div className="animate-scale-in w-full max-w-md space-y-6 rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-primary">
            <IconCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <Eyebrow>Booking Confirmed</Eyebrow>
            <h1 className="text-heading-2 font-semibold text-foreground">Thank you!</h1>
            <p className="text-body-small text-muted-foreground">
              Your review has been scheduled. A confirmation and any meeting details have been sent to your inbox.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-6 text-body-small font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-metadata text-muted-foreground">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
