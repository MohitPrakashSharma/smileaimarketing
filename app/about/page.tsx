import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import PageCta from "@/components/PageCta";
import { AboutVisual } from "@/components/visuals/compositions";
import { IconMapPin, IconMonitor, IconSearch, IconTrendingUp, IconCheck } from "@/components/icons";
import { TARGET_CITY, TARGET_PROVINCE } from "@/lib/siteConfig";

const SITE_URL = "https://smileaimarketing.com";
const TITLE = "About Smile AI Marketing | Dental Marketing for Canadian Practices";
const DESCRIPTION =
  "Smile AI Marketing helps Canadian dental practices improve how they are found, understood and chosen online — website strategy, local search visibility and evidence-based recommendations.";

export const metadata: Metadata = {
  // Absolute: the requested title already carries the brand, so the root
  // "%s | Smile AI Marketing" template must not append it a second time.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "Smile AI Marketing",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const WHO_WE_HELP = [
  { title: "Dental clinics", detail: "Single-location practices that want more of the right patients finding them online." },
  { title: "Practice owners", detail: "Owners who need a clear, prioritised view of what their website and listings are doing for them." },
  { title: "Dentists", detail: "Clinicians who want plain-English answers, not marketing jargon or vanity metrics." },
  { title: "Practice managers", detail: "The people who field the enquiries and know where the patient journey breaks down." },
  { title: "Growing dental groups", detail: "Multi-location groups that need consistency across every practice's web presence." },
];

const FOCUS_AREAS: { Icon: typeof IconMapPin; title: string; detail: string }[] = [
  {
    Icon: IconMapPin,
    title: "Local Visibility",
    detail: "Help practices improve how they appear across search and local discovery, where most patients start looking.",
  },
  {
    Icon: IconMonitor,
    title: "Website Experience",
    detail: "Make it easier for potential patients to understand your services and take the next step — call, book or ask a question.",
  },
  {
    Icon: IconSearch,
    title: "SEO & Content",
    detail: "Improve page structure, relevance and visibility without keyword stuffing or content written for robots.",
  },
  {
    Icon: IconTrendingUp,
    title: "Performance & Insights",
    detail: "Use website audits, PageSpeed data and evidence to identify what should be fixed first.",
  },
];

const APPROACH = [
  {
    title: "Understand the practice",
    detail: "Your services, the patients you want more of, and where enquiries come from today.",
  },
  {
    title: "Audit what is happening now",
    detail: "We crawl your website, run technical and content checks, and pull Google's PageSpeed data for the pages that matter.",
  },
  {
    title: "Prioritise the biggest opportunities",
    detail: "Findings are ranked by severity, how many pages they affect and the effort to fix — so you know what to do first.",
  },
  {
    title: "Improve and measure",
    detail: "Fix what matters most, then re-check the same data to see what actually changed.",
  },
];

const EVIDENCE_SOURCES = [
  "A crawl of your website's pages — titles, headings, content, links and images",
  "Technical checks: indexability, redirects, structured data, security and HTML weight",
  "Google PageSpeed Insights results on mobile and desktop — performance, accessibility, best practices and SEO basics",
  "How easily a visitor can find your phone number, services and a way to book",
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
              <div className="max-w-3xl">
                <Eyebrow>About Smile AI Marketing</Eyebrow>
                <h1 className="mt-5 text-heading-1 text-foreground">
                  Marketing Built Around the Way Dental Practices Grow
                </h1>
                <p className="mt-5 max-w-2xl text-body-large text-muted-foreground">
                  Smile AI Marketing helps Canadian dental practices improve how they are found, understood and chosen online. We combine website strategy, local search visibility, performance insights and practical marketing recommendations to help practices build a stronger digital presence.
                </p>
              </div>
              <AboutVisual />
            </div>
          </div>
        </section>

        {/* Who we help */}
        <section className="container-site section-space">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="max-w-xl">
              <Eyebrow>Who we help</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">Dental practices, and the people who run them.</h2>
              <p className="mt-4 text-body-large text-muted-foreground">
                We work only with dentistry. That focus means the checks we run, the language we use and the fixes we recommend are built around how a patient actually chooses a dentist — not borrowed from a generic agency playbook.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {WHO_WE_HELP.map((item) => (
                <li key={item.title} className="card flex items-start gap-3 p-5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-heading-4 text-foreground">{item.title}</h3>
                    <p className="mt-1 text-body-small text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What we focus on */}
        <section className="border-y border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="max-w-2xl">
              <Eyebrow>What we focus on</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">Four things that decide whether a patient finds you and books.</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FOCUS_AREAS.map((area) => (
                <div key={area.title} className="card flex flex-col p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <area.Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-heading-4 text-foreground">{area.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground">{area.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our approach */}
        <section className="container-site section-space">
          <div className="max-w-2xl">
            <Eyebrow>Our approach</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">Simple, in the right order.</h2>
          </div>
          <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute top-6 bottom-6 left-6 w-px bg-border sm:hidden" aria-hidden="true" />
            {APPROACH.map((step, i) => (
              <li key={step.title} className="relative flex items-start gap-4 lg:flex-col lg:gap-5">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-[0.9375rem] font-semibold text-foreground ring-4 ring-[var(--color-background)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-2 lg:pt-0">
                  <h3 className="text-heading-4 text-foreground">{step.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Evidence before assumptions */}
        <section className="band-dark">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
              <div className="max-w-xl">
                <Eyebrow tone="dark">Evidence before assumptions</Eyebrow>
                <h2 className="mt-4 text-heading-2 text-foreground">Recommendations you can check for yourself.</h2>
                <p className="mt-4 text-body-large text-muted-foreground">
                  Every recommendation we make is tied to something we measured on your website: a crawl of your pages, technical checks and Google&apos;s own performance data. You see what was tested, what was found and why it matters before anything is proposed.
                </p>
                <p className="mt-4 text-body text-muted-foreground">
                  What we won&apos;t do is promise a ranking, a number of enquiries or a revenue figure. Results depend on your market, your competitors and where your practice is starting from — so we show the evidence and let it make the case.
                </p>
              </div>
              <div className="card !bg-surface p-6 sm:p-8">
                <p className="text-eyebrow text-muted-foreground">What our recommendations are based on</p>
                <ul className="mt-5 space-y-4">
                  {EVIDENCE_SOURCES.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-body-small text-foreground-secondary">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Canadian dental focus */}
        <section className="container-site section-space">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Eyebrow>Canadian dental focus</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">Built for practices in Canada.</h2>
            </div>
            <div className="max-w-2xl">
              <p className="text-body-large text-muted-foreground">
                Everything here — the audit, the recommendations and the way we talk about them — is designed around Canadian dental practices: how patients search for a dentist near them, how practices present their services, and what a clinic&apos;s website needs to do well.
              </p>
              <p className="mt-4 text-body text-muted-foreground">
                We work with practices across Canada, starting in {TARGET_CITY}, {TARGET_PROVINCE}. Because the audit runs entirely on your public website and listings, there is nothing to install and no account access to hand over.
              </p>
            </div>
          </div>
        </section>
      </main>
      <PageCta
        heading="See What Your Dental Website Could Be Doing Better"
        copy="Start with a free website audit — no logins, no obligation, and a clear picture of what to fix first."
      />
      <Footer />
    </>
  );
}
