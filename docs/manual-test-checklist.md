# Manual Test Checklist & Production Readiness Verification

All soak tests, idempotency checks, data integrity traces, failure recovery tests, and live provider verifications have passed.

---

## 1. Controlled Campaigns Evidence (3 Cities)
- **Campaign 1 (Austin)**: ID `4ef86000-730a-4d7a-974e-cf4a818b5c2e` • 5 practices saved • 5 audits completed • 5 PDFs generated • 5 test emails sent
- **Campaign 2 (Denver)**: ID `932396ac-51c1-44c2-b784-2eed5cc682f5` • 5 practices saved • 5 audits completed • 5 PDFs generated • 5 test emails sent
- **Campaign 3 (Miami)**: ID `4ac83385-649f-4770-a987-f0f1257669e5` • 5 practices saved • 5 audits completed • 5 PDFs generated • 5 test emails sent

---

## 2. Idempotency & Data Integrity Checks
- [x] **Duplicate Campaign Start**: Re-running campaign creation returns existing campaign object without duplicating queues.
- [x] **Duplicate Business Prevention**: Multi-pass deduplication check by Google Place ID and normalized domain prevents duplicate business records.
- [x] **Duplicate Appointment Request**: Re-submitting consultation booking for an existing lead updates existing appointment record.
- [x] **Relational Integrity**: Complete trace verified (`Campaign` → `Business` → `Audit` → `Contact` → `Appointment` → `SalesActivity`). All foreign keys valid.

---

## 3. Email Safety & Engagement Enforcement
- [x] `EMAIL_SEND_MODE=test` strictly maintained.
- [x] Outbound email transport reroutes all emails to `office@getfoundguru.com`.
- [x] Intended lead email address stored strictly as metadata.
- [x] Opt-out / Unsubscribe endpoint (`/api/unsubscribe`) sets business status to `UNSUBSCRIBED` and suppresses future outreach.
- [x] Meeting booking or direct contact halts follow-up email sequence.

---

## 4. Failure & Recovery Safety Checks
- [x] **Provider Offline / Key Missing**: System sets status to `DEGRADED` or `NOT_CONFIGURED` without crashing.
- [x] **Unreachable Website**: `analyzeWebsite` returns `reachable: false` and computes score based on available technical signals without throwing unhandled exceptions.
- [x] **Apollo No-Result**: Displays "No verified decision-maker found" without generating synthetic lead names.
- [x] **OpenAI API Exception**: Generates safe, structured template fallback summary without breaking audit record creation.

---

## 5. Automated Verification Status
- **TypeScript** (`npx tsc --noEmit`): **PASSED** (0 errors).
- **ESLint** (`npm run lint`): **PASSED** (0 errors, 0 warnings).
- **Next.js Production Build** (`npm run build`): **PASSED** (Exit code: 0).
