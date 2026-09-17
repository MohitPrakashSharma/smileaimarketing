export type ServiceIcon = "layout" | "mapPin" | "search" | "gauge" | "link" | "fileText" | "cursorClick" | "clipboardCheck";

/**
 * How established a service is in the business today — internal only, never
 * rendered. Drives the approval list in the hand-off notes:
 *   established      — already represented on the site / in the audit product
 *   new              — introduced by the 2026 services catalogue; described in
 *                      general, verifiable terms
 *   confirm-scope    — delivery scope should be confirmed before promotion
 */
export type ServiceAvailability = "established" | "new" | "confirm-scope";

export type Service = {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  subhead: string;
  icon: ServiceIcon;
  /** One line for the mega menu (≤ 70 characters). */
  short: string;
  /** Two sentences for the /services grid. */
  summary: string;
  /** The practical benefit shown on the card — never a guarantee. */
  benefit: string;
  /** What the service is, in plain language — two or three short paragraphs. */
  overview: string[];
  /** Dental-practice problems it addresses. */
  problems: { title: string; detail: string }[];
  /** What the service includes. */
  includes: { title: string; detail: string }[];
  /** How the process works, in order. */
  process: { title: string; detail: string }[];
  /** Practical benefits, without guarantees. */
  benefits: string[];
  /** Slugs of complementary services. */
  related: string[];
  faqHeading: string;
  faqs: { q: string; a: string }[];
  /** Closing consultation CTA. */
  cta: { heading: string; copy: string };
  /** Shown in the homepage featured-services section. */
  featured?: boolean;
  availability: ServiceAvailability;
};

/**
 * Service pages are hand-authored, typed content — same pattern as
 * lib/caseStudies.ts. One shared template (app/services/[slug]/page.tsx)
 * renders every service from this data; each entry carries its own
 * problems, inclusions, process and FAQs so pages read as distinct
 * services rather than the same page with the keyword swapped.
 *
 * Copy rules (docs/2026-content-strategy.md): Canadian English, plain
 * language, no guaranteed rankings, patient numbers or revenue, no invented
 * results, credentials or tooling. The free audit is the entry point for
 * every service, so each page links to it.
 */
export const SERVICES: Service[] = [
  {
    slug: "dental-website-design-development",
    title: "Dental Website Design & Development",
    seoTitle: "Dental Website Design & Development",
    metaDescription:
      "Dental website design and development for Canadian practices: mobile-friendly layouts, clear service pages, calls to action and appointment enquiry integration — built so patients understand your practice and take the next step.",
    eyebrow: "DENTAL WEBSITE DESIGN & DEVELOPMENT",
    h1: "A dental website that helps patients understand your practice — and take the next step.",
    subhead:
      "Most patients meet your practice on a phone screen before they ever call. We design and build dental websites that explain your services clearly, load well on mobile and make it obvious how to get in touch — whether that is a new site or a redesign of the one you have.",
    icon: "layout",
    short: "Mobile-friendly sites that make the next step obvious.",
    summary:
      "Design and development for dental practice websites: clear service pages, mobile-friendly layouts and appointment enquiry paths. Suitable for a new site or a redesign of an existing one.",
    benefit: "Visitors find what they need and know how to contact you.",
    featured: true,
    availability: "new",
    overview: [
      "Your website is where a prospective patient decides whether your practice feels like the right fit: what you offer, who you treat, where you are and how to book. When any of that is hard to find, people leave — not because of your dentistry, but because the site did not answer the question they arrived with.",
      "We design and build websites for dental practices with that visitor in mind. The structure follows the questions patients actually ask, each service or treatment gets its own clear page, and every page leads to a simple way to get in touch. The result is a site your team can point patients to with confidence.",
      "Redesigning an existing site? We start from what already works — your content, your rankings, your existing pages — and improve the experience without discarding what search engines already know about you.",
    ],
    problems: [
      { title: "Patients cannot tell what you offer", detail: "Services are buried in a single paragraph or a PDF, so a visitor looking for Invisalign, sedation or a children's dentist cannot confirm you provide it." },
      { title: "The site is awkward on a phone", detail: "Text that needs pinching, menus that hide the phone number and forms that break on mobile — the device most patients use." },
      { title: "No clear next step", detail: "The phone number is plain text, the booking link is at the bottom of the page and there is no short enquiry form. Interested visitors have to work to contact you." },
      { title: "A redesign that would lose ground", detail: "Rebuilding without a plan for existing URLs, content and rankings can undo years of search visibility overnight." },
    ],
    includes: [
      { title: "Website design", detail: "A layout and visual style suited to a dental practice — professional, calm and easy to scan — within your existing brand." },
      { title: "Responsive development", detail: "Built to work on phones, tablets and desktops, with layouts that adapt rather than shrink." },
      { title: "Service and treatment pages", detail: "A dedicated page for each service you want to be found for, structured for both patients and search engines." },
      { title: "User experience and navigation", detail: "Menus, page order and content hierarchy organized around how patients look for a dentist." },
      { title: "Calls to action", detail: "Tap-to-call numbers, visible booking buttons and clear prompts on every page, not just the homepage." },
      { title: "Contact and appointment enquiry integration", detail: "Short enquiry forms and links to your existing booking or phone workflow, so requests reach your front desk." },
      { title: "Website redesign", detail: "Migration planning for existing pages and URLs, so a redesign improves the site without losing what already ranks." },
    ],
    process: [
      { title: "Understand the practice", detail: "Your services, the patients you want more of, how appointments are booked today and what the current site gets right and wrong." },
      { title: "Plan the structure", detail: "A page-by-page plan: what each page is for, what it needs to say and where it leads. You approve this before anything is designed." },
      { title: "Design and build", detail: "Design in stages you can review, then development on a mobile-first basis with the calls to action and enquiry integration built in." },
      { title: "Launch and check", detail: "Redirects for old URLs, a technical check with our audit tools before and after launch, and a walkthrough for your team." },
    ],
    benefits: [
      "Service pages a patient can find and understand in seconds",
      "A site that works properly on the phone in a patient's hand",
      "A clear route from any page to a call, form or booking",
      "A redesign that keeps the search visibility you already have",
    ],
    related: ["conversion-rate-optimization", "on-page-seo", "technical-seo-pagespeed"],
    faqHeading: "Questions about dental website design",
    faqs: [
      { q: "Will a new website guarantee more bookings?", a: "No. A website can make it much easier for interested patients to understand your practice and get in touch, but bookings depend on many things a website does not control — location, availability, insurance, reputation. We design for clarity and ease, and we measure enquiries honestly." },
      { q: "Can you redesign our existing site rather than start over?", a: "Yes. In most cases a redesign keeps your existing content, URLs and rankings and improves the structure, mobile experience and calls to action around them. We plan redirects for anything that moves." },
      { q: "Do we need to write the content ourselves?", a: "Not necessarily. We can draft page content from an interview with your team and your existing material. Clinical information is written for professional review by your practice before it is published." },
      { q: "Which platform do you build on?", a: "That depends on what your team needs to maintain afterwards. We will recommend a platform once we understand who updates the site, how often, and what it needs to connect to — and explain the trade-offs before you decide." },
    ],
    cta: { heading: "Talk through what your website needs to do", copy: "Book a website review with our team. We will look at your current site with you and outline what a design or redesign should change — before you commit to anything." },
  },

  {
    slug: "local-seo-for-dentists",
    title: "Local SEO & Google Maps",
    seoTitle: "Local SEO for Dentists",
    metaDescription:
      "Local SEO for Canadian dental practices: Google Business Profile optimization, local keyword research, location pages, listing consistency and citations — checked from public data, with no guaranteed map rankings.",
    eyebrow: "LOCAL SEO FOR DENTISTS",
    h1: "Show up when nearby patients search for a dentist.",
    subhead:
      "Most new patients start with a search like “dentist near me”. We check your Google Maps ranking, business listing consistency and how you compare with nearby practices — then show you exactly what's holding your visibility back. No guesses, and no promises about where you'll rank.",
    icon: "mapPin",
    short: "Be found in Google Maps and local search near your practice.",
    summary:
      "Google Business Profile optimization, local keyword research, location pages and consistent business information across the listings patients and Google check. Measured from public search results, not a black-box score.",
    benefit: "Your practice appears for the local searches that matter.",
    featured: true,
    availability: "established",
    overview: [
      "Local search is where a nearby patient decides which practices to consider: the map pack, the listings underneath it and the details Google shows for each one. Where you appear depends on how relevant, complete and consistent your practice looks across all of it.",
      "Our local SEO work starts from what is publicly visible — your Google Business Profile, your listings, the searches people in your area actually make — and improves the signals Google uses to decide whether your practice is a good match for them.",
    ],
    problems: [
      { title: "Missing from the map pack", detail: "Your practice doesn't appear in the top local results for the searches that matter most." },
      { title: "Inconsistent listing details", detail: "Mismatched name, address, or phone details across directories can quietly work against your ranking." },
      { title: "Thinner review signals than nearby competitors", detail: "Fewer or older reviews than the practices currently ahead of you in local results." },
      { title: "One page trying to cover every area", detail: "A practice serving several neighbourhoods or towns with a single generic page gives Google little reason to show it for any of them." },
    ],
    includes: [
      { title: "Google Business Profile optimization", detail: "Categories, services, hours, photos, description and attributes completed and kept accurate — the listing patients see first." },
      { title: "Local keyword research", detail: "The searches people in your area actually use for the services you offer, and which of them your pages currently answer." },
      { title: "Location-specific pages", detail: "Pages for the areas you genuinely serve, with real local detail, rather than one page with a city name swapped in." },
      { title: "Business information consistency", detail: "Your name, address and phone number matched across your website, Google and the directories that reference you." },
      { title: "Local citations", detail: "Listings on the directories that matter for Canadian dental practices, completed consistently." },
      { title: "Local relevance on your site", detail: "Location signals on the pages themselves: addresses, service areas, structured data and internal links to your location content." },
      { title: "Visibility tracking", detail: "Where you appear for your core local searches over time, checked from live public results." },
    ],
    process: [
      { title: "Measure where you stand", detail: "Your live position for local searches, your listing details and how you compare with the practices nearby — the same check our free audit runs." },
      { title: "Fix the foundations", detail: "Google Business Profile, business information consistency and citations, in that order." },
      { title: "Build local relevance", detail: "Location pages, service pages with local context and the structured data that connects them." },
      { title: "Review and adjust", detail: "Track visibility for the searches that matter and adjust based on what the results show, not on assumptions." },
    ],
    benefits: [
      "A complete, accurate Google Business Profile patients can trust",
      "Consistent practice details everywhere Google looks",
      "Pages that answer local searches for the areas you serve",
      "A clear picture of your local visibility over time",
    ],
    related: ["on-page-seo", "off-page-seo", "seo-audit-strategy"],
    faqHeading: "Questions about local SEO",
    faqs: [
      { q: "Can you guarantee a #1 Google ranking?", a: "No — and any agency that promises this isn't being straight with you. Local rankings depend on factors outside any agency's control, including Google's own algorithm changes. What we do instead is show you exactly where you stand today and what's realistic to improve." },
      { q: "Do you need access to my Google Business Profile to check this?", a: "No. The initial audit is based on public search and map results — the same thing a prospective patient would see. We don't need any login access to run it. Ongoing optimization of the profile itself does need manager access, which you grant and can revoke at any time." },
      { q: "How is my current ranking actually measured?", a: "We check your live position in Google's local results for your practice's core search terms and city, alongside publicly visible listing and review data — not a black-box score." },
      { q: "How long does a local SEO audit take?", a: "The initial scan runs in under a minute. Once you unlock the full report, you get the complete visibility and competitor breakdown right away." },
    ],
    cta: { heading: "See where your practice actually stands in local search.", copy: "Free website audit — just your website and city, no logins. Results in about two minutes." },
  },

  {
    slug: "on-page-seo",
    title: "On-Page SEO",
    seoTitle: "On-Page SEO for Dental Websites",
    metaDescription:
      "On-page SEO for Canadian dental websites: page titles and meta descriptions, heading structure, search intent, internal linking, image alt text and service page optimization — fixing the problems our audits find most often.",
    eyebrow: "ON-PAGE SEO",
    h1: "Make every page say clearly what it is about — to patients and to Google.",
    subhead:
      "On-page SEO is the work done on the pages themselves: titles, descriptions, headings, text, links and images. It is where most dental websites lose visibility they could easily have — and it is the area our audits flag most often.",
    icon: "search",
    short: "Titles, headings, content and links that match what patients search.",
    summary:
      "Page titles, meta descriptions, heading structure, internal linking, image alt text and service page content aligned with what patients search for. The on-page basics our audits find missing on most dental sites.",
    benefit: "Pages that search engines understand and patients trust.",
    availability: "confirm-scope",
    overview: [
      "Search engines decide what a page is about from the page itself: its title, its headings, the words on it, the images and the links pointing in and out. When those signals are missing or muddled — a page titled “Home”, three H1s, a service described in one line — the page is hard to rank for anything, however good the practice behind it.",
      "On-page SEO puts those signals in order, page by page. It is unglamorous work, but it is where dental websites most often have easy ground to make up: across the audits we run, missing meta descriptions, weak headings, thin service pages and images without alt text are the most common findings.",
    ],
    problems: [
      { title: "Titles and descriptions that do not sell the page", detail: "Duplicate or auto-generated titles and missing descriptions make your listing in Google results weaker than it needs to be — on every page affected." },
      { title: "Headings that give search engines no outline", detail: "Missing H1s, multiple H1s or skipped heading levels blur what the page is about." },
      { title: "Service pages with almost no content", detail: "A page with a heading and two sentences gives search engines nothing to match a patient's search against." },
      { title: "Pages that do not point to each other", detail: "Service pages, location pages and articles that never link to one another waste the relevance each one has built." },
    ],
    includes: [
      { title: "Page titles and meta descriptions", detail: "Unique, specific titles and descriptions for every important page, naming the service and the location without stuffing keywords." },
      { title: "Heading structure", detail: "One clear H1 per page and a sensible H2/H3 outline that mirrors how the content is organized." },
      { title: "Search intent alignment", detail: "Matching each page to the question a patient is asking — informational, comparison or ready-to-book — and writing for that." },
      { title: "Service page optimization", detail: "Expanding thin service pages with the detail patients need: what the treatment involves, who it is for, what to expect, how to enquire." },
      { title: "Internal linking", detail: "Descriptive links between related pages so patients and search engines can move naturally through your site." },
      { title: "Image alt text", detail: "Meaningful alt text for the images that matter, for accessibility and for search." },
      { title: "Content relevance checks", detail: "Regular checks that pages still match the searches they are meant to answer as your services change." },
    ],
    process: [
      { title: "Audit the pages", detail: "Our crawl-based audit lists every on-page issue by page — titles, descriptions, headings, thin content, alt text, internal links — with the affected URLs." },
      { title: "Prioritize by page", detail: "Service and location pages first, then the rest, ordered by how many patients each page can realistically reach." },
      { title: "Rework page by page", detail: "Title, description, headings, body content, images and links revised together, so each page is fixed once rather than patched repeatedly." },
      { title: "Re-check", detail: "Re-run the audit to confirm each issue is resolved and catch anything new." },
    ],
    benefits: [
      "A listing in Google results that describes each page accurately",
      "Service pages with enough substance to answer a patient's search",
      "A site structure search engines can follow",
      "Issues fixed once, with a re-audit to prove it",
    ],
    related: ["dental-content-marketing", "technical-seo-pagespeed", "local-seo-for-dentists"],
    faqHeading: "Questions about on-page SEO",
    faqs: [
      { q: "How is on-page SEO different from technical SEO?", a: "On-page SEO is about the content and structure of individual pages — titles, headings, text, links, images. Technical SEO is about whether search engines can reach, load and index the site at all. They overlap at the edges, and most practices need both, but they are different jobs." },
      { q: "Do you rewrite our service pages?", a: "We can, with your review. Descriptions of treatments and clinical information are drafted for the practice to check before publication — we do not publish clinical claims on your behalf." },
      { q: "Will fixing titles and headings improve rankings?", a: "It improves how clearly search engines understand your pages, which is a prerequisite for ranking well — but rankings depend on competition and many other factors. We show the before-and-after audit results rather than promise positions." },
      { q: "Where do we start?", a: "With the free audit. It lists the on-page problems on your site by page and severity, so we both know the scope before any work is scoped or priced." },
    ],
    cta: { heading: "Find out what your pages are missing", copy: "The free audit lists every on-page issue by page. Book a review with our team to go through the findings and decide what to fix first." },
  },

  {
    slug: "technical-seo-pagespeed",
    title: "Technical SEO & PageSpeed",
    seoTitle: "Technical SEO & PageSpeed for Dental Websites",
    metaDescription:
      "Technical SEO and PageSpeed improvements for Canadian dental websites: crawlability, indexing and canonical issues, XML sitemaps, broken links and redirects, Core Web Vitals and mobile performance — measured with our audit and Google PageSpeed Insights.",
    eyebrow: "TECHNICAL SEO & PAGESPEED",
    h1: "Fix what stops search engines — and phones — from loading your site properly.",
    subhead:
      "Technical SEO covers everything that has to work before content can rank: crawlability, indexing, sitemaps, redirects and speed. Our audit checks all of it on every page it crawls and tests key pages with Google PageSpeed Insights, so the fixes are specific rather than generic.",
    icon: "gauge",
    short: "Crawlability, indexing, Core Web Vitals and mobile speed.",
    summary:
      "Crawlability, indexing and canonical issues, XML sitemaps, broken links and redirects, Core Web Vitals and mobile loading. Measured by our own crawl-based audit and by Google PageSpeed Insights, then fixed in priority order.",
    benefit: "A site search engines can index and phones can load.",
    featured: true,
    availability: "confirm-scope",
    overview: [
      "A dental website can have good content and still be held back by problems nobody sees: a canonical tag pointing at the wrong URL, a sitemap full of dead pages, redirect chains, a homepage that takes ten seconds to show anything on a phone. Search engines notice all of it, and so do visitors.",
      "Our audit finds these problems across every page it crawls and tests the pages that matter most with Google PageSpeed Insights. Two measurements are reported side by side and kept separate: our SEO health score, which deducts points for every verified issue across the crawled pages, and Google's own PageSpeed scores for one page on one device at a time. Technical SEO work then fixes what was found, starting with the issues that affect the most pages.",
    ],
    problems: [
      { title: "Pages search engines cannot use", detail: "Noindex tags, canonicals pointing elsewhere, or robots rules that block important pages — a single wrong setting can remove a page from search." },
      { title: "Slow pages on mobile", detail: "Large images, render-blocking scripts and third-party widgets that push the main content out for seconds on a phone." },
      { title: "Broken links and redirect chains", detail: "Dead internal links and multi-hop redirects that waste crawl budget and send visitors to error pages." },
      { title: "A sitemap that misleads", detail: "Sitemaps listing redirected, missing or non-indexable URLs give search engines a poor map of the site." },
    ],
    includes: [
      { title: "Technical SEO audit", detail: "A crawl of your site checking indexability, canonicals, robots rules, sitemaps, redirects, HTTPS and security headers, structured data and HTML basics — with the affected URLs listed." },
      { title: "Crawlability and indexing fixes", detail: "Correcting canonical, noindex and robots issues so the right pages are eligible to appear in search." },
      { title: "XML sitemap clean-up", detail: "A sitemap of live, indexable URLs that search engines can rely on." },
      { title: "Broken links and redirects", detail: "Fixing or redirecting dead URLs and flattening redirect chains." },
      { title: "Core Web Vitals", detail: "Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift, using Google's lab and real-user data where Google provides it." },
      { title: "Mobile performance and loading improvements", detail: "Image optimization, caching and compression, render-blocking resources and third-party script clean-up, prioritized by measured savings." },
      { title: "Before-and-after verification", detail: "Re-running the audit and PageSpeed tests after changes so improvements are measured, not assumed." },
    ],
    process: [
      { title: "Audit", detail: "The free audit crawls your site and runs Google PageSpeed on representative pages. Every issue comes with the pages it affects and its severity." },
      { title: "Prioritize", detail: "Issues ordered by severity and reach: what blocks indexing first, then what slows the most pages, then the rest." },
      { title: "Fix", detail: "Changes made with your developer or ours, with a clear list of what was changed and why." },
      { title: "Verify", detail: "A re-audit and fresh PageSpeed tests confirm each fix and show the new baseline." },
    ],
    benefits: [
      "Important pages that search engines can crawl and index",
      "Faster loading on the phones patients actually use",
      "A clean sitemap, working links and short redirects",
      "Measured before-and-after results, not a promise of a score",
    ],
    related: ["on-page-seo", "dental-website-design-development", "seo-audit-strategy"],
    faqHeading: "Questions about technical SEO and PageSpeed",
    faqs: [
      { q: "What is the difference between your score and Google's PageSpeed score?", a: "Our SEO health score starts at 100 and deducts points for every verified technical, content and performance issue across all the pages we crawled. Google's PageSpeed score is for one page on one device at a time. They measure different things, so the report shows both and never mixes them." },
      { q: "Do you need access to our website to run the audit?", a: "No. The audit works from your public website, the same way a search engine does. Making the fixes does need access to the site or a developer who has it." },
      { q: "Will a better PageSpeed score improve our rankings?", a: "Page experience is one of many signals Google uses, and a faster site is better for visitors regardless of rankings. We do not promise ranking changes from speed work; we report the measured improvement." },
      { q: "What does 'not measured' mean in the report?", a: "It means Google PageSpeed Insights could not test the site during that audit run — for example because of a temporary API limit. It is a disclosure, not a mark against your site, and it never affects your score." },
    ],
    cta: { heading: "Start with the technical audit", copy: "The free audit runs the crawl and the PageSpeed tests for you. Book a review and we will walk through the technical findings and what to fix first." },
  },

  {
    slug: "off-page-seo",
    title: "Off-Page SEO",
    seoTitle: "Off-Page SEO for Dental Practices",
    metaDescription:
      "Off-page SEO for Canadian dental practices: relevant backlinks, local business citations, digital PR and dental industry mentions that build authority the right way — no link schemes or purchased rankings.",
    eyebrow: "OFF-PAGE SEO",
    h1: "Build authority for your practice beyond your own website.",
    subhead:
      "Off-page SEO is what other websites say about yours: links, citations, mentions and coverage. Done properly it builds the authority search engines look for. Done badly it is a liability. We only pursue links and mentions that make sense for a real dental practice.",
    icon: "link",
    short: "Relevant links, citations and mentions — earned, not bought.",
    summary:
      "Relevant backlink acquisition, local business citations, digital PR and mentions in the dental and local community. Authority built through relationships and useful content — never through link schemes.",
    benefit: "Credible references to your practice from sources that matter.",
    availability: "new",
    overview: [
      "Search engines treat links and mentions from other websites as references: if reputable, relevant sites point to a practice, that practice is more likely to be a good answer. For a dental practice the relevant sources are local — community organizations, local news, professional associations, suppliers and partners — plus the directories patients actually use.",
      "Our off-page work is deliberately conservative. We look for links and mentions a practice would be happy to have regardless of SEO, and we say no to anything that would not survive a look from Google's spam team: paid link networks, guest-post farms, automated directories and 'guaranteed' placements.",
    ],
    problems: [
      { title: "No references beyond your own site", detail: "A site nobody links to gives search engines little external evidence that the practice is established." },
      { title: "Incomplete or inconsistent citations", detail: "Missing from the directories that matter, or listed with different names and phone numbers in each." },
      { title: "Risky links from past SEO work", detail: "Links bought or automated by a previous provider that can hold a site back rather than help it." },
      { title: "Good community work nobody can find online", detail: "Sponsorships, school visits and local partnerships that never turn into a mention or a link." },
    ],
    includes: [
      { title: "Backlink review", detail: "A look at the links your site already has, with anything harmful flagged for disavowal." },
      { title: "Relevant backlink acquisition", detail: "Outreach to local and dental-relevant sites where a link to your practice is a natural fit." },
      { title: "Local business citations", detail: "Complete, consistent listings on the directories relevant to Canadian dental practices." },
      { title: "Digital PR", detail: "Turning genuine practice news — new services, community involvement, team milestones — into coverage on local and industry sites." },
      { title: "Authority-building content", detail: "Resources worth referencing, such as patient guides, that give other sites a reason to link." },
      { title: "Dental industry mentions", detail: "Association listings, supplier and partner pages, and professional profiles that reference the practice." },
    ],
    process: [
      { title: "Review what exists", detail: "Current links, citations and mentions, and anything that should be cleaned up first." },
      { title: "Identify real opportunities", detail: "Local organizations, industry sources and directories where a mention is relevant and achievable." },
      { title: "Earn the references", detail: "Outreach, PR and citation work carried out openly, with the practice's approval on anything published in its name." },
      { title: "Report honestly", detail: "A record of what was gained, what was declined and why." },
    ],
    benefits: [
      "References from sources that are relevant to a dental practice",
      "Consistent citations across the directories that matter",
      "Community involvement that is visible online",
      "No exposure to link schemes or manual penalties",
    ],
    related: ["local-seo-for-dentists", "dental-content-marketing", "seo-audit-strategy"],
    faqHeading: "Questions about off-page SEO",
    faqs: [
      { q: "Do you buy links?", a: "No. Paid link placements and link networks violate Google's guidelines and put the practice at risk. We pursue links and mentions that are relevant and earned, and we will tell you when an opportunity is not worth it." },
      { q: "How many links will we get?", a: "We do not promise a number. Relevant links for a local dental practice come from a limited set of sources, and a handful of the right ones is worth more than dozens of the wrong ones. We report what was earned each period." },
      { q: "Can you remove bad links from a previous agency?", a: "We can review your link profile, flag links that look harmful and prepare a disavow file for Google where warranted. Removal itself depends on the sites hosting the links." },
      { q: "Is off-page SEO necessary if our local SEO is good?", a: "Not always. For many practices, a complete Google Business Profile, consistent citations and strong pages are the priority. Off-page work matters most in competitive areas — the audit and a conversation will tell us which applies to you." },
    ],
    cta: { heading: "Find out whether off-page work is your priority", copy: "Book a consultation. We will look at your local visibility and existing links with you and tell you plainly whether off-page SEO is worth pursuing yet." },
  },

  {
    slug: "dental-content-marketing",
    title: "Dental Content Marketing",
    seoTitle: "Dental Content Marketing",
    metaDescription:
      "Dental content marketing for Canadian practices: service page content, informational articles, patient FAQs and a content strategy aligned with what patients search for — written for your practice's professional review.",
    eyebrow: "DENTAL CONTENT MARKETING",
    h1: "Content that answers patients' questions before they pick up the phone.",
    subhead:
      "Patients search for answers long before they search for a dentist: what a procedure involves, whether it hurts, what it costs, whether it is covered. Content marketing gives your practice those answers, in your own voice, on pages that can be found — with clinical information reviewed by your practice before it goes live.",
    icon: "fileText",
    short: "Service pages, articles and FAQs written for real patient questions.",
    summary:
      "Service page content, informational articles, patient FAQs and a content plan aligned with the searches patients actually make. Written in plain language and prepared for your practice's professional review.",
    benefit: "Your practice answers the questions patients are already asking.",
    availability: "new",
    overview: [
      "Most dental websites describe services in a sentence or two and leave the rest to the phone call. Patients, meanwhile, are searching: “does a root canal hurt”, “how much is Invisalign in Ontario”, “dentist for anxious patients”. Content marketing means having useful, accurate answers to those questions on your own site.",
      "We plan content around real search demand and the services you want to grow, write it in plain language for your patients, and structure it so search engines can find it. Anything clinical — treatment descriptions, risks, aftercare, eligibility — is drafted for review and approval by your dental team before it is published. We do not invent outcomes or make treatment claims on your behalf.",
    ],
    problems: [
      { title: "Service pages with nothing to read", detail: "A heading and two lines cannot answer a patient's questions or give search engines anything to rank." },
      { title: "No answers to common questions", detail: "Cost, pain, insurance, what to expect — the questions every patient has are answered nowhere on the site." },
      { title: "Content that has drifted out of date", detail: "Old team members, retired services and pricing from years ago still live on pages patients read." },
      { title: "Articles written for keywords, not people", detail: "Generic posts that repeat a phrase a dozen times and help nobody." },
    ],
    includes: [
      { title: "Content strategy", detail: "A plan for which pages and articles to create or improve, based on search demand, your services and what the audit shows is missing." },
      { title: "Dental service page content", detail: "Substantial, readable pages for each treatment: what it is, who it is for, what to expect, how to enquire." },
      { title: "Informational articles", detail: "Guides and explainers for the questions patients search for before booking." },
      { title: "Patient FAQs", detail: "Clear answers to common questions, structured so they can appear directly in search results." },
      { title: "Search-intent alignment", detail: "Each piece written for the question behind the search — learning, comparing or ready to book." },
      { title: "Professional review workflow", detail: "Clinical content prepared for your dentist's review, with a record of what was approved and when." },
      { title: "Content updates", detail: "Scheduled reviews so pages stay accurate as your team, services and prices change." },
    ],
    process: [
      { title: "Map the questions", detail: "The searches patients make about your services, the pages that should answer them and the gaps on your site today." },
      { title: "Agree the plan", detail: "A short content plan you approve: what gets written, in what order, and who reviews it." },
      { title: "Draft and review", detail: "Plain-language drafts, reviewed by your practice for clinical accuracy before anything is published." },
      { title: "Publish and maintain", detail: "Pages published with the right structure and links, then revisited on a schedule so they stay current." },
    ],
    benefits: [
      "Service pages patients can actually learn from",
      "Answers to the questions that precede a booking",
      "Content that is accurate because your team reviewed it",
      "A site that stays current instead of slowly going stale",
    ],
    related: ["on-page-seo", "conversion-rate-optimization", "off-page-seo"],
    faqHeading: "Questions about dental content marketing",
    faqs: [
      { q: "Who writes the clinical information?", a: "We draft it from your input and reputable sources, and your dentist or clinical lead reviews and approves it before publication. Nothing clinical is published without that review." },
      { q: "Will you use AI to write our content?", a: "We use software to research search demand and to help structure drafts, but every published page is edited by a person and reviewed by your practice. We do not publish unedited generated text." },
      { q: "How much content do we need?", a: "Usually less than agencies suggest. A complete page for each service you want to be found for, answers to the common patient questions, and a small number of genuinely useful articles go a long way. The plan is sized to your practice." },
      { q: "Can content marketing promise more patients?", a: "No. Good content makes your practice easier to find and easier to trust; whether a reader becomes a patient depends on much more than the page. We measure what content does — visibility and enquiries — rather than promise results." },
    ],
    cta: { heading: "See which questions your site leaves unanswered", copy: "Book a consultation. We will review your current pages with you and outline the content that would make the biggest difference first." },
  },

  {
    slug: "conversion-rate-optimization",
    title: "Conversion Rate Optimization",
    seoTitle: "Conversion Rate Optimization for Dental Websites",
    metaDescription:
      "Conversion rate optimization for Canadian dental websites: conversion audits, calls to action, enquiry forms, mobile usability, the appointment journey and analytics-driven testing — helping more visitors take the next step.",
    eyebrow: "CONVERSION RATE OPTIMIZATION",
    h1: "Help more of the visitors you already have take the next step.",
    subhead:
      "Conversion rate optimization (CRO) is simple to explain: of the people who visit your website, how many do something — call, book, send an enquiry — and what is stopping the rest? We find the obstacles and remove them, then measure whether it made a difference.",
    icon: "cursorClick",
    short: "Remove what stops visitors from calling or booking.",
    summary:
      "Conversion audits, calls to action, enquiry forms, mobile usability and the appointment journey — the steps between arriving on your site and getting in touch. Improved with evidence, then measured.",
    benefit: "Fewer interested visitors lost between your site and your front desk.",
    featured: true,
    availability: "confirm-scope",
    overview: [
      "Attracting visitors is only half the job. A practice can rank well and still lose most of its visitors at the last step: a phone number that cannot be tapped, a form that asks for too much, a booking link hidden at the bottom of the page, a mobile layout that makes the next step hard to find.",
      "CRO looks at that journey from the visitor's side. Where do people arrive, what are they trying to do, and what gets in the way? Our audit already checks the basics — tap-to-call links, visible calls to action, enquiry forms, trust information — and CRO work goes further, using your analytics to see where visitors drop off and testing changes rather than guessing.",
    ],
    problems: [
      { title: "No obvious way to get in touch", detail: "The phone number is plain text, the booking link is buried and there is no short form — on the pages patients land on." },
      { title: "Forms that ask too much", detail: "Long enquiry forms, mandatory fields nobody needs and no confirmation that the message arrived." },
      { title: "A mobile experience that fights the visitor", detail: "Small tap targets, sticky elements covering the content and layouts that shift while loading." },
      { title: "Landing pages that do not match the promise", detail: "An ad or search result promises one thing; the page delivers a generic homepage." },
    ],
    includes: [
      { title: "Website conversion audit", detail: "A page-by-page review of how visitors are asked to get in touch, what is in the way, and what your analytics show about where they leave." },
      { title: "Calls to action", detail: "Clear, consistent prompts — tap-to-call, book, enquire — placed where visitors are ready for them." },
      { title: "Enquiry forms", detail: "Short forms that ask only what the front desk needs, with confirmation and a reliable route to your inbox." },
      { title: "Mobile usability", detail: "Tap targets, layout stability and navigation checked on real phone sizes." },
      { title: "Appointment journey", detail: "The steps from a service page to a confirmed request, simplified and connected to how your practice actually books." },
      { title: "Landing page improvements", detail: "Pages for campaigns or specific services that match what the visitor clicked and lead to one clear action." },
      { title: "Analytics-driven testing", detail: "Changes measured against a baseline — and, where traffic allows, tested against the previous version — so decisions rest on evidence." },
    ],
    process: [
      { title: "Measure the journey", detail: "Set up or review analytics for enquiries and calls, and map where visitors arrive and leave." },
      { title: "Find the obstacles", detail: "Combine the conversion audit with the analytics to list what is stopping visitors, ranked by how many people it affects." },
      { title: "Improve", detail: "Calls to action, forms, mobile fixes and landing pages, one change at a time so the effect of each is visible." },
      { title: "Test and keep what works", detail: "Compare against the baseline; keep improvements, revert what did not help, and report plainly." },
    ],
    benefits: [
      "A clear next step on every page, on every device",
      "Forms your front desk can act on",
      "Decisions based on your own visitor data",
      "An honest record of what changed and what it did",
    ],
    related: ["dental-website-design-development", "technical-seo-pagespeed", "dental-content-marketing"],
    faqHeading: "Questions about conversion rate optimization",
    faqs: [
      { q: "What is a conversion for a dental practice?", a: "Any action that moves a visitor toward becoming a patient: a phone call, an appointment request, an enquiry form, sometimes a directions click. We agree which actions matter to your practice before measuring anything." },
      { q: "Can you promise a specific increase in enquiries?", a: "No. CRO improves the odds by removing obstacles, and the effect depends on your traffic, your market and your front desk. We measure the change honestly and tell you what we see." },
      { q: "Do we need lots of traffic for CRO to work?", a: "Formal A/B testing needs a reasonable amount of traffic to give a reliable answer. Practices with less traffic still benefit from the conversion audit and the obvious fixes — those do not need a test to justify them." },
      { q: "Does this replace a website redesign?", a: "Often it avoids one. Many sites need better calls to action, forms and mobile fixes rather than a rebuild. When the structure itself is the problem, we will say so." },
    ],
    cta: { heading: "Find out where visitors are dropping off", copy: "The free audit checks the basics of your patient journey. Book a review and we will go through the results and the improvements worth making first." },
  },

  {
    slug: "seo-audit-strategy",
    title: "SEO Audits & Growth Strategy",
    seoTitle: "SEO Audits & Growth Strategy for Dental Practices",
    metaDescription:
      "SEO audits and growth strategy for Canadian dental practices: technical and on-page analysis, website performance checks, prioritized findings and an improvement roadmap — starting with our free website audit.",
    eyebrow: "SEO AUDITS & GROWTH STRATEGY",
    h1: "Know exactly what to fix first — before you spend on anything else.",
    subhead:
      "Every engagement with us starts with evidence. Our free website audit crawls your site, runs technical, on-page and performance checks, and ranks what it finds by severity. The strategy work turns that into a roadmap your practice can act on, in the right order.",
    icon: "clipboardCheck",
    short: "A verified audit and a prioritized roadmap for your website.",
    summary:
      "Technical, on-page and performance analysis of your website, with every finding verified and prioritized. Turned into a practical improvement roadmap and reviewed with you in a strategy consultation.",
    benefit: "A clear, evidence-based order of what to improve.",
    availability: "established",
    overview: [
      "It is easy to spend on marketing without knowing what is actually wrong. Our audit removes the guesswork: it crawls your website, runs dozens of technical and content checks on every page, tests key pages with Google PageSpeed Insights, and lists every verified finding with the pages it affects, its severity and what to do about it.",
      "The audit is free and runs from your public website — no logins, no installation. The strategy work builds on it: we go through the findings with you, explain what each one means for your practice, and put them in an order that reflects severity, reach and effort. You leave with a roadmap, whether you work through it with us, with your own developer or in-house.",
    ],
    problems: [
      { title: "Marketing spend without a diagnosis", detail: "Money going into ads or content while basic technical or on-page problems quietly hold the site back." },
      { title: "Advice with no evidence", detail: "Recommendations from providers that never show where a problem was measured or which pages it affects." },
      { title: "Too many issues, no order", detail: "A long list of problems is not a plan. Practices need to know which three things matter most." },
      { title: "No way to check progress", detail: "Without a baseline, nobody can tell whether the work done actually changed anything." },
    ],
    includes: [
      { title: "Technical SEO analysis", detail: "Crawlability, indexing, canonicals, sitemaps, redirects, security and structured data across every crawled page." },
      { title: "On-page analysis", detail: "Titles, descriptions, headings, content depth, images, internal links and conversion basics, page by page." },
      { title: "Website performance checks", detail: "Google PageSpeed Insights on representative pages, reported separately from our own score and never mixed with it." },
      { title: "Prioritized findings", detail: "Every finding verified, with affected pages, severity, effort and who can fix it — most serious first." },
      { title: "Website improvement roadmap", detail: "The findings turned into a sequence of work, with quick wins separated from larger projects." },
      { title: "Strategy consultation", detail: "A walkthrough of the report with our team, and a discussion of which services, if any, are worth considering." },
    ],
    process: [
      { title: "Run the free audit", detail: "Enter your website and city. The audit crawls the site and runs its checks in a few minutes, with no account access needed." },
      { title: "Read the report", detail: "An online report and a customer PDF explain every finding in plain language, with the technical detail available for whoever maintains the site." },
      { title: "Review together", detail: "A consultation to go through the findings, answer questions and agree on priorities." },
      { title: "Follow the roadmap", detail: "Work through the improvements in order, then re-run the audit to measure the change." },
    ],
    benefits: [
      "Verified findings, each tied to the pages it affects",
      "Priorities based on severity, reach and effort — not on what is easiest to sell",
      "A baseline you can re-measure after any work",
      "A roadmap you can act on with any team",
    ],
    related: ["technical-seo-pagespeed", "on-page-seo", "conversion-rate-optimization"],
    faqHeading: "Questions about the audit and strategy",
    faqs: [
      { q: "Is the audit really free?", a: "Yes. The website audit is free and there is no obligation. It exists so that you and we can see what is actually wrong before anyone proposes anything." },
      { q: "What does the audit check?", a: "Technical health (crawlability, indexing, sitemaps, redirects, security, structured data), on-page content (titles, descriptions, headings, content depth, images, links, conversion basics) and performance (Google PageSpeed Insights on representative pages). Search rankings and Google Business Profile data are not part of the current audit version." },
      { q: "Do I get the full technical detail?", a: "The customer report is free and covers every finding in plain language. The full technical report — every measurement, affected URL and developer instruction — is provided by our team after a website review, so we can walk you through it." },
      { q: "Will you push us into buying services?", a: "No. The consultation is a review of your results. Some practices leave with a plan for their own developer; some ask us to help. Either outcome is fine with us." },
    ],
    cta: { heading: "Start with the free website audit", copy: "Your website and city are all it needs. In a few minutes you will have every verified finding and the order to fix them — then book a review and we will go through it together." },
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export const FEATURED_SERVICES = SERVICES.filter((s) => s.featured);

export function relatedServices(service: Service): Service[] {
  return service.related.map((slug) => getServiceBySlug(slug)).filter((s): s is Service => Boolean(s));
}
