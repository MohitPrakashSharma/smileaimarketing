"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { Wordmark } from "@/components/Wordmark";

// Five items fit beside the wordmark and CTA at the 1024px breakpoint; the
// remaining homepage sections (Sample Audit, FAQ) live in the footer. Section
// links are root-relative so they work from every page, and resolve to a
// same-document smooth scroll on the homepage itself.
const NAV_LINKS = [
  { href: "/#services", label: "What We Do" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/#trust-consultation", label: "Consultation" },
];

export default function Header() {
  const pathname = usePathname();
  const isCurrent = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Logo → top of page; CTA → the homepage audit section (or the wizard when
  // the current page has no audit section).
  const scrollToId = (id: string, fallbackHref?: string) => (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    } else if (fallbackHref) {
      window.location.href = fallbackHref;
    }
  };
  const handleScrollToTop = scrollToId("top", "/");
  const handleScrollToAudit = scrollToId("seo-audit", "/free-dental-audit");

  // Hairline + solid background once the page has scrolled under the header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile drawer: lock page scroll, close on Escape, move focus in and back out.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = drawerRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  // Close the drawer if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMobileMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-[var(--duration-normal)] ${
        scrolled || mobileMenuOpen
          ? "border-border bg-surface/95 shadow-xs backdrop-blur-md"
          : "border-transparent bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="container-site flex h-[var(--header-height)] items-center justify-between gap-6">
        <a
          href="#top"
          className="flex shrink-0 items-center rounded-sm"
          onClick={handleScrollToTop}
          aria-label="Smile AI Marketing — back to top"
        >
          <Wordmark />
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className={`group relative rounded-sm px-3.5 py-2 font-copy text-[0.9375rem] font-medium transition-colors duration-[var(--duration-fast)] hover:text-foreground ${
                isCurrent(link.href) ? "text-foreground" : "text-foreground-secondary"
              }`}
            >
              {link.label}
              <span
                aria-hidden
                className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-primary transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)] group-hover:scale-x-100 group-focus-visible:scale-x-100 ${
                  isCurrent(link.href) ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center lg:flex">
          <button
            onClick={handleScrollToAudit}
            className="group inline-flex h-[var(--button-height-sm)] items-center gap-2 whitespace-nowrap rounded-full bg-background-dark px-5 text-button text-white shadow-sm transition-[background-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:bg-primary hover:shadow-md active:translate-y-px"
          >
            Get Your Free Audit
            <ButtonArrow />
          </button>
        </div>

        {/* Mobile: compact CTA + menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={handleScrollToAudit}
            className="inline-flex h-[var(--button-height-sm)] items-center gap-1.5 whitespace-nowrap rounded-full bg-background-dark px-4 text-[0.875rem] font-semibold text-white transition-colors duration-[var(--duration-normal)] hover:bg-primary active:translate-y-px"
          >
            Free Audit
          </button>

          <button
            ref={menuButtonRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-[var(--button-height-sm)] w-[var(--button-height-sm)] shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors duration-[var(--duration-fast)] hover:border-foreground"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              aria-hidden
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={drawerRef}
          className="animate-fade-in border-t border-border bg-surface lg:hidden"
        >
          <nav aria-label="Primary mobile" className="container-site flex flex-col py-3">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={`flex items-center justify-between py-4 font-copy text-[1.125rem] font-medium transition-colors hover:text-primary-ink ${
                  isCurrent(link.href) ? "text-primary-ink" : "text-foreground"
                } ${i > 0 ? "border-t border-border-subtle" : ""}`}
              >
                {link.label}
                <ButtonArrow className="text-muted-foreground" />
              </a>
            ))}
          </nav>
          <div className="container-site border-t border-border-subtle py-4 pb-safe">
            <button
              onClick={handleScrollToAudit}
              className="group inline-flex h-[var(--button-height)] w-full items-center justify-center gap-2 rounded-full bg-primary text-button text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Get Your Free Website Audit
              <ButtonArrow />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
