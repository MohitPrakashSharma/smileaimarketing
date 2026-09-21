"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { IconMapPin, IconSearch } from "@/components/icons";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { CtaCards } from "@/components/visuals/compositions";
import { trackEvent } from "@/lib/analytics.client";
import { SOCIAL_LINKS, TARGET_CITY, TARGET_PROVINCE } from "@/lib/siteConfig";
import { SERVICES } from "@/lib/services";

const CONTACT_EMAIL = "hello@smileaimarketing.com";

const SECTION_LINKS = [
  { href: "#seo-audit", label: "Free Website Audit" },
  { href: "#services", label: "What We Do" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

const PAGE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/services", label: "All Services" },
  { href: "/book-consultation", label: "Book a Consultation" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/sitemap.xml", label: "Sitemap" },
];

const SOCIAL_ICONS: Record<(typeof SOCIAL_LINKS)[number]["key"], React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.1c-.3 0-1.1-.1-2.2-.1-2.1 0-3.6 1.3-3.6 3.7v2.2H8.2v2.9h2.4V21h2.9z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M6.5 8.6H3.6V20h2.9V8.6zM5 4a1.7 1.7 0 1 0 0 3.4A1.7 1.7 0 0 0 5 4zm15 9.1c0-3.1-1.7-4.7-4-4.7-1.8 0-2.6 1-3.1 1.7V8.6H10c0 .8 0 11.4 0 11.4h2.9v-6.4c0-.3 0-.7.1-.9.3-.7.8-1.4 1.8-1.4 1.3 0 1.8 1 1.8 2.4V20h2.9v-6.9z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 10.2v3.7h5.2c-.2 1.3-1.5 3.8-5.2 3.8-3.1 0-5.7-2.6-5.7-5.7S8.9 6.3 12 6.3c1.8 0 3 .8 3.6 1.4l2.5-2.4C16.5 3.8 14.4 3 12 3a9 9 0 1 0 0 18c5.2 0 8.6-3.6 8.6-8.8 0-.6-.1-1-.1-1.5H12z" />
    </svg>
  ),
};

function SocialLinks() {
  // Same hover as every other button: pink fill, white glyph, lifted shadow.
  const cls =
    "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-foreground shadow-xs transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white hover:shadow-md active:translate-y-px";
  return (
    <ul className="mt-5 flex items-center gap-2" aria-label="Social profiles">
      {SOCIAL_LINKS.map((s) =>
        s.href ? (
          <li key={s.key}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className={cls}>
              {SOCIAL_ICONS[s.key]}
            </a>
          </li>
        ) : (
          <li key={s.key}>
            <span aria-label={s.label} title={s.label} className={cls}>
              {SOCIAL_ICONS[s.key]}
            </span>
          </li>
        )
      )}
    </ul>
  );
}

/** Website-only entry to the audit: hands off to /free-dental-audit, which prefills and detects the city. */
function AuditBanner() {
  const router = useRouter();
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = website.trim();
    const ok = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(trimmed);
    if (!ok) {
      setError("Enter your practice website, e.g. yourpractice.ca");
      return;
    }
    setError("");
    trackEvent("audit_form_submit", { form_location: "footer" });
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed.toLowerCase() : `https://${trimmed.toLowerCase()}`;
    router.push(`/free-dental-audit?website=${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="band-prism relative overflow-hidden rounded-[var(--radius-xl)] border border-border-subtle shadow-xl">
      <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="hidden lg:block">
          <CtaCards tone="light" />
        </div>
        <div className="min-w-0">
          <h2 className="text-heading-3 text-foreground">Get your free website audit and see what to fix first.</h2>
          <p className="mt-2 text-body-small text-muted-foreground">
            We check how patients find you online — local visibility, reviews, website speed and booking — and send you a plain-English report.
          </p>
          <form onSubmit={onSubmit} noValidate className="mt-5">
            <label htmlFor="footer-website" className="sr-only">Practice website</label>
            <div className="flex flex-col gap-2 sm:block">
            <div className={`flex items-center gap-2 rounded-full border bg-white p-1.5 pl-4 shadow-sm transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20 ${error ? "border-danger" : "border-border"}`}>
              <IconSearch className="h-4 w-4 shrink-0 text-[#8e8c94]" />
              <input
                id="footer-website"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="yourpractice.ca"
                size={1}
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (error) setError("");
                  if (!started.current) {
                    started.current = true;
                    trackEvent("audit_form_start", { form_location: "footer" });
                  }
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "footer-website-error" : undefined}
                className="h-10 min-w-0 flex-1 bg-transparent text-body text-[#2d2c2b] placeholder:text-placeholder focus:outline-none"
              />
              <button
                type="submit"
                className="group/btn hidden h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-button text-primary-foreground transition-[background-color,box-shadow] duration-[var(--duration-normal)] hover:bg-primary-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:inline-flex"
              >
                Run audit
                <ButtonArrow />
              </button>
            </div>
            {/* Below sm the button sits under the field instead of inside the pill */}
            <button
              type="submit"
              className="group/btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-button text-primary-foreground transition-[background-color,box-shadow] duration-[var(--duration-normal)] hover:bg-primary-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:hidden"
            >
              Run audit
              <ButtonArrow />
            </button>
            </div>
            {error && (
              <p id="footer-website-error" className="mt-2 text-body-small font-medium text-danger" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="mt-3 text-metadata text-muted-foreground">
            Free, no logins and no credit card. Takes about two minutes.{" "}
            <Link href="/privacy" className="link-underline text-foreground">Read our privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const onHomepage = pathname === "/";

  const handleScrollToLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!onHomepage) return; // let it navigate to "/#section" normally
    e.preventDefault();
    const targetSection = document.querySelector(href);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const linkClass =
    "link-underline text-body-small text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-foreground";
  const headingClass = "text-eyebrow text-foreground";

  return (
    <footer className="band-soft relative overflow-hidden pt-16 lg:pt-20">
      {/* Soft blurred colour behind the white panel */}
      <div className="band-soft-glow pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[30rem] rounded-full" aria-hidden />
      <div className="band-soft-glow band-soft-glow-coral pointer-events-none absolute -bottom-40 left-[8%] h-[22rem] w-[26rem] rounded-full" aria-hidden />

      {/* Wider than the site container: ~80% of the viewport on large screens */}
      <div className="relative mx-auto w-full px-[var(--page-gutter)] lg:w-[80vw] lg:px-0">
        {/* White panel; the banner straddles its top edge */}
        <div className="mt-24 rounded-t-[var(--radius-xl)] border border-b-0 border-border bg-white px-5 shadow-[0_-12px_40px_-24px_rgba(30,27,71,0.25)] sm:px-8 lg:px-12 lg:mt-28">
          <div className="relative z-10 -mt-24 lg:-mt-28">
            <AuditBanner />
          </div>

        <div className="grid gap-8 py-10 sm:grid-cols-2 sm:py-12 lg:grid-cols-[1.4fr_2fr_1fr_1fr_1.2fr] lg:gap-8 lg:pt-14">
          <div>
            <Wordmark full className="!text-[1.5rem]" />
            <p className="mt-4 max-w-xs text-body-small text-muted-foreground">
              Digital marketing for Canadian dental practices — local visibility, qualified patient enquiries and websites that convert.
            </p>
            <SocialLinks />
          </div>

          <nav aria-label="Footer services" className="sm:col-span-2 lg:col-span-1">
            <p className={headingClass}>Services</p>
            {/* Eight services in two columns of four (first four left, last four right) */}
            <div className="mt-3 grid grid-cols-2 gap-x-6">
              {[SERVICES.slice(0, 4), SERVICES.slice(4)].map((half, i) => (
                <ul key={i} className="space-y-2">
                  {half.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/services/${s.slug}`} className={linkClass}>
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </nav>

          <nav aria-label="Footer company">
            <p className={headingClass}>Company</p>
            <ul className="mt-3 space-y-2">
              {PAGE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer sections">
            <p className={headingClass}>On this site</p>
            <ul className="mt-3 space-y-2">
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={onHomepage ? link.href : `/${link.href}`}
                    onClick={(e) => handleScrollToLink(e, link.href)}
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className={headingClass}>Contact us</p>
            <ul className="mt-3 space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-primary-ink" aria-hidden>
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
                    <path d="M3 6l7 5 7-5" />
                  </svg>
                </span>
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-primary-ink" aria-hidden>
                  <IconMapPin className="h-4 w-4" />
                </span>
                <span className="text-body-small text-muted-foreground">
                  {TARGET_CITY}, {TARGET_PROVINCE} — serving practices across Canada
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border py-5 text-metadata text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Smile AI Marketing. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="link-underline transition-colors duration-[var(--duration-fast)] hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </footer>
  );
}
