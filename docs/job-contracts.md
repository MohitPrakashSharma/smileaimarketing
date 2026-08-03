# Job Contracts

This document specifies the background job payloads, queue structures, concurrency settings, and recovery strategies for the `dental-worker` worker process using BullMQ and Redis.

---

## 1. Queue Definitions

We maintain three logical queues to isolate priorities:
- **`discovery-queue`**: Clinic gathering, deduplication, and initial checks.
- **`analysis-queue`**: Heavy operations (scraping, audits, PDF generation).
- **`outreach-queue`**: Email sequence scheduling, dispatch, and tracking.

---

## 2. Job Specifications

### `discover-businesses`
- **Queue**: `discovery-queue`
- **Concurrency**: 1
- **Payload**:
  ```json
  {
    "campaignId": "cmp_d8a2c4e6",
    "city": "Chicago",
    "category": "dentist",
    "limit": 50
  }
  ```
- **Process**: Queries Maps/Directories API, filters out existing website domains in database, writes duplicates to logs, adds discovered `Business` records in `DISCOVERED` status. Spawns `analyse-website` and `analyse-local-visibility` jobs for each new clinic.

---

### `analyse-website`
- **Queue**: `analysis-queue`
- **Concurrency**: 2
- **Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c",
    "website": "https://www.brightsmiles.com"
  }
  ```
- **Process**: Performs DNS checks, SSL verification, site load speed metrics, mobile friendliness, meta tag parsing, and conversion markers (e.g. calls to action, calendar widgets). Saves findings as `AuditResult` under category `WEBSITE_QUALITY` and `CONVERSION`.

---

### `analyse-local-visibility`
- **Queue**: `analysis-queue`
- **Concurrency**: 2
- **Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c",
    "name": "Bright Smiles Dental",
    "city": "Chicago"
  }
  ```
- **Process**: Performs Google Maps Pack API query. Verifies ranking for keyword "dentist {city}". Fetches reviews count and average rating. Saves as `AuditResult` under category `LOCAL_VISIBILITY` and `REPUTATION`.

---

### `find-competitors`
- **Queue**: `analysis-queue`
- **Concurrency**: 2
- **Payload**:
  ```json
  {
    "auditId": "aud_f4e5d6",
    "city": "Chicago",
    "category": "dentist"
  }
  ```
- **Process**: Queries local listings for the top 3 clinics ranking in the target area. Identifies search gaps and saves results in the `Competitor` database table.

---

### `enrich-contact`
- **Queue**: `analysis-queue`
- **Concurrency**: 2
- **Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c"
  }
  ```
- **Process**: Scrapes clinic contact/about pages for email addresses and leadership names. Calls contact enrichment API if credentials exist. Creates `Contact` record linked to the business.

---

### `calculate-opportunity-score`
- **Queue**: `analysis-queue`
- **Concurrency**: 5
- **Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c"
  }
  ```
- **Process**: Aggregates all `AuditResult` rows for the business. Calculates score (0-100) using deterministic rules:
  - Local Visibility: 30
  - Website Quality: 20
  - Conversion Experience: 20
  - Reviews and Reputation: 15
  - Competitor Gap: 15
  Updates `Business.opportunityScore`.

---

### `generate-audit`
- **Queue**: `analysis-queue`
- **Concurrency**: 2
- **Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c"
  }
  ```
- **Process**: Assembles aggregated findings, formats user-friendly explanations. Triggers AI-rewrite of the findings into plain-English marketing copy. Prepares the private `Audit` entry.

---

### `generate-pdf`
- **Queue**: `analysis-queue`
- **Concurrency**: 1
- **Payload**:
  ```json
  {
    "auditId": "aud_f4e5d6"
  }
  ```
- **Process**: Uses Puppeteer/React-PDF to render the secure audit page route into a static PDF document. Stores PDF in localized disk storage or private S3-compatible container.

---

### `schedule-email`
- **Queue**: `outreach-queue`
- **Concurrency**: 5
- **Payload**:
  ```json
  {
    "contactId": "con_3a4b5c",
    "sequenceId": "seq_9e8d7c",
    "stepId": "stp_1a2b3c",
    "delayDays": 0
  }
  ```
- **Process**: Computes target dispatch timestamp. Inserts a `QUEUED` message into `EmailMessage`. Schedules a BullMQ delayed job targeting the `send-email` worker.

---

### `send-email`
- **Queue**: `outreach-queue`
- **Concurrency**: 1 (rate-throttled by inbox domain constraints)
- **Payload**:
  ```json
  {
    "emailMessageId": "msg_9e8d7c6b5a"
  }
  ```
- **Process**: Checks `SuppressionRecord` and check contact opt-out flag. Compiles body template with clinic details and unique unsubscribe links. Sends mail via configured SMTP or Resend client. Updates `EmailMessage` status to `SENT`.

---

### `process-email-event`
- **Queue**: `outreach-queue`
- **Concurrency**: 5
- **Payload**:
  ```json
  {
    "messageId": "msg_9e8d7c6b5a",
    "eventType": "OPEN" | "CLICK" | "BOUNCE" | "UNSUBSCRIBE",
    "timestamp": "2026-08-04T12:00:00Z"
  }
  ```
- **Process**: Records event in `EngagementEvent`. If the event is a `BOUNCE` or `UNSUBSCRIBE`, it adds the contact to the `SuppressionRecord` list and calls a cleanup task to cancel all pending outreach messages for that contact.
