const NAV_LINKS = [
  { href: "#process", label: "How it works" },
  { href: "#services", label: "Services" },
  { href: "#why-ai", label: "Why AI" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <a href="#top" className="group flex items-baseline gap-1">
          <span className="font-label text-[15px] font-medium tracking-tight text-ink sm:text-base">
            <span className="relative">
              Smile
              <svg
                aria-hidden
                viewBox="0 0 40 10"
                className="absolute -bottom-1.5 left-0 h-2 w-full text-teal"
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

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-[15px] text-slate transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          className="rounded-full bg-ink px-5 py-2.5 font-body text-[14px] font-medium text-white transition-colors hover:bg-teal-deep"
        >
          Book a free call
        </a>
      </div>
    </header>
  );
}
