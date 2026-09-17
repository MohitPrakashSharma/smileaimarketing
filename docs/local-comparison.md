# Local competitor comparison (Phase 4)

**Status: built, tested with fixtures, disabled by default (`AUDIT_COMPETITORS_ENABLED=false`).**
Enabling it is a cost and licensing decision — see "Before enabling".

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
