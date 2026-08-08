# 2026 Content Strategy

Planning document — no pages are created as part of this document. Builds directly on the real keyword research already sitting in `seo/keyword-research.csv`, `seo/keyword-research-top-picks.csv`, and `seo/competitor-scan.csv` (see `docs/seo-content-admin-audit.md` §3), rather than starting from assumptions.

## Positioning

**"Local patient-growth systems for dental practices."**

The competitor scan (`seo/competitor-scan.csv`) confirms this is a real gap, not a generic differentiator: every scanned competitor (Firegang, Progressive Dental Marketing, Lasso MD, Harris & Ward, GrowDent, Wonderist, the generalist agencies) either reads as a "service menu" agency or leans on a platform/guarantee pitch. None of them explain their process in plain language for a non-marketer practice owner — that's the opening. Harris & Ward already mentions "AI search visibility" as a service line but, per the scan's own note, "not as a clear simple benefit story" — Pillar 5 below is designed to take that specific gap.

Positioning must communicate specialization (dental-only), evidence (the audit itself is the proof, not claims), and a practical next step (online or in-person review) — never rankings/revenue guarantees.

## Page Architecture

Using the brief's requested structure, reconciled against the existing `seo/content-plan.csv` (which used a slightly different, coarser page split):

```
/
 /free-dental-audit
 /sample-dental-audit          (new — currently the "Sample Audit" is a homepage section only)

/services
 /services/local-seo-for-dentists
 /services/google-business-profile-for-dentists
 /services/dental-website-conversion
 /services/dental-reputation-management
 /services/ai-search-visibility-for-dentists

/locations
 /locations/[city]/dental-marketing

/case-studies
 /case-studies/[slug]

/insights
 /insights/[slug]

/audit/[publicToken]      (exists)
/book-consultation        (exists)
/privacy                  (exists)
/unsubscribe              (exists)
```

`seo/content-plan.csv`'s other planned pages (Dental SEO Services, Google & Meta Ads, Pricing/Packages, About, Contact) are real keyword opportunities but are **not** part of this brief's initial 5-service scope — logged here as backlog, not built now.

### `/sample-dental-audit`

Today "sample audit" only exists as a homepage section (`SampleAuditPreview`). A dedicated route gives it its own indexable URL and lets `/services/*` and `/locations/*` pages link to a concrete, non-personalized example without duplicating the personalized `/audit/[publicToken]` flow. Implementation note for later: this should reuse the existing `SampleAuditPreview` data/markup, not fork a new copy of it.

## One Target City — Confirmed: Chicago

The brief is explicit: start with **one** approved city, only expand once a page can be genuinely unique (real audit findings, real local observations — not a templated city-name swap).

**Confirmed by the business owner: Chicago, IL.** This also matches the city already used throughout the app's sample/demo content (Hero mockup, `SampleAuditPreview`, audit report sample copy) — those instances remain clearly-labelled illustrative examples and are not the same thing as this page, which will need to carry real Chicago-specific findings before it publishes (see the requirements table below). `/locations/chicago-il/dental-marketing` (or `/locations/chicago/dental-marketing` if a state-suffix-free slug is preferred — confirm slug format when the route is actually built) is the first, and for now only, location page to build.

### City-Page Content Requirements (once a city is confirmed)

Per the brief, no page ships until it has real substance. A city page's "unique information" checklist, mapped to what can actually be sourced once the relevant integrations exist:

| Required section | Data source (once built) |
|---|---|
| Local dental market overview | Google Places practice count/category mix for the city (`docs/integration-audit.md` — not yet integrated) |
| Local competition observations | DataForSEO local-pack results for the city (script exists in `scripts/`, not yet wired into the app) |
| Review/reputation benchmark | Aggregated Google Places rating/review-count data across audited practices in that city |
| Common website/booking issues | Aggregated `AuditResult` findings from real (not seeded) audits run in that city |
| City-specific case study | Only if/when one exists — see `docs/case-study-system.md` |
| City-specific FAQs | Editorial, informed by real patterns seen in that city's audits |

This is why the page **cannot** be built responsibly until either (a) real audits have run in the target city, producing aggregate data to draw from, or (b) the page is explicitly framed as methodology + invitation-to-audit rather than claiming market data it doesn't have yet. Recommend (b) as the honest v1, upgraded to (a) once real audit volume exists.

Title format: `"Dental Marketing in [City] | Local SEO and Patient Growth Audits"`. H1: `"See how your dental practice competes in [City]."` — no "#1 agency," no guaranteed-ranking language, ever.

## Content Pillars (grounded in real keyword data)

### Pillar 1 — Local Visibility
Top real keywords available: *local seo for dentists* (1,000 vol, KD 0), *local seo for dental* (1,000 vol, KD 0), *dental seo companies* (1,000 vol, KD 1), *dental seo services* (1,300 vol, KD 8). These are genuinely low-difficulty, high-intent commercial terms — this pillar (and its `/services/local-seo-for-dentists` page) is the strongest early SEO opportunity in the whole dataset.

### Pillar 2 — Google Business Profile
No dedicated GBP-specific keyword rows exist yet in `seo/keyword-research.csv` (the pull grouped GBP under "local-seo" seeds). Before writing this pillar's articles, run a focused DataForSEO pull seeded on `"google business profile dentist"`, `"dentist gbp optimization"`, `"dental google maps ranking"` — flagged here rather than guessed at.

### Pillar 3 — Website Conversion
Real keywords: *dental website design* (880 vol, KD 8), *dental clinic website design* (880 vol, KD 41), *dental website design service* (260 vol, KD 13). Maps directly to `/services/dental-website-conversion`. Article angle should stay conversion-specific (booking flow, CTA placement, mobile speed) rather than duplicating a general "website design" pitch — the keyword `dental website design service` at KD 13 is the more winnable entry point than the KD-41 variant.

### Pillar 4 — Reviews & Reputation
`seo/keyword-research.csv`'s "reputation" topic rows are mostly noise (competitor-brand-name queries like *"straine dental management reviews"* — people searching for a specific competitor's reviews, not for reputation-management services). This pillar needs a fresh keyword pull seeded on `"how to get more dental reviews"`, `"dental review management"`, `"respond to negative dental review"` before article titles are finalized.

### Pillar 5 — AI Search Visibility
Only one real data point exists: *"ai for dental practices"* (10 vol, KD 50) — a thin, difficult term. This pillar is **not** a near-term SEO-volume play; it's a positioning/authority play, directly targeting the gap the competitor scan already identified (Harris & Ward mentions AI but doesn't explain it simply). Content here should focus on plain-language explanation and measurement (Search Console/GA4), never fabricated "AI ranking hack" claims — matches the brief's explicit constraint.

### Pillar 6 — Original Dental Market Research
No keyword data applies here by definition — this pillar's value is backlink/authority generation, not direct search volume. First candidate once real audit data exists: *"Local dental visibility benchmark for [target city]"*, built from aggregated real `AuditResult` rows once the audit pipeline uses real providers instead of deterministic mock scores (see `docs/integration-audit.md`). Cannot be written honestly until that data exists — logged as blocked, not skipped.

## Content Quality Rules (enforced editorially, not just documented)

- Every article requires: methodology statement, update date, author/reviewer byline, sources for any factual claim.
- Banned title patterns confirmed from the brief: "10 SEO Tips for Dentists," "7 Ways to Grow Your Dental Clinic," "Best Marketing Ideas for 2026" — none of these should be approved at the brief stage, not just caught at review.
- Preferred pattern: specific, numbers-in-title, methodology-implying ("We Reviewed 75 Dental Websites in [City]: The Five Booking Problems We Found"). These require the aggregate audit data described in Pillar 6 to be *true* when published — do not publish the title pattern with fabricated numbers to hit the "specific" bar.
- AI (OpenAI, once integrated per `docs/integration-audit.md`) may draft structure/briefs/edits only — never invent statistics, quotes, or case-study details. This is the same constraint already designed into the OpenAI integration's structured-output contract in the integrations brief (`summary`/`topFindings`/`recommendedActions` from *verified* audit data only).
- Every article requires human review before publish — this is a workflow gate, formalized in `docs/admin-workflow-plan.md`'s content status machine, not just a policy statement.

## Backlink & Authority Strategy (ethical, manual-review-first)

No automated link building of any kind (no directory blasts, no PBNs, no bulk guest posts). Assets worth pursuing, ranked by what this specific pipeline can actually produce first:

1. **Original market research** (Pillar 6) — the strongest asset, but blocked on real audit data (see above).
2. **The internal redesign as a transparent build case study** — genuinely available *today*: this app's own UI/UX redesign (landing page, audit flow, admin command-centre) is real, verifiable, in-repo work that can be written up honestly right now without waiting on any client data or provider integration. Recommended as the first published "case study"-adjacent piece — see `docs/case-study-system.md`.
3. Co-authored case studies, dental-software integration articles, local chamber/professional-group resources, embeddable benchmark charts — all downstream of having either real client outcomes or real market research, i.e. later.

An outreach tracker (target publication, contact, asset, status, response, link acquired, relevance, follow-up date) is specified as an admin data model in `docs/admin-workflow-plan.md` rather than duplicated here.

## Rendering Strategy for Content (ties to `docs/seo-content-admin-audit.md` §6)

Once built: service pages, city pages, articles, and case studies should all be statically rendered or ISR'd (no personalized data on any of them), with on-demand revalidation (`revalidatePath`) triggered from the admin publish/update action described in `docs/admin-workflow-plan.md`'s content workflow. `/audit/[publicToken]`, `/book-consultation`, and all `/admin/*` routes must remain dynamic/uncached — already true today, just noted here so future content work doesn't accidentally change that.
