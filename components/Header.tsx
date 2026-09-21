"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonArrow, buttonClasses } from "@/components/ui/buttonStyles";
import { Wordmark } from "@/components/Wordmark";
import ServiceIcon from "@/components/ServiceIcon";
import { IconChevronDown } from "@/components/icons";
import { SERVICES } from "@/lib/services";

// Five items fit beside the wordmark and CTA at the 1024px breakpoint; the
// remaining homepage sections (What We Do, Sample Audit, FAQ) live in the
// footer. Section links are root-relative so they work from every page, and
// resolve to a same-document smooth scroll on the homepage itself.
const NAV_LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/book-consultation", label: "Consultation" },
];

const HOVER_CLOSE_DELAY = 160;

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

/**
 * Services mega menu (desktop). A disclosure, not a `menu` role: the panel is
 * ordinary navigation links, so screen readers get plain links. Opens on
 * hover (with a short grace period so the pointer can travel from trigger to
 * panel), on click, and from the keyboard (Enter/Space/ArrowDown); closes on
 * Escape (focus returns to the trigger), on an outside click, when focus
 * leaves the menu, and after any link is chosen.
 */
function ServicesMenu({ current }: { current: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }, [cancelClose]);
  const close = useCallback((refocus = false) => {
    cancelClose();
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, close]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <div
      ref={rootRef}
      className="static"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        // Focus moved outside the trigger + panel (Tab past the last link, or a click elsewhere).
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={current ? "page" : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus(), 0);
          }
        }}
        className={`${navLinkClass(current || open)} cursor-pointer`}
      >
        Services
        <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)] ${open ? "rotate-180" : ""}`} />
        <NavUnderline active={current || open} />
      </button>

      {/* Panel — full-width under the header; hidden (not unmounted) so aria-controls always resolves. */}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        aria-label="Services"
        className="absolute inset-x-0 top-full border-b border-border bg-surface shadow-lg"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="container-site grid gap-8 py-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-12">
          <div>
            <p className="text-eyebrow text-muted-foreground">Dental marketing services</p>
            <ul className="mt-4 grid gap-1 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    onClick={() => close()}
                    className="group/item flex items-start gap-3 rounded-[var(--radius-medium)] p-3 transition-colors duration-[var(--duration-fast)] hover:bg-background-alt focus-visible:bg-background-alt"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                      <ServiceIcon icon={s.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-copy text-[1rem] font-medium text-foreground group-hover/item:text-primary-ink">{s.title}</span>
                      <span className="mt-0.5 block text-body-small text-muted-foreground">{s.short}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/services" onClick={() => close()} className="mt-4 inline-flex items-center gap-2 px-3 text-body-small font-medium text-primary-ink">
              View All Services
              <ButtonArrow />
            </Link>
          </div>

          <aside className="band-dark flex flex-col rounded-[var(--radius-large)] p-6">
            <p className="text-eyebrow text-primary-ink">Need help choosing?</p>
            <p className="mt-3 text-heading-4 text-foreground">Not Sure Where to Start?</p>
            <p className="mt-2 flex-1 text-body-small text-muted-foreground">Tell us about your dental practice and the challenges you&apos;re facing. We&apos;ll help you identify the services worth exploring.</p>
            <Link href="/book-consultation" onClick={() => close()} className={buttonClasses({ size: "sm", className: "mt-5 self-start" })}>
              <span>Book a Consultation</span>
              <ButtonArrow />
            </Link>
            <Link href="/free-dental-audit" onClick={() => close()} className="mt-3 inline-flex items-center gap-1.5 text-body-small text-foreground-secondary hover:text-foreground">
              Or start with the free website audit
              <ButtonArrow className="h-3.5 w-3.5" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
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
          <ServicesMenu current={onServices} />
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
            {/* Services — collapsible group */}
            <button
              type="button"
              aria-expanded={mobileServicesOpen}
              aria-controls="mobile-services"
              onClick={() => setMobileServicesOpen((v) => !v)}
              className={`${mobileItemClass(onServices, 0)} w-full text-left`}
            >
              Services
              <IconChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-[var(--duration-fast)] ${mobileServicesOpen ? "rotate-180" : ""}`} />
            </button>
            <div id="mobile-services" hidden={!mobileServicesOpen} className="pb-3">
              <ul className="rounded-[var(--radius-medium)] bg-background-alt p-2">
                {SERVICES.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={pathname === `/services/${s.slug}` ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-small)] px-3 py-2.5 font-copy text-[1rem] font-medium transition-colors hover:bg-surface ${pathname === `/services/${s.slug}` ? "text-primary-ink" : "text-foreground"}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                        <ServiceIcon icon={s.icon} className="h-4 w-4" />
                      </span>
                      {s.title}
                    </Link>
                  </li>
                ))}
                <li className="border-t border-border-subtle">
                  <Link href="/services" onClick={() => setMobileMenuOpen(false)} className="flex min-h-12 items-center gap-2 px-3 py-2.5 font-copy text-[0.9375rem] font-medium text-primary-ink">
                    View All Services
                    <ButtonArrow className="h-4 w-4" />
                  </Link>
                </li>
              </ul>
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
