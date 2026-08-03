const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#services", label: "Services" },
  { href: "#reporting", label: "Reporting" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 sm:py-6 sm:px-8">
        <a href="#top" className="group flex items-baseline gap-1 shrink-0">
          <span className="font-label text-[15px] font-medium tracking-tight text-ink whitespace-nowrap sm:text-xl md:text-[1.4rem]">
            <span className="relative">
              Smile
              <svg
                aria-hidden
                viewBox="0 0 40 10"
                className="absolute -bottom-2 left-0 h-2.5 w-full text-teal"
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
            {" "}AI Marketing
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-[16.5px] font-medium text-slate transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          className="whitespace-nowrap rounded-full bg-ink px-5 py-3 font-body text-[14px] font-semibold text-white transition-colors hover:bg-teal-deep sm:px-6 sm:py-3.5 sm:text-[15.5px]"
        >
          <span className="sm:hidden">Free Growth Plan</span>
          <span className="hidden sm:inline">Get Your Free Growth Plan</span>
        </a>
      </div>
    </header>
  );
}
