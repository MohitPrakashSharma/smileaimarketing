# Local competitor comparison (Phase 4)

**Status: built and verified live on real audits (2026-09-17 Newmarket, 2026-09-21 Toronto ×2);
disabled by default in production (`AUDIT_COMPETITORS_ENABLED=false`).** Enabling it is a cost and
licensing decision — see "Decisions needed before enabling in production" below.

## What it does
After a v2 audit completes, a separate job (`competitor-intel` on the audit queue; a detached
promise in inline mode) identifies 2–3 nearby dental practices and measures each homepage
with the same PageSpeed provider the audit uses (mobile; performance, accessibility,
best practices, SEO). The audited practice's side is its own stored homepage × mobile row.
The result is rendered as "How Does Your Practice Compare Locally?" (or "Where Nearby
Practices Have an Advantage" when competitors lead on ≥2 measured metrics) in the web
report and the customer PDF, with a CTA to the existing consultation page.

- Never blocks or fails the audit; never touches scores, findings or checks (tested).
- Rendered only with ≥2 verified competitors; otherwise the section is omitted (no placeholder).
- Unmeasured metrics are `null` → "unavailable"; nothing is estimated.
- Pediatric practices are compared only with pediatric practices (≥2), else omitted.
- Discovery order is never shown as a ranking; Places ratings/review counts are not stored or shown.

## Budget per audit
2 Places Text Search calls + ≤ `AUDIT_COMPETITORS_MAX` PageSpeed runs (homepage, mobile, two at a
time, 150 s stage budget). Memory: HTTP/JSON only, no browser — safe on the 1 GB VPS.
Discovery is reused for 30 days; re-runs only measure competitors that lack a measurement.

## Places content and the Maps terms (checked 2026-09-17)
Google Maps Platform Service Specific Terms §14 (Places API): content may be used **without a
Google Map** (§14.1) and never with a non-Google map (§14.2); only **place ids** may be stored
indefinitely (§3 "Google ID Caching") and **latitude/longitude for ≤30 days** (§14.3). The Places
API policies add: do not pre-fetch, cache or store other Places content, and attribute with the
Google Maps logo, or the text "Google Maps" where space is limited.

**How the implementation complies:** Places responses are used transiently for selection only.
What is persisted per competitor is the place id, the name and URL confirmed by fetching the
competitor's *own* website (schema.org name / og:site_name / title, final URL), a derived
distance label, and our own PageSpeed measurement. No Places name, address, rating, type or
coordinate is stored or printed. Web and PDF carry a "Google Maps" text attribution.

**Decision still needed before enabling in production:** (1) confirm you are comfortable that
names/URLs taken from each competitor's own website (not from Google) may appear in a downloadable
PDF — this is our reading of the terms, not legal advice; (2) Places Text Search with
`websiteUri`/`businessStatus` bills the higher Places SKU (~2 calls/audit, same key and SKU the
site-detection step already uses); (3) whether to add the Google Maps logo asset instead of the
text attribution.

## Verified live (2026-09-17, Apple Tree Dental For Kids, Newmarket)
Candidates returned: 6 (the practice itself + 5). Pediatric rule kept DFC Dentistry for Children
(~3 km) and Aurora Kids Dentistry (~7 km); the four general dentists and the audited practice were
excluded. Both websites verified and measured (one transient Lighthouse failure recovered by the
single retry). OpenAI narrative generated and accepted by the validator (numbers and names only).

## 2026-09-21 — why competitors were "missing", and what changed

Investigated on three Gelinas Dental Studio audits run from the dev machine:
- The flag was on, discovery worked (3 nearby practices found and verified on their own sites) and
  the rows were stored, so the section *did* render — but every competitor measurement was
  `unavailable` because Google PageSpeed rejected the calls: *"The provided API key has an IP address
  restriction… (49.43.144.29) violates this restriction."* The dev machine has more than one egress
  IP (mobile/ISP NAT), so some calls pass and some fail; the audited practice's own PSI rows showed
  the same pattern (5 of 8 runs ok). Production (fixed VPS IP on the key's allow-list) is unaffected.
- One competitor was stored as **"My Vxw Site 3whg1o"** — a Wix placeholder `<title>` picked up
  by site verification.

Changes:
- `measure.ts`: transient PSI rejections (rate limit, quota, network resets, key-IP restriction) are
  retried twice with backoff, on top of the existing single Lighthouse retry.
- `verify.ts`: site-builder placeholder names (My Wix/Vxw Site, Home, Welcome, Untitled…) are never
  used; `og:site_name` → `application-name` → `og:title` → `<title>` are tried, else the competitor
  is labelled by its domain (e.g. `cwfamilydental.ca`). Re-runs repair placeholder names already stored.
- `narrative.ts`: the validator now also accepts differences between two measured values (the model
  wrote "16 points" = 44 − 28 and was rejected), the prompt no longer invites arithmetic, and a rejected
  draft is retried once with the reason.
- New admin endpoint `POST /api/admin/audits/{id}/local-comparison` re-runs the stage for a completed
  v2 audit (reuses discovery <30 days old, re-measures only `unavailable` rows, repairs names, rewrites
  the narrative, and marks the customer PDF for regeneration).
- Report placement: web report and customer PDF now show the comparison **after the action plan and
  before the consultation CTA**, followed by the new financial-opportunity section. Customer PDF layout
  bumped to `cust-r3`, so any PDF cached under the old file name is regenerated on its next download
  (`customerPdfIsCurrent` also already treats a PDF older than the latest competitor measurement as stale).

## Decisions needed before enabling in production (unchanged, restated)
1. **Terms reading** — competitor names/URLs shown come from each competitor's *own* website (never
   from Google); only the Places place id is stored. This is our reading of the Maps Service Terms
   §14 / Places policies, not legal advice. Confirm you are comfortable with names and URLs appearing
   in a downloadable PDF.
2. **Billing** — ~2 Places Text Search calls per audit at the higher (Advanced/"websiteUri") SKU plus
   ≤3 PageSpeed runs; PSI is free but quota-limited. Confirm the budget.
3. **Attribution** — text attribution "Nearby practices located with Google Maps" is used in the web
   report and PDF; the policies prefer the Google Maps logo. Decide whether to add the logo asset.
4. **Production key** — the PageSpeed/Places key must allow the production server's egress IP (it does
   today; the failures above were dev-machine only).
Nothing here is enabled in production by this change; the local `.env` has the flag on for testing only.
