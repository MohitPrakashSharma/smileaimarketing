"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { TARGET_CITY, TARGET_PROVINCE } from "@/lib/siteConfig";
import { SERVICES } from "@/lib/services";

const SECTION_LINKS = [
  { href: "#seo-audit", label: "Free Website Audit" },
  { href: "#services", label: "What We Do" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#sample-audit", label: "Sample Audit" },
  { href: "#trust-consultation", label: "Consultation" },
  { href: "#faq", label: "FAQ" },
];

const PAGE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/book-consultation", label: "Book a Consultation" },
  { href: "/privacy", label: "Privacy Policy" },
];

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

  return (
    <footer className="band-dark band-footer">
      <div className="container-site">
        <div className="grid gap-8 py-10 sm:grid-cols-2 sm:py-12 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr] lg:gap-8">
          <div>
            <Wordmark full className="!text-[1.5rem]" />
            <p className="mt-4 max-w-xs text-body-small text-muted-foreground">
              Digital marketing for Canadian dental practices — local visibility, qualified patient enquiries and websites that convert.
            </p>
          </div>

          <nav aria-label="Footer services">
            <p className="text-eyebrow text-muted-foreground">Services</p>
            <ul className="mt-3 space-y-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className={linkClass}>
                    {s.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/services" className={`${linkClass} font-medium text-foreground`}>
                  All services
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Footer sections">
            <p className="text-eyebrow text-muted-foreground">On this site</p>
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

          <nav aria-label="Footer pages">
            <p className="text-eyebrow text-muted-foreground">Company</p>
            <ul className="mt-3 space-y-2">
              {PAGE_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-5 text-metadata sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Smile AI Marketing. All rights reserved.</p>
          <p>Serving dental practices across Canada, starting in {TARGET_CITY}, {TARGET_PROVINCE}.</p>
        </div>
      </div>
    </footer>
  );
}
