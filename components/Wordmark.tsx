import Link from "next/link";

export function Wordmark({ className = "", full = false }: { className?: string; full?: boolean }) {
  return (
    <span className={`font-display text-[1.375rem] font-bold tracking-[-0.02em] text-foreground ${className}`}>
      <span className="relative inline-block">
        Smile
        <svg
          aria-hidden
          viewBox="0 0 40 10"
          className="absolute -bottom-1 left-0 h-2 w-full text-primary"
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
      {" "}AI<span className={full ? "" : "hidden sm:inline"}> Marketing</span>
    </span>
  );
}

/** Wordmark wrapped in a link to the homepage — for pages without the full header. */
export function WordmarkLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center rounded-sm ${className}`} aria-label="Smile AI Marketing — home">
      <Wordmark />
    </Link>
  );
}
