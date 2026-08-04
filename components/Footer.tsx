"use client";

import { usePathname } from "next/navigation";

const SECTION_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#sample-audit", label: "Sample Audit" },
  { href: "#trust-consultation", label: "Consultation" },
  { href: "#faq", label: "FAQ" },
];

const PAGE_LINKS = [
  { href: "/case-studies", label: "Case Studies" },
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

  return (
    <footer className="border-t border-border bg-surface text-muted-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <span className="font-sans text-base font-bold text-foreground">
          Smile AI Marketing
        </span>

        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={onHomepage ? link.href : `/${link.href}`}
              onClick={(e) => handleScrollToLink(e, link.href)}
              className="text-body-small hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {PAGE_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-body-small hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-metadata">
          © {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
