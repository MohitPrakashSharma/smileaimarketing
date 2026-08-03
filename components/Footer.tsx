export default function Footer() {
  return (
    <footer className="bg-ink text-white/60">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <span className="font-label text-[13px] tracking-tight text-white/85">
          Smile AI Marketing
        </span>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#how-it-works" className="font-body text-[13.5px] transition-colors hover:text-white">
            How it works
          </a>
          <a href="#services" className="font-body text-[13.5px] transition-colors hover:text-white">
            Services
          </a>
          <a href="#reporting" className="font-body text-[13.5px] transition-colors hover:text-white">
            Reporting
          </a>
          <a href="#faq" className="font-body text-[13.5px] transition-colors hover:text-white">
            FAQ
          </a>
          <a href="#contact" className="font-body text-[13.5px] transition-colors hover:text-white">
            Contact
          </a>
        </nav>
        <p className="font-body text-[13px]">
          © {new Date().getFullYear()} Smile AI Marketing
        </p>
      </div>
    </footer>
  );
}
