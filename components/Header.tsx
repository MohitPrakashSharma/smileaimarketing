"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#sample-audit", label: "Sample Audit" },
  { href: "#trust-consultation", label: "Consultation" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollToHero = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const heroSection = document.getElementById("top");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/free-dental-audit";
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:px-8">
        <a href="#top" className="group flex items-baseline gap-1 shrink-0" onClick={handleScrollToHero}>
          <span className="font-sans text-lg font-bold tracking-tight text-foreground sm:text-xl">
            <span className="relative">
              Smile
              <svg
                aria-hidden
                viewBox="0 0 40 10"
                className="absolute -bottom-1.5 left-0 h-2 w-full text-primary"
              >
                <path
                  d="M2 2 C 12 10, 28 10, 38 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            {" "}AI<span className="hidden sm:inline"> Marketing</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center">
          <button
            onClick={handleScrollToHero}
            className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-primary px-5 font-body text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[0.98]"
          >
            Audit My Practice
          </button>
        </div>

        {/* Mobile Menu Trigger & Mobile CTA */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={handleScrollToHero}
            className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-primary px-4 font-body text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[0.98]"
          >
            Audit My Practice
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground focus:outline-none"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-surface px-6 py-4 shadow-lg">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-body text-base font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
