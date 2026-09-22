export default function Eyebrow({
  children,
  tone = "light",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-eyebrow ${
        tone === "dark" ? "text-primary-ink" : "text-primary-ink"
      } ${className}`}
    >
      <span aria-hidden className="h-px w-6 bg-secondary-mark" />
      {children}
    </span>
  );
}
