# Admin Workflow Plan

Planning document for the campaign wizard, expanded work-queue coverage, and the new automation control centre. Cross-references the admin command-centre shell already built in the prior UI/UX redesign phase — this plan describes the *delta*, not a rebuild.

## What Already Exists (from the prior redesign phase — not rebuilt here)

- No permanent sidebar; desktop top nav + mobile bottom nav + "More" sheet (`app/admin/layout.tsx`).
- `/admin` Overview page with actionable queue cards: audits ready for review, hot leads, follow-ups due, emails awaiting approval, online meetings, in-person requests, recent activity (`app/admin/page.tsx`) — all built from real (if currently mock-backed) `/api/admin/*` data, all linking to a filtered destination, no decorative charts. This already satisfies most of brief §13.
- Primary nav today: Overview, Businesses, Audits, Outreach, Meetings, Pipeline (Campaigns reachable via the contextual "+ New Campaign" action; Settings via the user menu).

## Delta 1: Add "Content" to Primary Navigation

Brief §12 lists `Overview, Campaigns, Businesses, Audits, Outreach, Meetings, Content, Pipeline`. Two changes from the current nav:
- Add **Content** (new — see the content-publishing workflow below and `docs/case-study-system.md`'s admin fields), landing on a list of articles/case studies filterable by status.
- Promote **Campaigns** to a first-class nav item rather than only the contextual action button, since the campaign wizard below is substantial enough to deserve its own destination distinct from "create a campaign quickly."

## Delta 2: Additional Overview Work Queues

Brief §13 asks for several queues not yet on `/admin`. New cards to add, and what they'd query once the data exists:

| Queue | Query (once real) | Status today |
|---|---|---|
| Businesses awaiting qualification | `Business` where `status = DISCOVERED` and not yet reviewed | Data exists (`Business.status`), just not surfaced as its own card yet — currently folded into the Businesses list only. |
| Contacts awaiting verification | `Contact` rows from Apollo enrichment with low confidence, not yet manually confirmed | Blocked on Apollo integration (`docs/integration-audit.md` §9) — no confidence field exists on `Contact` yet. |
| Reports recently viewed | `EngagementEvent` where `eventType = "REPORT_VIEW"`, last 7 days | Blocked on analytics event pipeline (`docs/analytics-measurement-plan.md`) — no view-tracking exists yet. |
| Content awaiting review | `CaseStudy`/article rows where `status = READY_FOR_REVIEW` | Blocked on the content model (`docs/case-study-system.md`) not existing yet. |
| Integration errors | Last-failed-check per provider | Blocked on the admin integrations status page (`docs/integration-audit.md` §14, not yet built). |
| Failed automation jobs | BullMQ failed-job count per queue | Blocked on the automation control centre below. |

None of these can be wired to real data until their upstream systems exist — logged here so the Overview page's next iteration has a concrete task list instead of a vague "add more cards" note.

## Campaign Wizard (replaces the current single-step create form)

Today `/admin/campaigns` creates a campaign and 3 hardcoded fake businesses in one call (`docs/integration-audit.md` §"What Actually Happens Today"). The wizard below is the intended replacement, once business discovery is a real integration:

**Step 1 — Target Market**: country, state, city, business category (reuses the existing `Campaign.city`/`category` fields; adds `state`/`country` — `Business.country` already exists and defaults to `"US"`, `Campaign` does not yet have a country/state field, would need adding).

**Step 2 — Lead Criteria**: max businesses, minimum review count, website required (bool), exclude chains (bool), exclude existing contacts (bool). None of these fields exist on `Campaign` today — new columns, or a `campaignCriteria Json` field if the set is expected to grow.

**Step 3 — Audit Configuration**: keywords, competitor count, which website checks to run, data freshness window (ties to `docs/integration-audit.md` §11's freshness-period recommendation, 7–30 days).

**Step 4 — Outreach Configuration**: sender, sequence selection (`EmailSequence` already exists as a model), daily limit (reuses `OUTREACH_DAILY_LIMIT` from `.env.example`), approval mode (manual review required vs. auto-approve after N hours — manual should be the only option until real send volume has been validated in `EMAIL_SEND_MODE=test`).

**Step 5 — Review & Start**: summary of steps 1–4, explicit "Start Campaign" action.

### Campaign Status Machine

```
Draft → Discovering Businesses → Businesses Ready for Review → Auditing → Contacts Enriching → Ready for Outreach → Active → Paused → Completed
```

This is materially more granular than the current `CampaignStatus` enum (`DRAFT/ACTIVE/PAUSED/COMPLETED`) — the new intermediate states need adding to the enum, and each transition corresponds to a BullMQ job completing (discovery → audit → enrichment), matching the 9-queue design in `docs/integration-audit.md` §6.

### Admin Actions on a Campaign

Pause / resume / retry failures / approve individual lead / approve a reviewed batch / stop outreach / view API cost & usage / view funnel performance — all net-new controls, dependent on the queue rebuild and provider integrations landing first. Not buildable in isolation from those.

## Automation Control Centre (new — `/admin` "More" menu or a dedicated nav destination)

A plain-language status page over the BullMQ queue layer — explicitly **not** exposing queue internals to normal admin users, per brief §15. One row per workflow:

| # | Workflow | Maps to (once built) |
|---|---|---|
| 1 | Business Discovery | `business-discovery` queue |
| 2 | Website Audit | `website-audit` queue |
| 3 | Local Visibility Audit | `local-visibility-audit` queue |
| 4 | Contact Enrichment | `contact-enrichment` queue |
| 5 | Audit Report Generation | `audit-generation` queue |
| 6 | Outreach Approval | admin action, not a queue |
| 7 | Email Sequence | `email-outreach` + `email-follow-up` queues |
| 8 | Reply Handling | webhook-driven, owner TBD — see `docs/n8n-decision-plan.md` |
| 9 | Online Appointment | `appointment-reminder` queue + Calendar integration |
| 10 | In-Person Request | admin-approval-driven, `appointment-reminder` queue |
| 11 | Appointment Reminder | `appointment-reminder` queue |
| 12 | Content Publishing | `revalidatePath` trigger, not a persistent queue |
| 13 | Search Performance Sync | new, ties to Search Console integration (`docs/analytics-measurement-plan.md` §23) |

Each row shows: purpose, trigger, current status, last run, next run, success/failure counts, average duration, manual-run action, pause/resume, view logs. Requires BullMQ's job-level metadata (already available via `Queue.getJobCounts()`/`Job` events) to be surfaced through a new `/api/admin/automation/*` read-only endpoint — no new persistent model needed, this reads live queue state.

## Content Publishing Workflow (feeds the new "Content" nav item)

```
Idea → Research → Brief → Draft → Expert Review → SEO Review → Approved → Scheduled → Published → Performance Review → Update or Archive
```

Admin capabilities: create a content brief (pillar, target city, target service, primary/supporting queries, original data, sources), assign reviewer, preview metadata + social image, add internal links, schedule publication, trigger revalidation, track performance. This reuses the same "structured fields, not free-text-only" principle established in `docs/case-study-system.md` — a `ContentBrief`/`Article` model is a natural sibling of the `CaseStudy` model proposed there, sharing the same author/reviewer/SEO-metadata field shapes. Full schema left to the content-system implementation phase rather than duplicated here.

## Integration Status Cross-Reference

`/admin/settings/integrations` (brief §14, planned in `docs/integration-audit.md`) belongs under the "More"/user menu per §12's instruction to keep Settings and integrations out of primary nav — consistent with where Settings already lives today.
