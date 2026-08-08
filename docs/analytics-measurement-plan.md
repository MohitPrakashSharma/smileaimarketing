# Analytics & Measurement Plan

Planning document. No analytics code exists in the app today (confirmed via repo-wide search — see `docs/seo-content-admin-audit.md` §5); this defines the abstraction, event dictionary, and admin reporting to build next, not what exists now.

## Design Principle

**One analytics abstraction, called from route handlers and a small number of client hooks — never GA4/gtag called directly from individual components.** This is what makes "map website events to GA4 recommended events" and "never send PII" enforceable in one place instead of audited component-by-component.

```
lib/analytics.ts        — server-side: writes an internal AnalyticsEvent row + optionally forwards to GA4 Measurement Protocol
lib/analytics.client.ts — client-side: thin wrapper around a single trackEvent() call, posts to an internal API route (never calls gtag directly from a form component)
app/api/analytics/track/route.ts — receives client events, applies PII stripping + dedupe, persists, optionally forwards to GA4
```

Server-side stages (business discovered, audit completed, email sent, etc.) call `lib/analytics.ts` directly from the route handler/worker that already has that data — no client round-trip needed, and no risk of missing an offline-pipeline event.

## PII Rule (enforced at the abstraction, not per-call-site)

The tracking function's TypeScript signature should make it structurally awkward to pass PII: accept only `{ eventName, properties: Record<string, string | number | boolean> }` where `properties` is validated against an explicit per-event allowlist (see event dictionary below) rather than accepting an arbitrary object. Never accepted: email, phone, name, raw audit `findingsJson`/`detailsJson` content, street address. Internal IDs (business ID, audit ID, campaign ID — all opaque UUIDs, not sensitive) are fine.

## Event Dictionary

### Website Funnel (client-tracked, browser interaction)

| Event | Fires when | Safe properties |
|---|---|---|
| `page_view` | Route change | `path` |
| `audit_form_start` | First keystroke in Hero/FinalCTA website field | `form_location` (`hero`\|`final_cta`) |
| `audit_form_submit` | Hero/FinalCTA form submitted | `form_location` |
| `audit_processing_view` | Wizard reaches the processing step | `audit_id` |
| `audit_preview_view` | Wizard reaches the preview step | `audit_id` |
| `report_unlock_start` | Contact-details step reached | `audit_id` |
| `report_unlock_complete` | `unlock-lead` succeeds | `audit_id` |
| `report_view` | `/audit/[publicToken]` loads | `audit_id` |
| `pdf_download` | PDF download clicked (once PDF exists) | `audit_id` |
| `consultation_view` | Book-consultation page loads | `type` (`online`\|`in_person`) |
| `booking_start` | Booking form first interaction | `type` |
| `booking_submit` | Booking form submitted | `type` |
| `booking_confirmed` | Booking API call succeeds | `type`, `appointment_id` |

### Outbound Funnel (server-tracked, from the route handler/worker that owns the transition)

`business_discovered` · `business_qualified` · `audit_completed` (`audit_id`, `score`) · `contact_enriched` (`business_id`, `confidence`) · `outreach_approved` (`business_id`) · `email_sent` (`message_id`, `step_day`) · `email_delivered` · `email_bounced` · `email_replied` · `report_opened` (`audit_id`) · `meeting_requested` (`type`) · `meeting_confirmed` (`type`, `appointment_id`) · `proposal_sent` · `lead_won` · `lead_lost`.

All server-side events include a stable `event_id` (UUID) generated at the call site so `app/api/analytics/track/route.ts` and the GA4 forwarder can both dedupe on it — satisfies "duplicate-event protection" without relying on GA4's own dedupe window.

### GA4 Recommended Event Mapping

| Internal event | GA4 recommended event |
|---|---|
| `report_unlock_complete` | `generate_lead` |
| `business_qualified` | `qualify_lead` |
| (a business explicitly marked unqualified) | `disqualify_lead` |
| `outreach_approved` / `meeting_requested` | `working_lead` |
| `lead_won` | `close_convert_lead` |
| `lead_lost` | `close_unconvert_lead` |

## Acquisition Tracking

Standard UTM capture (`source`, `medium`, `campaign`, `content`, `term`) plus `landing_page` and `referring_domain`, captured once on first touch (cookie or `Business`/`Contact`-linked first-touch fields — needs two new nullable columns, e.g. `Business.firstTouchSource`, `Business.firstTouchCampaign`) and preserved as last-touch is separately recorded per conversion event. First-touch vs. last-touch attribution should both be queryable from the admin dashboard (§ below), not just stored.

## Environment & Debug Mode

Additions to `.env.example` (not yet present — added alongside the integrations `.env.example` from the prior phase):

```
ANALYTICS_ENABLED=true
ANALYTICS_DEBUG=true
GA4_MEASUREMENT_ID=
GA4_API_SECRET=
```

`ANALYTICS_DEBUG=true` routes every tracked event to `console.log` (server) in addition to normal persistence/forwarding — no PII in the log line, same allowlisted `properties` shape that gets persisted. `ANALYTICS_ENABLED=false` should no-op the whole pipeline (useful for local dev without polluting real GA4 data), matching the "disabled when unset" pattern already established in `lib/env.server.ts`'s `integrationStatus`.

## Admin Analytics Dashboard

Full funnel view: Visitors → audit starts → audit submissions → reports generated → reports viewed → contacts captured → meetings requested → meetings confirmed → proposals → clients won — as a single funnel visualization, segmented by source (organic / cold outreach / direct / referral / paid-once-introduced).

Core KPIs to surface: audit completion rate, report-view rate, contact-unlock rate, appointment-booking rate, meeting show rate, positive reply rate, proposal rate, close rate, cost per audit, cost per qualified lead, cost per booked meeting, cost per client, revenue by source (when available). Cost-per-X figures require the API-usage/cost-logging fields specified per-provider in `docs/integration-audit.md` (§7–9) to exist first — flagged as a dependency, not computable from tracked events alone.

Explicitly avoid: a dashboard dominated by page-view or email-open counts, per the brief's own caution — those two metrics get one small card each, not top billing.

## Test Script (once built)

A manual/automated walk of: landing page → audit submit → report view → lead capture → booking → meeting confirmed → lead qualified → client won, asserting each event in the dictionary above fires exactly once with `ANALYTICS_DEBUG=true`. This becomes one of the integration tests in the eventual test suite (`docs/integration-audit.md` §18's "email follow-up stop conditions," "duplicate audit protection" tests are the closest existing analogue for how these should be structured).
