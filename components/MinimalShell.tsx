import { WordmarkLink } from "@/components/Wordmark";

/**
 * Chrome for focused pages (booking, thank-you, unsubscribe): wordmark on top,
 * a one-line footer, content centred in between. No navigation by design.
 */
export default function MinimalShell({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "top" }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-alt text-foreground">
      <header className="container-site flex h-[var(--header-height)] items-center">
        <WordmarkLink />
      </header>

      <main className={`container-site flex flex-1 flex-col ${align === "center" ? "items-center justify-center" : "items-center"} py-8 sm:py-12`}>
        {children}
      </main>

      <footer className="container-site border-t border-border py-6 text-center text-metadata">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
