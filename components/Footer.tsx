export default function Footer() {
  return (
    <footer className="bg-ink text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <span className="font-label text-[13px] tracking-tight text-white/85">
          Smile AI Marketing
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#process" className="font-body text-[13.5px] transition-colors hover:text-white">
            How it works
          </a>
          <a href="#services" className="font-body text-[13.5px] transition-colors hover:text-white">
            Services
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
