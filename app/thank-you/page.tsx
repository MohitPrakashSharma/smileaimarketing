import Eyebrow from "@/components/Eyebrow";

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-teal selection:text-white">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <a href="/" className="font-display text-xl font-bold tracking-tight text-ink">
          Smile AI<span className="text-teal">.</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-[0_20px_50px_-20px_rgba(8,44,58,0.12)] space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-teal-deep">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <Eyebrow>Booking Confirmed</Eyebrow>
            <h1 className="font-display text-2xl font-semibold">Thank You!</h1>
            <p className="font-body text-xs text-slate">
              Your 15-minute dental marketing review has been scheduled. A calendar invitation and a link to join the screen share have been sent to your professional inbox.
            </p>
          </div>
          <div className="pt-2">
            <a href="/" className="rounded-full bg-paper border border-line px-6 py-3 font-body text-xs font-semibold hover:border-teal hover:text-teal-deep transition-colors">
              Return Home
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center font-body text-[13px] text-slate border-t border-line">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
