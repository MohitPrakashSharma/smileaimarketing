# Case Study System

Planning document — the Prisma model below is a proposal for the next implementation phase, not yet migrated into `prisma/schema.prisma`.

## Why This Needs to Be a System, Not a Template

The brief's hardest constraint is also the most important one: **no fabricated case studies, ever** — no invented results, client names, or numbers. That has to be enforced structurally (the publish action itself refuses to succeed without evidence), not just written down as a content guideline someone can skip under deadline pressure. Everything below is designed around that.

## Content Model

A case study requires all eleven of the brief's sections to exist as real, checkable fields — not free-text prose where a required fact could quietly be missing:

1. Practice profile (type, size context — not necessarily the practice's real name if anonymized)
2. Location (city, used for `/locations/[city]` cross-linking)
3. Initial business problem (verified, in the client's own words where possible)
4. Verified baseline (structured metrics, see below)
5. Work completed (structured list, not a vague paragraph)
6. Timeline (start/measurement dates)
7. Measured outcomes (structured metrics, same shape as baseline, so before/after is directly comparable)
8. Evidence source (enum — must reference where each metric came from)
9. Limitations/context (required field, not optional — every case study must say what this doesn't prove)
10. Next steps
11. Audit/consultation CTA (reuses the existing `/free-dental-audit` and `/book-consultation` flows — not a new CTA type)

### Proposed Prisma Model (for the next implementation phase)

```prisma
enum CaseStudyStatus {
  DRAFT
  AWAITING_EVIDENCE
  AWAITING_CLIENT_APPROVAL
  READY_FOR_REVIEW
  APPROVED
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

enum EvidenceSource {
  SEARCH_CONSOLE
  GA4
  GOOGLE_BUSINESS_PROFILE
  RANKING_DATA_PROVIDER
  CRM
  BOOKING_SYSTEM
  CLIENT_CONFIRMED
}

model CaseStudy {
  id                 String            @id @default(uuid())
  businessId         String?           // optional link to a real Business record
  business           Business?         @relation(fields: [businessId], references: [id], onDelete: SetNull)

  status             CaseStudyStatus   @default(DRAFT)
  permissionGranted  Boolean           @default(false)   // client sign-off, required before APPROVED
  permissionDocUrl   String?           // link to the signed permission record
  anonymized         Boolean           @default(false)   // show as "a multi-location dental group" etc.
  displayName        String            // real name OR anonymized label — never invented

  city               String
  practiceType       String

  problemSummary     String
  baselineMetrics    Json              // { localVisibility, websiteSpeed, bookingConversion, reviewCount, ... }
  actionsTaken       Json              // structured list: [{ category, description }]
  timelineStart      DateTime
  timelineEnd        DateTime?
  outcomeMetrics     Json              // same shape as baselineMetrics, for direct comparison
  evidenceSources    EvidenceSource[]
  evidenceFileUrls   String[]          // screenshots/exports backing the metrics above
  limitations        String            // required — what this case study does NOT prove
  nextSteps          String?

  authorId           String
  author             User              @relation("CaseStudyAuthor", fields: [authorId], references: [id])
  reviewerId         String?
  reviewer           User?             @relation("CaseStudyReviewer", fields: [reviewerId], references: [id])

  seoTitle           String
  metaDescription    String
  ogImageUrl         String?
  slug               String            @unique
  internalLinks      String[]          // related service/location page slugs

  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  publishedAt         DateTime?

  @@index([status])
  @@index([city])
  @@index([slug])
}
```

`Business` and `User` already exist in `prisma/schema.prisma`; this model only adds two new relations to `User` (`CaseStudyAuthor`, `CaseStudyReviewer`).

### The Anti-Fabrication Rule, Enforced in Code (not just policy)

The publish transition (`status → PUBLISHED`) must be rejected server-side unless **all** of the following are true — this is the actual mechanism that prevents a fake case study from ever reaching the public site, and belongs in the API route handler that performs the transition, not just in an admin UI hint:

- `permissionGranted === true` (or `anonymized === true`, which substitutes for named-client permission but still requires the underlying data to be real)
- `evidenceFileUrls.length > 0`
- `evidenceSources.length > 0`
- `limitations` is non-empty
- `outcomeMetrics` has at least one field whose value differs from the corresponding `baselineMetrics` field (i.e., something was actually measured, not copy-pasted)

## Status Workflow

```
Draft → Awaiting Evidence → Awaiting Client Approval → Ready for Review → Approved → Scheduled → Published → Archived
```

Matches the brief exactly. `Awaiting Evidence` and `Awaiting Client Approval` can be entered/exited in either order depending on whether the client or the evidence-gathering finishes first — both are required before `Ready for Review`.

## Page Template (`/case-studies/[slug]`)

```
Title: "How [Practice Type] Improved [Verified Outcome] in [City]"
Summary: one short paragraph — verified problem + verified result only
Baseline panel: localVisibility / websiteQuality / bookingExperience / reviewPosition / lead-or-appointment baseline (only fields the client actually supplied)
Actions taken: grouped by category (technical, GBP, content, conversion, review workflow, tracking)
Results: outcomeMetrics, same categories as baseline, side-by-side
Evidence: which sources backed the numbers (rendered from evidenceSources — visible, not hidden)
Disclaimer (verbatim, every case study): "Results depend on market conditions, implementation, competition, and the practice's existing position. Individual outcomes vary."
CTA: /free-dental-audit or /book-consultation
```

Structured data: `Article` + `BreadcrumbList` (per `docs/2026-content-strategy.md`'s rendering rules) — no `Review` or `AggregateRating` schema, since that would misrepresent a case study as a customer review.

## When No Verified Case Study Exists Yet (the current state)

Per the brief, the answer is never fabrication. In order of what's actually available right now:

1. **The internal redesign as a transparent build case study** — available *today*, no client data needed. This conversation's own UI/UX redesign (7-section landing page, 4-step audit wizard, admin command-centre without a sidebar, mobile-first form overhaul) is real, in-repo, verifiable work. Framed honestly ("how we rebuilt our own platform," not "how we grew a client"), this is publishable now and doubles as evidence of the agency's own execution quality — arguably more credible than a generic case study for a brand-new agency.
2. **Original market research** (`docs/2026-content-strategy.md` Pillar 6) — blocked on real audit volume, but the next-most-available authority asset once the integration work in `docs/integration-audit.md` lands.
3. **A clearly labelled "Sample Audit"** — already exists as a homepage section and is getting its own route (`/sample-dental-audit`, per the content strategy doc). Must stay visibly labelled as illustrative, never presented as a real client outcome — the app already does this correctly (`SampleAuditPreview`'s eyebrow says "SAMPLE AUDIT PREVIEW").
4. **Methodology-based content** — "how we score a practice's local visibility," "what our audit actually checks" — requires no client data at all and directly supports trust, per Pillar 1/5.

No case study should be marked `PUBLISHED` until a real one exists and clears the enforcement rule above.

## Admin Fields Checklist (matches brief §8)

Client/practice reference · permission status · anonymization toggle · city · practice type · baseline metrics · outcome metrics · evidence files · timeline · author · reviewer · SEO title · meta description · OG image · internal links · publication status — all present in the proposed model above; none omitted.
