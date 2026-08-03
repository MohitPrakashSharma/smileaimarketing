export default function Eyebrow({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1.5 font-label text-[12px] uppercase tracking-[0.14em] ${
        tone === "dark" ? "bg-white/10 text-teal" : "bg-teal/10 text-teal-deep"
      }`}
    >
      {children}
    </span>
  );
}
