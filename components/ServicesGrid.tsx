const SERVICES = [
  {
    title: "Local SEO & Google Maps",
    copy: "Rank higher for “dentist near me” and searches specific to your city and services.",
  },
  {
    title: "Websites that convert",
    copy: "Fast, mobile-first sites built to turn visitors into calls and booking requests.",
  },
  {
    title: "Google & Meta ads",
    copy: "Targeted campaigns that fill the chair without wasting spend on the wrong clicks.",
  },
  {
    title: "Reviews & reputation",
    copy: "A simple system to earn more 5-star reviews and respond to feedback fast.",
  },
];

export default function ServicesGrid() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
      <div className="max-w-xl">
        <p className="font-label text-[13px] uppercase tracking-[0.14em] text-teal-deep">
          What we run
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-4xl">
          Four pillars, one team managing all of them.
        </h2>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <div key={service.title} className="bg-white p-7">
            <h3 className="font-display text-lg font-medium text-ink">{service.title}</h3>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-slate">
              {service.copy}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
