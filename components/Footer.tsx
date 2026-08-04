"use client";

const LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#sample-audit", label: "Sample Audit" },
  { href: "#trust-consultation", label: "Consultation" },
  { href: "#faq", label: "FAQ" },
];

export default function Footer() {
  const handleScrollToLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
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
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleScrollToLink(e, link.href)}
              className="text-body-small hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/privacy"
            className="text-body-small hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
        </nav>
        
        <p className="text-metadata">
          © {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
