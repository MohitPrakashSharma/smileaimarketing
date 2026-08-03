# Product Flow

This document details the core business flows of the Smile AI Marketing platform, tracing both inbound (self-serve audit tool) and outbound (automated campaign prospecting) paths.

---

## 1. Outbound Platform Flow (Clinic Discovery & Outreach)

```mermaid
graph TD
    A[Select Target City & Category] --> B[Discover Clinics via APIs]
    B --> C[Deduplicate & Validate Records]
    C --> D[Analyse Website & Local SEO]
    D --> E[Enrich Clinic Contact & Find Owner]
    E --> F[Calculate Deterministic Opportunity Score]
    F --> G[Generate Draft Audit Report]
    G --> H[Admin Reviews & Approves Campaign Outreach]
    H --> I[Trigger Email Sequence Day 0 Audit Link]
    I --> J{Prospect Actions}
    J -->|Unsubscribes / Bounces| K[Add to Suppression List & Stop Sequence]
    J -->|Opens Secure Audit Page| L[Display Interactive Report & Opportunity Score]
    L --> M{Schedule Consultation}
    M -->|Book Online Meeting| N[Check Google/Outlook Calendar & Schedule]
    M -->|Request In-Person Visit| O[Alert Salesperson & Build Briefing Package]
    N --> P[Notify Salesperson & Track Pipeline Outcome]
    O --> P
```

### Detailed Steps:
1. **Targeting**: Admin selects target parameters (e.g., "Chicago", "Pediatric Dentist").
2. **Discovery**: Background worker queries business directories or local search APIs.
3. **Deduplication**: System screens out duplicate addresses, invalid phone numbers, and domains already in outreach or client lists.
4. **Analysis & Scoring**: Automated crawlers test site performance (via Lighthouse/PageSpeed), schema tags, SSL, Google Maps presence, review score, and competitor rank. Opportunity score (0-100) is calculated.
5. **Contact Enrichment**: Scrapes domain and social channels to identify the decision-maker (e.g., owner, clinical director, manager) and verifies email integrity.
6. **Report Compilation**: Generates an audit draft with estimated metrics (never fabricating numbers) and formats it as a secure PDF and web page.
7. **Human Gate**: Admin reviews the audit draft and contact details, then hits "Approve".
8. **Outreach Cadence**: Starts a multi-day cold email sequence with a direct link to the clinic's private audit token (`/audit/[publicToken]`).
9. **Conversion**: Prospect views their private report and interacts with the calendar widget to book a consultation.

---

## 2. Inbound Visitor Flow (Landing Page Lead Magnet)

```mermaid
graph TD
    A[Visitor Lands on website] --> B[Submits URL & City in Hero Form]
    B --> C[Background Jobs Trigger Initial Analysis]
    C --> D[Show Live Progress Bar & Preliminary Findings]
    D --> E[Prompt Lead Generation Form to Unlock Full Report]
    E -->|User Submits Name & Email| F[Persist Lead & Link Audit to Contact]
    F --> G[Redirect to Secure Audit Page /audit/token]
    G --> H[Interactive Calendar Booking Panel]
    H -->|Book Consultation| I[Add Meeting to Calendar & Show /thank-you]
```

### Detailed Steps:
1. **Initial Submission**: A user visits `/` or `/free-dental-audit` and inputs their clinic's website domain, city, and clinic name.
2. **Dynamic Preview**: The web app calls a fast endpoint to perform quick checks (e.g., mobile responsiveness, PageSpeed rating) and renders a loading states sequence.
3. **Lead Gate**: To unlock the detailed scorecard (reviews, local map pack rankings, competitor comparisons), the visitor must input their first name, last name, professional email, and role.
4. **Report Access**: Upon submission, a secure, unique `publicToken` is generated. The page redirects to `/audit/[publicToken]`.
5. **Call-To-Action**: The user views their dental scorecard and is offered direct options to book an online consultation or request a clinic visit.

---

## 3. Compliance & Suppression Flow (Unsubscribe Flow)

```mermaid
graph TD
    A[Prospect Clicks Unsubscribe Link] --> B[Redirects to /unsubscribe?token=...]
    B --> C[Confirm Opt-out Button Pressed]
    C --> D[Add Email & Domain to SuppressionRecord]
    D --> E[Cancel All Active Background Scheduled Jobs for Contact]
    E --> F[Flag Lead as Suppressed & Prevent Future Outreach]
```

- Every cold email template contains a unique, non-sequential unsubscribe URL.
- Once clicked, it writes to a system-wide `SuppressionRecord` table, immediately terminating any queued background outreach jobs for that recipient.
