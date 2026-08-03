import Image from "next/image";
import Eyebrow from "@/components/Eyebrow";

const PHOTOS = [
  {
    src: "/images/gallery-webdesign.jpg",
    alt: "Designer working on a dental website across multiple screens",
    caption: "Websites built and optimised to convert visitors",
  },
  {
    src: "/images/gallery-team-growth.jpg",
    alt: "Marketing team reviewing a growth chart together",
    caption: "Monthly strategy reviews, not a black box",
  },
  {
    src: "/images/gallery-social-strategy.jpg",
    alt: "Social media marketing strategy planned on a laptop",
    caption: "Content and campaigns planned around your patients",
  },
];

export default function GalleryStrip() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-24">
      <div className="max-w-xl">
        <Eyebrow>Inside the work</Eyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-[2.5rem]">
          The marketing work behind your growth.
        </h2>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {PHOTOS.map((photo) => (
          <figure key={photo.src} className="group overflow-hidden rounded-2xl border border-line">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <figcaption className="bg-white px-4 py-3 font-body text-[13.5px] text-slate">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
