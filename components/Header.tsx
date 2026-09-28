"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { Wordmark } from "@/components/Wordmark";
import { IconChevronDown } from "@/components/icons";
import SolutionsMenu from "@/components/nav/SolutionsMenu";
import { SOLUTIONS_TABS } from "@/components/nav/solutionsMenu";

/**
 * Top-level navigation, in the order a visitor asks the questions: what do you
 * do (Solutions), how does it work, has it worked before, who are you, how do
 * I reach you. The audit is the primary action and sits in the CTA rather than
 * the list. Homepage-only sections (Free Website Audit, What We Do, FAQ) live
 * in the footer.
 */
const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/book-consultation", label: "Contact" },
];


const navLinkClass = (current: boolean) =>
  `group relative inline-flex items-center gap-1 rounded-sm px-3.5 py-2 font-copy text-[1rem] font-medium transition-colors duration-[var(--duration-fast)] hover:text-foreground ${current ? "text-foreground" : "text-foreground-secondary"}`;

function NavUnderline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-primary transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)] group-hover:scale-x-100 group-focus-visible:scale-x-100 ${active ? "scale-x-100" : "scale-x-0"}`}
    />
  );
}

export default function Header() {
  const pathname = usePathname();
  const isCurrent = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const onServices = pathname === "/services" || pathname.startsWith("/services/");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(onServices);
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

  const mobileItemClass = (current: boolean, i: number) =>
    `flex items-center justify-between py-4 font-copy text-[1.125rem] font-medium transition-colors hover:text-primary-ink ${current ? "text-primary-ink" : "text-foreground"} ${i > 0 ? "border-t border-border-subtle" : ""}`;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-[var(--duration-normal)] ${
        scrolled || mobileMenuOpen
          ? "border-border bg-surface/95 shadow-xs backdrop-blur-md"
          : "border-transparent bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="container-site relative flex h-[var(--header-height)] items-center justify-between gap-6">
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
          <SolutionsMenu current={onServices} navLinkClass={navLinkClass} underline={(active) => <NavUnderline active={active} />} />
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} aria-current={isCurrent(link.href) ? "page" : undefined} className={navLinkClass(isCurrent(link.href))}>
              {link.label}
              <NavUnderline active={isCurrent(link.href)} />
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
            className="inline-flex h-[var(--button-height-sm)] items-center gap-1.5 whitespace-nowrap rounded-full bg-background-dark px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-[var(--duration-normal)] hover:bg-primary active:translate-y-px"
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

      {/* Mobile drawer — scrolls within the viewport so the Services group never clips */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={drawerRef}
          className="animate-fade-in max-h-[calc(100dvh-var(--header-height))] overflow-y-auto overscroll-contain border-t border-border bg-surface lg:hidden"
        >
          <nav aria-label="Primary mobile" className="container-site flex flex-col py-3">
            {/* Solutions — the same categories as the desktop mega menu, stacked */}
            <button
              type="button"
              aria-expanded={mobileServicesOpen}
              aria-controls="mobile-solutions"
              onClick={() => setMobileServicesOpen((v) => !v)}
              className={`${mobileItemClass(onServices, 0)} w-full text-left`}
            >
              Solutions
              <IconChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-[var(--duration-fast)] ${mobileServicesOpen ? "rotate-180" : ""}`} />
            </button>
            <div id="mobile-solutions" hidden={!mobileServicesOpen} className="pb-3">
              <div className="space-y-3 rounded-[var(--radius-medium)] bg-background-alt p-2">
                {SOLUTIONS_TABS.map((tab) => (
                  <section key={tab.id} aria-label={tab.label}>
                    <p className="px-3 pt-2 text-eyebrow text-muted-foreground">{tab.label}</p>
                    <ul>
                      {tab.groups.flatMap((group) => group.entries).map((entry) => (
                        <li key={`${entry.title}-${entry.href}`}>
                          <Link
                            href={entry.href}
                            onClick={() => setMobileMenuOpen(false)}
                            aria-current={pathname === entry.href ? "page" : undefined}
                            className={`flex min-h-12 items-center rounded-[var(--radius-small)] px-3 py-2.5 font-copy text-[1rem] font-medium transition-colors hover:bg-surface ${pathname === entry.href ? "text-primary-ink" : "text-foreground"}`}
                          >
                            {entry.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                <div className="border-t border-border-subtle">
                  <Link href="/services" onClick={() => setMobileMenuOpen(false)} className="flex min-h-12 items-center gap-2 px-3 py-2.5 font-copy text-[0.9375rem] font-medium text-primary-ink">
                    View All Services
                    <ButtonArrow className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={mobileItemClass(isCurrent(link.href), i + 1)}
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
