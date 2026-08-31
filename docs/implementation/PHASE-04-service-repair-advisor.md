# PHASE 04 — Service + Repair + Advisor (gpr-01 → gpr-12, adm-01 → adm-04)

**Document ID:** `PHASE-04-service-repair-advisor.md`  
**Version:** 1.0.0  
**Status:** Execution-ready specification  
**Depends on:** [PHASE-01-monorepo-platform-foundation.md](./PHASE-01-monorepo-platform-foundation.md), [PHASE-02-identity-design-catalog.md](./PHASE-02-identity-design-catalog.md), [PHASE-03-general-service-e2e.md](./PHASE-03-general-service-e2e.md) (Exit Gate §24 complete)  
**Unblocks:** [PHASE-05-oneman-sos-account.md](./PHASE-05-oneman-sos-account.md), [PHASE-06-technician-field-execution.md](./PHASE-06-technician-field-execution.md), [PHASE-08-payments-invoicing-closure.md](./PHASE-08-payments-invoicing-closure.md)  
**Estimated effort:** 12–18 engineer-days (single developer + Cursor agent)

**Authority chain:**

1. Walkthrough screens embedded inline in §14 and [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — UI/flow truth.
2. [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) — advisor push during call (`adm-04-send` → `gpr-10-revised`), deny → cart loop, sales advisor vs field technician pricing authority.
3. [`docs/architecture/01-product-constitution.md`](../architecture/01-product-constitution.md) — commercial invariants; technician never sets selling prices.
4. Architecture docs **02, 03, 04, 08, 09, 11** — AdvisorCase state machine, repair catalog, admin estimate publish.

**Critical glossary (repeat in code review):**

> **"Service + repair" tab** = General Service **with optional repair add-ons** + **AdvisorCase** callback loop (this phase).  
> It is **NOT** Inspection + Repair (Phase 07). Do not implement inspection visits, two-visit policy, or `flow_policy = INSPECTION_REPAIR` in Phase 04.  
> **Sales advisor** (Priya on admin-mobile) edits estimate lines during the phone call. **Field technician** (Imran on technician app) never changes customer selling prices — Phase 06 enforces read-only bill.

---

## 0. Phase Summary

### Objective

Deliver the **Service + repair** customer journey (`gpr-01` through `gpr-12`, including `gpr-02-deny-cart`) and the **admin-mobile advisor loop** (`adm-01` through `adm-04`): repair add-on catalog and cart, job card with REPAIR line items, estimate submit + advisor case creation, on-call waiting screen, revised estimate accept/deny, deny → cart re-edit loop, then reuse Phase 03 checkout (details, slot, confirm) with advisor-confirmed scope.

Backend must own: `repair_offerings` catalog API, `job_card_items` kind=REPAIR, `FlowDecision.advisor_requirement = REQUIRED_NOW`, `AdvisorCase` aggregate with call lifecycle, admin estimate publish (`POST /v1/admin/job-cards/{id}/estimate`), customer accept/reject of revised estimates, and **dev-only** simulate endpoint for E2E without admin UI.

### What Phase 04 delivers

| ID | Deliverable | Description |
|----|-------------|-------------|
| P04-A | Repair catalog API | `GET /v1/repair-offerings` with category filter, vehicle context compatibility |
| P04-B | Repair cart UI | `gpr-02-repairs`, `gpr-02-deny-cart` — 2-column add-on grid, cart summary, remove on deny branch |
| P04-C | Service+repair home | `gpr-01-home` — warn policy note, CTA to repair cart before vehicle picker |
| P04-D | Extended job card | `gpr-07-jobcard` — base service + repair lines; PATCH items API |
| P04-E | Advisor estimate submit | `gpr-08-estimate` — single CTA creates advisor case; no direct finalization |
| P04-F | Advisor waiting | `gpr-09-call` — poll/push for revised estimate; safe AdvisorCase status |
| P04-G | Revised estimate UI | `gpr-10-revised` — Accept → slot; Deny → deny-cart |
| P04-H | Booking completion | `gpr-11-slot`, `gpr-12-confirmed` — reuse checkout; ref **JC-1042** demo |
| P04-I | AdvisorCase backend | Tables `advisor_cases`, `advisor_call_attempts`, `advisor_notes`; state transitions |
| P04-J | Admin-mobile advisor | `adm-01-inbox` → `adm-04-send` — inbox, case detail, revise estimate, publish to customer |
| P04-K | Admin estimate publish | `POST /v1/admin/job-cards/{id}/estimate` — new estimate version + push customer to gpr-10 |
| P04-L | Dev simulate | `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate` — development only |
| P04-M | `serviceRepairCoordinator` | Customer navigation from `FlowDecision` including advisor branches |
| P04-N | Contracts + tests | OpenAPI-aligned DTOs; integration test full gpr path; admin publish test |

### What Phase 04 explicitly does NOT deliver

| Item | Phase |
|------|-------|
| Inspection + Repair two-visit flow | 07 |
| Technician field execution, visit screens | 06 |
| One-man booking (`om-*`), SOS (`sos-*`) | 05 |
| Orders list, profile hub (beyond auth reuse) | 05 |
| Razorpay, invoice, payment | 08 |
| Admin web catalog/inventory CRUD | 09 |
| Dispatch board, job assignment (`board`, `dispatch`) | 10 |
| Production push notification infrastructure (FCM/APNs) | 11 — Phase 04 uses polling + optional Realtime stub |
| Full admin web advisor desk | 09 — mobile-primary for on-call |

### Canonical journey (Phase 04)

```text
gpr-01-home (Service + repair tab)
  → gpr-02-repairs (select add-ons)
  → gpr-03-make → gpr-04-model → gpr-05-year → gpr-06-fuel
  → gpr-07-jobcard (concerns + service + repair lines)
  → gpr-08-estimate (submit & request callback)
  → gpr-09-call (advisor on call — waiting)
  → gpr-10-revised (accept OR deny)
       ├─ Accept → checkout/details → gpr-11-slot → gpr-12-confirmed
       └─ Deny → gpr-02-deny-cart → (back to job card OR re-run vehicle flow)

Admin-mobile (parallel during gpr-09):
  adm-01-inbox → adm-02-job → adm-03-estimate → adm-04-send
  (publishes revised estimate → customer sees gpr-10)
```

**Server policy:** `flow_policy = GENERAL_SERVICE`, `advisor_requirement = REQUIRED_NOW` after estimate accept when one or more `job_card_items.kind = REPAIR`.

### Success statement

At Phase 04 exit, customer Rajesh on **Service + repair** tab selects AC gas refill + brake pads, completes vehicle picker, submits estimate ₹5,999, waits on **Priya is calling you**, receives revised estimate ₹6,849 during the call (admin-mobile or dev simulate), accepts, enters details, books Wed 19 11:00–13:00, sees **Service + repairs booked** with **JC-1042**. Deny path returns to cart with banner and **Remove** on tiles. API tests prove advisor required with add-ons; GS path from Phase 03 still has `NOT_REQUIRED`. Field technician routes return 403 on price edit.

---

## 1. Starting State

### 1.1 Phase 03 exit gate (must be true)

| Prerequisite | Verification |
|--------------|--------------|
| General service E2E gs-01→gs-10 works | Manual demo JC-1050 |
| `POST /v1/job-cards`, `/price`, `/accept`, `/finalization`, `/book` | Integration tests green |
| `FlowDecision` builder exists | `backend/app/core/flow_decision.py` |
| Vehicle picker gs-02–05 | Reused for gpr-03–06 |
| Checkout details + slot | `app/checkout/details.tsx`, `slot.tsx` |
| `job_card_items` table with `kind` enum includes `REPAIR` | Migration from Phase 03 |
| `repair_offerings` seed from Phase 02 | DB query 6 rows |
| CI green | GitHub Actions |
| Customer home 4 tabs | gpr-01 body may be stub from Phase 02 |

### 1.2 Repository state at Phase 04 start

```text
apps/customer/
  app/(tabs)/home.tsx           # gpr-01 body stub or partial
  app/vehicle/*                 # gs-02–05 implemented
  app/job-card/[id]/index.tsx   # gs-06 — no repair section
  app/job-card/[id]/estimate.tsx # gs-07 — no gpr-08 copy
  app/checkout/*                # gs-08, gs-09
  app/booking/[id]/index.tsx    # gs-10 — needs gpr-12 copy variant
  # MISSING: repairs-cart, advisor-waiting, advisor-revised, deny-cart routes

apps/admin-mobile/
  app/index.tsx                 # Placeholder inbox stub from Phase 01

backend/
  app/modules/job_cards/        # No REPAIR item mutations in happy path tests
  app/modules/catalog/          # repair_offerings table may exist from Phase 02
  # MISSING: advisor module, admin estimate publish, dev simulate

packages/contracts/
  # MISSING: AdvisorCase, RepairOffering, revised estimate DTOs
```

**Absent at start:**

- `advisor_cases`, `advisor_call_attempts`, `advisor_notes` tables
- `GET /v1/repair-offerings` router
- `POST /v1/job-cards/{id}/items` for repair add-ons
- `POST /v1/job-cards/{id}/advisor-case`
- `POST /v1/admin/job-cards/{id}/estimate`
- `serviceRepairCoordinator`
- Admin-mobile advisor screens adm-01–04
- Customer polling hook for advisor case status

### 1.3 Walkthrough vs architecture resolution (apply in Phase 04)

| Topic | Winning rule | Phase 04 implementation |
|-------|--------------|-------------------------|
| Add-ons trigger advisor | Constitution + audit | `REQUIRED_NOW` when `REPAIR` items present |
| Vehicle timing | Walkthrough wins (Phase 03) | Repair cart **before** vehicle picker gpr-02 → gpr-03 |
| Estimate submit semantics | Walkthrough wins | gpr-08 CTA = accept estimate + create advisor case in one gesture |
| Advisor push during call | Walkthrough wins | adm-04-send → gpr-10; polling 3s + optional Realtime |
| Deny revised estimate | Walkthrough wins | Job card → EDITABLE; navigate gpr-02-deny-cart |
| Technician pricing | Constitution | No technician UI in Phase 04; API docs note read-only |
| Inspection + Repair | Explicitly Phase 07 | Reject `INSPECTION_REPAIR` in Phase 04 scope guards |

---

## 2. Desired End State

### 2.1 Repository tree (additions)

```text
apps/customer/
  app/
    job-card/
      [id]/
        repairs-cart.tsx       # gpr-02 + gpr-02-deny-cart (mode param)
        advisor-waiting.tsx    # gpr-09
        advisor-revised.tsx    # gpr-10
    (tabs)/home.tsx            # gpr-01 body wired
  src/
    coordinators/
      serviceRepairCoordinator.ts
    stores/
      repairCartStore.ts
    hooks/
      useRepairOfferings.ts
      useAdvisorCase.ts
      useAdvisorCasePoll.ts

apps/admin-mobile/
  app/
    (advisor)/
      _layout.tsx
      inbox.tsx                # adm-01
      case/[jobCardId]/
        index.tsx              # adm-02
        estimate.tsx           # adm-03
        send.tsx               # adm-04
  src/
    hooks/
      useAdvisorInbox.ts
      useAdminEstimate.ts

backend/
  app/modules/
    catalog/
      repair_offerings_router.py
    advisor/
      models.py
      repository.py
      service.py
      router.py                # customer advisor-case routes
    admin/
      advisor_cases_router.py
      estimate_publish.py
    dev/
      simulate_router.py       # ENV=development only
  alembic/versions/
    20260830_0004_phase04_advisor.py
  tests/
    integration/
      test_service_repair_advisor_e2e.py
      test_advisor_deny_loop.py
      test_admin_estimate_publish.py
      test_dev_simulate_advisor.py

packages/contracts/src/
  repair-offering.ts
  advisor-case.ts
  admin-estimate.ts
```

### 2.2 Runtime capabilities

| Capability | Endpoint / surface |
|------------|-------------------|
| List repair add-ons | `GET /v1/repair-offerings` |
| Add/remove repair items on job card | `POST/PATCH/DELETE /v1/job-cards/{id}/items` |
| Price with repairs | `POST /v1/job-cards/{id}/price` → total includes REPAIR lines |
| Submit estimate + advisor | `POST .../accept` → `CREATE_ADVISOR_CASE` in FlowDecision |
| Create advisor case | `POST /v1/job-cards/{id}/advisor-case` |
| Poll advisor status | `GET /v1/job-cards/{id}/advisor-case` |
| Accept revised estimate | `POST .../estimates/{id}/accept` (version > 1) |
| Reject revised estimate | `POST .../estimates/{id}/reject` → deny-cart |
| Admin inbox | `GET /v1/admin/advisor-cases?status=OPEN` |
| Admin publish estimate | `POST /v1/admin/job-cards/{id}/estimate` |
| Dev simulate publish | `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate` |
| Finalize + book (post-accept) | Reuse Phase 03 checkout APIs |

### 2.3 Demo data path (manual E2E)

| Step | User action | Expected server state |
|------|-------------|----------------------|
| 1 | Service + repair tab → Select repairs | Navigate gpr-02 |
| 2 | Select AC + brake pads → Continue | `repairCartStore` 2 items |
| 3 | Vehicle Honda City 2019 Petrol | Job card created with 3 items |
| 4 | Concerns "AC weak · brakes soft" | PATCH concerns |
| 5 | Submit estimate ₹5,999 | Estimate v1 ACCEPTED, AdvisorCase OPEN |
| 6 | gpr-09 waiting | AdvisorCase CONTACTING |
| 7 | Admin adm-03 edits → adm-04 send | Estimate v2 READY, case CUSTOMER_CONFIRMATION_DUE |
| 8 | Customer gpr-10 Accept ₹6,849 | Estimate v2 accepted, FINALIZE |
| 9 | Details + slot + confirm | Booking JC-1042 CONFIRMED |

**Deny branch demo:**

| Step | Action | State |
|------|--------|-------|
| 1–7 | Same as above | |
| 8 | Deny on gpr-10 | Estimate v2 rejected, JobCard EDITABLE |
| 9 | gpr-02-deny-cart Remove brake pads | Item deleted |
| 10 | Continue → job card → re-price → callback | New advisor cycle |

---

## 3. Why This Phase Exists Here

Phase 04 is the **second vertical slice** and the **first human-in-the-loop commercial workflow**:

1. **Proves add-on pricing** — Multiple `job_card_items`, server total aggregation, estimate versioning beyond v1.
2. **Proves AdvisorCase** — Operational case separate from JobCard; required before technician sees scope (Phase 06).
3. **Proves admin-mobile value** — On-call advisor cannot use desk admin web; mobile inbox is primary for callback ergonomics.
4. **Proves accept/deny consent** — Customer must explicitly accept revised selling prices before slot — money rule precursor to payments (Phase 08).
5. **Unlocks realistic demos** — Stakeholders see full "callback during call" story from walkthrough.

**Why not earlier?** Phase 03 establishes job card, estimate, and booking without advisor complexity. **Why not with Inspection+Repair?** Phase 07 adds two-visit policy and inspection findings — orthogonal to General Service add-ons.

---

## 4. Source Material

| Document | Use in Phase 04 |
|----------|-----------------|
| [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) | gpr-01–12, gpr-02-deny-cart, adm-01–04 HTML/CSS |
| [`docs/EMERGENT-IMPLEMENTATION-PROMPT.md`](../EMERGENT-IMPLEMENTATION-PROMPT.md) | §5.3 Service+repair flow, §6.7 advisor rules, Phase D scope |
| [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) | Advisor push, deny→cart, sales vs technician pricing |
| [`docs/architecture/02-product-flows.md`](../architecture/02-product-flows.md) | GS with add-ons sequence, advisor outcomes |
| [`docs/architecture/03-domain-model.md`](../architecture/03-domain-model.md) | AdvisorCase, AdvisorCallAttempt fields |
| [`docs/architecture/08-data-model.md`](../architecture/08-data-model.md) | `repair_offerings`, `advisor_cases` tables |
| [`docs/architecture/09-api-contracts.md`](../architecture/09-api-contracts.md) | Advisor + admin estimate endpoints |
| [`docs/architecture/11-screen-specifications.md`](../architecture/11-screen-specifications.md) | Advisor status screen behavior |
| [`PHASE-02-identity-design-catalog.md`](./PHASE-02-identity-design-catalog.md) | gpr-01 home, repair seed §18.4 |
| [`PHASE-03-general-service-e2e.md`](./PHASE-03-general-service-e2e.md) | Reused checkout, vehicle picker, FlowDecision base |
| [`Vibe code principles/GREENFIELD-PLAYBOOK.md`](../../Vibe%20code%20principles/GREENFIELD-PLAYBOOK.md) | Auth on admin routes, dev endpoint guard |

---

## 5. Architectural Context

### 5.1 System diagram (Phase 04 slice)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  apps/customer (Expo)                                                     │
│  gpr-01 → gpr-02 (cart) → gpr-03..06 (vehicle) → gpr-07 (job card)       │
│       → gpr-08 (submit) → gpr-09 (wait) → gpr-10 (accept/deny)           │
│       → [deny] gpr-02-deny-cart  OR  [accept] checkout → gpr-11/12       │
│         serviceRepairCoordinator + poll advisor case every 3s on gpr-09  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS + Bearer JWT
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  apps/admin-mobile (Expo) — role=admin                                     │
│  adm-01 inbox → adm-02 case → adm-03 edit estimate → adm-04 send          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  FastAPI                                                                  │
│  catalog/repair │ job_cards/items │ advisor │ admin/estimate │ dev/sim   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                ▼
                       ┌─────────────────┐
                       │ Supabase Postgres│
                       │ repair_offerings │
                       │ advisor_cases    │
                       │ estimates v1,v2  │
                       └─────────────────┘
```

### 5.2 FlowDecision on Service + repair (with add-ons)

```text
POST /price (with REPAIR items)
  → advisor_requirement: REQUIRED_NOW
  → required_next_action: ACCEPT_ESTIMATE

POST /estimates/{id}/accept (v1)
  → required_next_action: CREATE_ADVISOR_CASE
  → allowed_actions: [CREATE_ADVISOR_CASE, EDIT_JOB_CARD]

POST /advisor-case (created)
  → required_next_action: WAIT_FOR_ADVISOR
  → allowed_actions: [VIEW_ADVISOR_STATUS, CONTACT_SUPPORT]

Admin POST /admin/job-cards/{id}/estimate (publish)
  → AdvisorCase: CUSTOMER_CONFIRMATION_DUE
  → Customer FlowDecision: ACCEPT_REVISED_ESTIMATE

POST /estimates/{id}/accept (v2)
  → required_next_action: FINALIZE
  → advisor_requirement: NOT_REQUIRED (scope confirmed)

POST /estimates/{id}/reject (v2)
  → JobCard: EDITABLE
  → required_next_action: EDIT_JOB_CARD
  → navigate: repairs-cart deny mode

POST /finalization → SELECT_SLOT → CONFIRM_BOOKING (same as Phase 03)
```

### 5.3 AdvisorCase state path (happy path)

```text
OPEN
  → CONTACTING (advisor opens case / starts call)
  → CUSTOMER_REACHED (optional — may skip in MVP)
  → CHANGES_PROPOSED (admin editing estimate on adm-03)
  → CUSTOMER_CONFIRMATION_DUE (adm-04 send)
  → CONFIRMED (customer accepts gpr-10)
```

**Deny path:** `CUSTOMER_CONFIRMATION_DUE` → customer reject → `DECLINED` (or revert case to `OPEN` for retry — MVP: `DECLINED` + JobCard editable).

### 5.4 Aggregate boundaries

| Aggregate | Owner module | Phase 04 scope |
|-----------|--------------|----------------|
| RepairOffering | `catalog` | Read-only list + compatibility filter |
| JobCardItem (REPAIR) | `job_cards` | Add/remove via API; sync to estimate on price |
| AdvisorCase | `advisor` | Create on submit; status transitions |
| Estimate v2 | `estimates` | Admin publish creates new READY version |
| AdvisorCallAttempt | `advisor` | Optional log on adm-02 "Open & call" |
| Booking | `bookings` | Reuse Phase 03 after advisor confirm |

### 5.5 Realtime / polling strategy (MVP)

| Mechanism | Phase 04 behavior |
|-----------|-------------------|
| Polling | `useAdvisorCasePoll` on gpr-09 and gpr-10 — interval 3s, stop on terminal state |
| Push notification | Stub event log only; full FCM in Phase 11 |
| Supabase Realtime | Optional channel `advisor_case:{job_card_id}` — subscribe on gpr-09 if `EXPO_PUBLIC_REALTIME_ENABLED=true` |
| Admin send | Returns `customer_notified_at`; customer poll picks up within 3s |

---

## 6. Exact Implementation Scope + Out of Scope

### 6.1 In scope (mandatory)

| ID | Requirement |
|----|-------------|
| S1 | `GET /v1/repair-offerings` with 6 seeded add-ons |
| S2 | `gpr-02-repairs` 2-column grid, cart summary, dynamic CTA count |
| S3 | `gpr-02-deny-cart` warn banner, Remove on selected tiles, dual CTAs |
| S4 | `gpr-01-home` warn policy note, CTA to repairs cart |
| S5 | Vehicle picker gpr-03–06 reuses gs-02–05 with flow rail steps 3–6 of 12 |
| S6 | `gpr-07-jobcard` shows service + repair lines with part icons |
| S7 | `gpr-08-estimate` single CTA "Submit estimate & request callback" |
| S8 | `gpr-09-call` polling, submitted total, on-call status chip |
| S9 | `gpr-10-revised` revision styling (strike, Added on call chip), Accept/Deny |
| S10 | `gpr-11-slot`, `gpr-12-confirmed` — JC-1042 demo copy |
| S11 | `adm-01` through `adm-04` admin-mobile screens |
| S12 | `advisor_cases` + related tables migration |
| S13 | `POST /v1/admin/job-cards/{id}/estimate` publish |
| S14 | `POST /v1/dev/.../simulate-advisor-estimate` dev-only guard |
| S15 | FlowDecision `REQUIRED_NOW` and advisor branches |
| S16 | Integration test: add-ons → advisor → publish → accept → book |
| S17 | Integration test: deny → cart → remove item |
| S18 | Regression: Phase 03 GS path still `NOT_REQUIRED` |

### 6.2 Out of scope (do not implement)

| ID | Item | Reason |
|----|------|--------|
| O1 | Inspection + Repair UI/API | Phase 07 |
| O2 | `flow_policy = INSPECTION_REPAIR` | Phase 07 |
| O3 | Technician visit screens | Phase 06 |
| O4 | Dispatch board, assign tech | Phase 10 |
| O5 | Admin web full advisor desk | Phase 09 — mobile primary |
| O6 | WhatsApp/SMS advisor outreach | Future — phone call assumed |
| O7 | Call recording storage | Legal review — not MVP |
| O8 | Razorpay / invoice | Phase 08 |
| O9 | Customer orders list | Phase 05 |
| O10 | Repair catalog admin CRUD UI | Phase 09 |
| O11 | Vehicle compatibility matrix (full) | MVP: all 6 seeds compatible with demo Honda City |

---

## 7. Repository Changes

### 7.1 New files (create)

| Path | Purpose |
|------|---------|
| `apps/customer/app/job-card/[id]/repairs-cart.tsx` | gpr-02 + deny variant |
| `apps/customer/app/job-card/[id]/advisor-waiting.tsx` | gpr-09 |
| `apps/customer/app/job-card/[id]/advisor-revised.tsx` | gpr-10 |
| `apps/customer/src/coordinators/serviceRepairCoordinator.ts` | Advisor navigation |
| `apps/customer/src/stores/repairCartStore.ts` | Pre-job-card cart draft |
| `apps/customer/src/hooks/useRepairOfferings.ts` | Catalog query |
| `apps/customer/src/hooks/useAdvisorCase.ts` | Case query + mutations |
| `apps/customer/src/hooks/useAdvisorCasePoll.ts` | Polling wrapper |
| `apps/admin-mobile/app/(advisor)/inbox.tsx` | adm-01 |
| `apps/admin-mobile/app/(advisor)/case/[jobCardId]/index.tsx` | adm-02 |
| `apps/admin-mobile/app/(advisor)/case/[jobCardId]/estimate.tsx` | adm-03 |
| `apps/admin-mobile/app/(advisor)/case/[jobCardId]/send.tsx` | adm-04 |
| `backend/app/modules/advisor/*` | Advisor domain |
| `backend/app/modules/admin/estimate_publish.py` | Publish service |
| `backend/app/modules/dev/simulate_router.py` | Dev simulate |
| `backend/alembic/versions/20260830_0004_phase04_advisor.py` | Migration |
| `packages/contracts/src/repair-offering.ts` | DTOs |
| `packages/contracts/src/advisor-case.ts` | DTOs |

### 7.2 Modified files

| Path | Change |
|------|--------|
| `apps/customer/app/(tabs)/home.tsx` | Wire gpr-01 CTA to repairs-cart |
| `apps/customer/app/job-card/[id]/index.tsx` | Repair lines section for gpr-07 |
| `apps/customer/app/job-card/[id]/estimate.tsx` | Branch gpr-08 vs gs-07 by items |
| `apps/customer/app/booking/[id]/index.tsx` | gpr-12 subtitle variant |
| `backend/app/core/flow_decision.py` | REQUIRED_NOW branches |
| `backend/app/modules/job_cards/router.py` | Items CRUD |
| `backend/app/modules/catalog/router.py` | repair-offerings route |
| `backend/app/main.py` | Register advisor, admin, dev routers |
| `packages/contracts/src/flow-decision.ts` | New actions enum values |

### 7.3 Files explicitly not touched

| Path | Reason |
|------|--------|
| `apps/technician/**` | Phase 06 |
| `apps/admin/app/**` (Next.js) | Phase 09 |
| Inspection modules | Phase 07 |
| `backend/app/modules/payments/**` | Phase 08 |

---

## 8. Detailed Implementation Sequence (Task X.Y)

Execute in order unless noted **parallel OK**.

### Block A — Database & advisor domain (Days 1–3)

#### Task 4.1 — Alembic migration: advisor tables

Create `20260830_0004_phase04_advisor.py`:

```sql
CREATE TYPE advisor_case_status AS ENUM (
  'NOT_REQUIRED', 'OPEN', 'CONTACTING', 'CUSTOMER_REACHED',
  'CHANGES_PROPOSED', 'CUSTOMER_CONFIRMATION_DUE', 'CONFIRMED',
  'UNREACHABLE', 'DECLINED', 'CANCELLED'
);

CREATE TABLE advisor_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE RESTRICT,
  status advisor_case_status NOT NULL DEFAULT 'OPEN',
  assigned_admin_id UUID REFERENCES profiles(id),
  verified_phone_e164 TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  customer_response TEXT,
  confirmed_estimate_id UUID REFERENCES estimates(id),
  resolution_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_card_id)
);

CREATE TABLE advisor_call_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_case_id UUID NOT NULL REFERENCES advisor_cases(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'phone',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  outcome TEXT,
  notes TEXT,
  actor_id UUID REFERENCES profiles(id),
  callback_requested BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE advisor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_case_id UUID NOT NULL REFERENCES advisor_cases(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_internal BOOLEAN NOT NULL DEFAULT true
);
```

**Verify:** `alembic upgrade head`; one case per job card constraint.

#### Task 4.2 — Repair offerings migration (if not in Phase 02)

Ensure `repair_offerings`, `repair_categories`, `repair_offering_versions` per architecture §08. Seed 6 rows from Phase 02 §18.4.

**Verify:** `SELECT slug, display_price_minor FROM repair_offerings` returns 6 rows.

#### Task 4.3 — SQLAlchemy models + AdvisorRepository

Implement `AdvisorCase`, `AdvisorCallAttempt`, `AdvisorNote` ORM models and repository with:

- `get_by_job_card_id(job_card_id)`
- `list_open_cases(limit, offset)` for admin inbox
- `transition(case_id, new_status, actor_id)`

**Verify:** Unit test status transition guards.

#### Task 4.4 — Reference seed JC-1042

Extend seed script: job card ref sequence can produce **JC-1042** for gpr demo path (or override in test fixture).

**Verify:** Integration test uses JC-1042 public_ref.

### Block B — Backend APIs (Days 3–8)

#### Task 4.5 — `GET /v1/repair-offerings`

Query params: `category_id`, `query`, `vehicle_make`, `vehicle_model`, `vehicle_year`.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "ac-gas-refill",
      "name": "AC gas refill",
      "display_price": { "amount_minor": 120000, "currency": "INR" },
      "category": { "id": "uuid", "name": "AC & cooling" },
      "icon_key": "part-ac",
      "compatible": true
    }
  ]
}
```

**Verify:** 6 items; Honda City 2019 all compatible in MVP.

#### Task 4.6 — `POST /v1/job-cards/{id}/items` (REPAIR)

```json
{
  "kind": "REPAIR",
  "repair_offering_slug": "ac-gas-refill",
  "quantity": 1
}
```

Creates `job_card_items` row linked to `repair_offerings`. JobCard stays `EDITABLE`.

**Verify:** Duplicate slug returns 409 or upserts quantity per product rule (MVP: one row per slug).

#### Task 4.7 — `DELETE /v1/job-cards/{id}/items/{item_id}`

Removes repair line. Used by deny-cart Remove UI.

**Verify:** Delete last repair item → next price returns `NOT_REQUIRED` if business rule allows — **MVP: still GENERAL_SERVICE but advisor not required only when zero REPAIR items at accept time**.

#### Task 4.8 — Update `POST /price` for repairs

Sum SERVICE + REPAIR lines. Demo path: 299900 + 120000 + 180000 = **599900** paise (₹5,999).

Return `advisor_requirement: REQUIRED_NOW` when any REPAIR item present.

**Verify:** pytest `test_price_with_repairs`.

#### Task 4.9 — Update `POST .../accept` for advisor branch

When REPAIR items and v1 accept:

- Record `estimate_acceptances`
- JobCard → `ADVISOR_REQUIRED` (or `ESTIMATE_ACCEPTED` + advisor flag)
- FlowDecision `required_next_action: CREATE_ADVISOR_CASE`

Do **not** allow FINALIZE until advisor scope confirmed.

**Verify:** Accept without advisor case returns `CREATE_ADVISOR_CASE` not `FINALIZE`.

#### Task 4.10 — `POST /v1/job-cards/{id}/advisor-case`

Creates AdvisorCase `OPEN` if not exists. Idempotent.

Response includes safe customer view:

```json
{
  "advisor_case": {
    "id": "uuid",
    "status": "OPEN",
    "safe_status_label": "Callback requested",
    "advisor_display_name": "Priya",
    "expected_response_window_minutes": 15,
    "submitted_total_minor": 599900
  },
  "flow_decision": {
    "required_next_action": "WAIT_FOR_ADVISOR",
    "allowed_actions": ["VIEW_ADVISOR_STATUS", "CONTACT_SUPPORT"]
  }
}
```

**Verify:** Second POST returns same case 200.

#### Task 4.11 — `GET /v1/job-cards/{id}/advisor-case`

Customer-safe fields only — no internal notes.

When status `CUSTOMER_CONFIRMATION_DUE`, include `pending_estimate_id` for gpr-10.

**Verify:** Internal notes not in JSON response.

#### Task 4.12 — `GET /v1/admin/advisor-cases`

Admin role required. Filter `status=OPEN,CONTACTING,CUSTOMER_CONFIRMATION_DUE`.

Sort: `callback_requested_at` ascending.

Returns inbox rows for adm-01.

**Verify:** Customer JWT gets 403.

#### Task 4.13 — `GET /v1/admin/job-cards/{id}`

Full job card for adm-02: concerns, all line items, customer name, phone, submitted estimate.

**Verify:** Matches adm-02 walkthrough lines.

#### Task 4.14 — `POST /v1/admin/job-cards/{id}/estimate`

Admin publishes revised estimate during call (adm-03 → adm-04).

Request body:

```json
{
  "lines": [
    { "kind": "SERVICE", "label": "General service + health report", "amount_minor": 299900 },
    { "kind": "REPAIR", "repair_offering_slug": "ac-gas-refill", "amount_minor": 120000 },
    { "kind": "REPAIR", "repair_offering_slug": "brake-pads-pair", "amount_minor": 220000 },
    { "kind": "REPAIR", "label": "Brake fluid flush", "amount_minor": 45000 }
  ],
  "advisor_case_id": "uuid",
  "publish_to_customer": true,
  "revision_notes_customer_safe": "Brake pads upgraded; fluid flush added on call."
}
```

Transactional:

1. Create Estimate version N+1 status `READY`
2. AdvisorCase → `CUSTOMER_CONFIRMATION_DUE`
3. Set `pending_estimate_id` on case
4. JobCard → `REVISED_ESTIMATE_PENDING`
5. Return estimate + audit ref

Demo total: **684900** paise (₹6,849).

**Verify:** Customer GET advisor-case shows pending estimate within poll window.

#### Task 4.15 — `POST .../estimates/{id}/reject` (customer)

Customer denies gpr-10.

- Record rejection
- AdvisorCase → `DECLINED` (or `OPEN` for retry — document: use `DECLINED`)
- JobCard → `EDITABLE`
- Invalidate pending estimate acceptance
- FlowDecision: `EDIT_JOB_CARD`, navigate deny-cart

**Verify:** `test_advisor_deny_loop.py`.

#### Task 4.16 — `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate`

Guard: `settings.ENVIRONMENT == "development"` OR `ENABLE_DEV_SIMULATE=true`.

Applies same logic as Task 4.14 with canned demo revision (brake pads 220000, fluid flush 45000).

Returns 404 in production.

**Verify:** Production settings returns 404; dev returns 200.

#### Task 4.17 — Update FlowDecision builder

Add actions: `CREATE_ADVISOR_CASE`, `WAIT_FOR_ADVISOR`, `VIEW_ADVISOR_STATUS`, `ACCEPT_REVISED_ESTIMATE`, `REJECT_REVISED_ESTIMATE`.

Regression: zero REPAIR items → identical to Phase 03.

**Verify:** `test_flow_decision_gs.py` still passes.

#### Task 4.18 — OpenAPI + contracts sync

Update `packages/contracts` with RepairOffering, AdvisorCase, AdminEstimatePublish types.

**Verify:** `pnpm typecheck` passes.

### Block C — Customer mobile (Days 7–12)

#### Task 4.19 — `repairCartStore` (Zustand)

```typescript
interface RepairCartDraft {
  selectedSlugs: string[];
  mode: 'normal' | 'deny';
}
```

Persist selected slugs until job card created or booking complete.

**Verify:** Kill app on gpr-02; selections restore.

#### Task 4.20 — `gpr-01-home` wire CTA

Service + repair tab body per §14.1. CTA navigates:

```typescript
router.push('/job-card/repairs-cart?mode=normal');
// OR if job card exists: /job-card/{id}/repairs-cart
```

Pre-job-card route: `app/job-card/repairs-cart.tsx` creating draft path — **prefer:** CTA → standalone `repairs-cart` with `offering=general-service-health-report` then vehicle picker.

Normative route from walkthrough: gpr-01 → gpr-02 **before** vehicle. Store cart in Zustand; vehicle picker creates job card with items.

**Verify:** Tab underline on Service + repair; warn policy note visible.

#### Task 4.21 — `gpr-02-repairs` screen

Implement per §14.2. Load offerings from API. Toggle tiles updates store. CTA:

```typescript
router.push({ pathname: '/vehicle/make', params: { flow: 'service-repair', offering: 'general-service-health-report' } });
```

Dynamic CTA: `Continue with ${count} repairs`.

**Verify:** 2-column grid; AC + brake pads pre-selected in dev fixture optional.

#### Task 4.22 — Vehicle picker flow param `service-repair`

On `Use this car` (gpr-06): `POST /v1/job-cards` then `POST` items for each selected repair slug → `/job-card/{id}`.

Flow rail: 12 steps (repair flow); dots 3–6 on vehicle screens.

**Verify:** Job card has 3 items after create.

#### Task 4.23 — `gpr-07-jobcard` extensions

Add repair lines with part icon placeholder. Concerns demo: "AC weak · brakes feel soft."

CTA **Review estimate** → price → estimate screen.

**Verify:** Lines match walkthrough amounts.

#### Task 4.24 — `gpr-08-estimate` screen

Separate route or branch in `estimate.tsx` when `repairItems.length > 0`.

Single CTA **Submit estimate & request callback**:

```typescript
await acceptEstimate();
await createAdvisorCase();
router.replace(`/job-card/${id}/advisor-waiting`);
```

No "Change job card" secondary on gpr-08 (walkthrough shows single CTA).

**Verify:** Does not navigate to checkout/details.

#### Task 4.25 — `gpr-09-call` advisor-waiting

Mount `useAdvisorCasePoll`. Display per §14.9.

On `CUSTOMER_CONFIRMATION_DUE` → `router.replace(/job-card/${id}/advisor-revised)`.

**Verify:** Poll stops after navigation.

#### Task 4.26 — `gpr-10-revised` advisor-revised

Load pending estimate v2. Accept → accept mutation → coordinator → `/checkout/details`.

Deny → reject mutation → `/job-card/${id}/repairs-cart?mode=deny`.

**Verify:** Revision lines styled per walkthrough.

#### Task 4.27 — `gpr-02-deny-cart` mode

Query param `mode=deny`. Show banner. Selected tiles show **Remove** instead of checkmark.

CTAs:

- **Back to ⑦ Job card** → `/job-card/{id}`
- **Continue with updated cart** → re-price flow or vehicle if items empty

**Verify:** Remove calls DELETE item API.

#### Task 4.28 — `gpr-11-slot` and `gpr-12-confirmed`

Reuse `checkout/slot.tsx` with subtitle **Service + repairs · Wed preferred**.

Booking confirmed copy per §14.12 — JC-1042, subtitle about accepting on call.

**Verify:** Booking snapshot includes repair lines.

#### Task 4.29 — `serviceRepairCoordinator`

Extends `generalServiceCoordinator` patterns:

```typescript
case 'CREATE_ADVISOR_CASE':
  return `/job-card/${ctx.jobCardId}/advisor-waiting`;
case 'WAIT_FOR_ADVISOR':
  return `/job-card/${ctx.jobCardId}/advisor-waiting`;
case 'ACCEPT_REVISED_ESTIMATE':
  return `/job-card/${ctx.jobCardId}/advisor-revised`;
case 'FINALIZE':
  return '/checkout/details';
```

**Verify:** Unit tests for all advisor branches.

### Block D — Admin mobile (Days 10–14)

#### Task 4.30 — Admin auth gate

Admin-mobile uses same Supabase auth; `GET /v1/me` must return `role=admin`.

Seed admin profile: Priya, phone +91 98000 00001 (dev fixture).

**Verify:** Customer role cannot open advisor routes.

#### Task 4.31 — `adm-01-inbox`

Implement per §14.13. `GET /v1/admin/advisor-cases`.

Tap **Open & call customer** → case detail; optional `POST` call attempt.

**Verify:** JC-1042 card shows warn border.

#### Task 4.32 — `adm-02-job` case detail

Load admin job card. CTA **Edit estimate on call** → estimate editor.

Transition case to `CONTACTING` on mount or button tap.

**Verify:** Concerns and lines match walkthrough.

#### Task 4.33 — `adm-03-estimate` editor

Local line list editor. Buttons **+ Add line**, **Remove line** (MVP: edit amounts and add fluid flush line).

**Ready to send to app** → navigate send screen with draft lines.

**Verify:** Total shows ₹6,849 demo.

#### Task 4.34 — `adm-04-send` publish

Summary card. CTA **Send to customer app now** → `POST /v1/admin/job-cards/{id}/estimate` with `publish_to_customer: true`.

Secondary **Still on call with Rajesh** → back to adm-02 without publish.

**Verify:** Customer gpr-09 transitions to gpr-10 within 3s.

### Block E — Testing & audits (Days 14–18)

#### Task 4.35 — Integration test full advisor E2E

`test_service_repair_advisor_e2e.py`:

1. Customer creates job card with 2 repairs
2. Price, accept, create advisor case
3. Admin publishes estimate
4. Customer accepts revised
5. Finalize, book
6. Assert JC-1042 pattern, total 684900 in snapshot

**Verify:** `uv run pytest tests/integration/test_service_repair_advisor_e2e.py -v`

#### Task 4.36 — Deny loop test

`test_advisor_deny_loop.py` — reject → EDITABLE → remove item.

#### Task 4.37 — Regression Phase 03

Run `test_general_service_e2e.py` — must pass unchanged.

#### Task 4.38 — Manual E2E checklist §17

Document evidence for gpr + adm paths.

---

## 9. Mobile Implementation

### 9.1 Customer app stack (extends Phase 03)

| Library | Phase 04 usage |
|---------|----------------|
| Expo Router 4 | repairs-cart, advisor-waiting, advisor-revised routes |
| TanStack Query | `useRepairOfferings`, `useAdvisorCase`, invalidate on publish |
| Zustand | `repairCartStore` — selected repair slugs pre-job-card |
| React Hook Form | Unchanged checkout forms |
| FlashList | Repair add-on grid if list grows |

### 9.2 Customer route map

```text
app/(tabs)/home.tsx                         # gpr-01 (Service + repair tab body)
app/job-card/repairs-cart.tsx               # gpr-02 entry (no job card id yet)
app/job-card/[id]/repairs-cart.tsx          # gpr-02 + gpr-02-deny-cart
app/vehicle/make.tsx … fuel.tsx             # gpr-03–06 (flow=service-repair)
app/job-card/[id]/index.tsx                 # gpr-07
app/job-card/[id]/estimate.tsx              # gpr-08 (branch)
app/job-card/[id]/advisor-waiting.tsx       # gpr-09
app/job-card/[id]/advisor-revised.tsx       # gpr-10
app/checkout/details.tsx                    # post-accept (reuse gs-08)
app/checkout/slot.tsx                       # gpr-11
app/booking/[id]/index.tsx                  # gpr-12
```

### 9.3 `serviceRepairCoordinator` (normative)

Location: `apps/customer/src/coordinators/serviceRepairCoordinator.ts`

**Rules:**

1. Never infer advisor need from tab — read `FlowDecision.advisor_requirement`.
2. After v1 accept with repairs, if `CREATE_ADVISOR_CASE`, call advisor-case API then waiting screen.
3. On gpr-09, poll until `CUSTOMER_CONFIRMATION_DUE` or terminal decline.
4. After v2 accept, delegate to Phase 03 checkout routes via `FINALIZE` / `SELECT_SLOT`.
5. On reject, navigate `repairs-cart?mode=deny` — do not clear concerns.
6. Never navigate to inspection or one-man routes from this coordinator.

### 9.4 TanStack Query keys (additions)

```typescript
export const queryKeys = {
  repairOfferings: (params: RepairOfferingQuery) => ['repair-offerings', params] as const,
  advisorCase: (jobCardId: string) => ['advisor-case', jobCardId] as const,
  adminAdvisorCases: (status: string) => ['admin-advisor-cases', status] as const,
  adminJobCard: (jobCardId: string) => ['admin-job-card', jobCardId] as const,
};
```

Invalidate `advisorCase` and `jobCard` after accept/reject/publish.

### 9.5 Repair cart → job card creation sequence

```typescript
// On gpr-06 Use this car (service-repair flow):
const jobCard = await createJobCard({ offering, vehicleContext, concerns: [] });
for (const slug of repairCartStore.selectedSlugs) {
  await addJobCardItem(jobCard.id, { kind: 'REPAIR', repair_offering_slug: slug });
}
repairCartStore.clear();
router.replace(`/job-card/${jobCard.id}`);
```

Concerns entered on gpr-07; optional PATCH before price.

### 9.6 Admin-mobile stack

| Library | Usage |
|---------|-------|
| Expo Router | `(advisor)` stack group |
| TanStack Query | Inbox list, job card detail, estimate publish mutation |
| Same design tokens | Light-blue accent from `packages/ui` |

### 9.7 Admin-mobile route map

```text
app/(advisor)/_layout.tsx
app/(advisor)/inbox.tsx                     # adm-01
app/(advisor)/case/[jobCardId]/index.tsx    # adm-02
app/(advisor)/case/[jobCardId]/estimate.tsx # adm-03
app/(advisor)/case/[jobCardId]/send.tsx     # adm-04
app/index.tsx                               # Redirect admin → inbox
```

### 9.8 Admin-mobile auth

- Require `role=admin` on app mount; show error if customer token.
- Display advisor name **Priya** in header right slot (adm-01).
- All API calls use admin JWT; routes under `/v1/admin/*`.

### 9.9 Admin estimate editor (adm-03) local state

```typescript
interface EditableLine {
  id: string;
  kind: 'SERVICE' | 'REPAIR' | 'CUSTOM';
  label: string;
  repair_offering_slug?: string;
  amount_minor: number;
}
```

**+ Add line** opens bottom sheet: pick from repair catalog or custom label.

**Remove line** removes row locally until publish.

**Ready to send to app** passes draft via navigation params or Zustand `estimateDraftStore`.

### 9.10 Polling hook `useAdvisorCasePoll`

```typescript
export function useAdvisorCasePoll(jobCardId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.advisorCase(jobCardId),
    queryFn: () => api.getAdvisorCase(jobCardId),
    refetchInterval: (data) => {
      if (!enabled) return false;
      const terminal = ['CONFIRMED', 'DECLINED', 'CANCELLED', 'UNREACHABLE'];
      if (terminal.includes(data?.status)) return false;
      if (data?.status === 'CUSTOMER_CONFIRMATION_DUE') return false;
      return 3000;
    },
  });
}
```

### 9.11 Component reuse

| Component | Phase 04 usage |
|-----------|----------------|
| `HomeChrome` | gpr-01 |
| `ModeTabs` | gpr-01 active tab `repair` |
| `PolicyNote` variant `warn` | gpr-01, gpr-09 chip |
| `FlowRail` | 12-step repair flow gpr-03–12 |
| `PrimaryButton`, `SecondaryButton` | All CTAs |
| `AddonTile` | gpr-02 grid (new) |
| `EstimateLineList` | gpr-08, gpr-10, adm-03 |

### 9.12 Analytics events (Phase 04)

| Event | When |
|-------|------|
| `repair_tab_viewed` | gpr-01 mount |
| `repair_cart_opened` | gpr-02 mount |
| `repair_item_toggled` | Tile tap |
| `advisor_case_created` | gpr-08 success |
| `advisor_waiting_viewed` | gpr-09 mount |
| `revised_estimate_viewed` | gpr-10 mount |
| `revised_estimate_accepted` | Accept tap |
| `revised_estimate_denied` | Deny tap |
| `deny_cart_opened` | deny mode mount |
| `admin_inbox_viewed` | adm-01 mount |
| `admin_estimate_published` | adm-04 success |

### 9.13 Accessibility

- gpr-02 tiles: announce name + price + selected state
- gpr-09: `accessibilityLiveRegion` on status changes
- gpr-10 revision lines: read "was X, now Y" for revised rows
- adm-04 send: confirm dialog before publish — "Send ₹6,849 estimate to customer app"

---

## 10. Backend Implementation

### 10.1 Module layout (additions)

```text
backend/app/modules/
  catalog/
    repair_offerings_router.py
    repair_service.py
  advisor/
    models.py
    schemas.py
    repository.py
    service.py
    router.py              # customer GET/POST advisor-case
  admin/
    advisor_cases_router.py
    estimate_publish.py
    dependencies.py        # require_admin_role
  dev/
    simulate_router.py
  job_cards/
    items_service.py       # REPAIR item CRUD
```

### 10.2 Advisor service responsibilities

| Method | Behavior |
|--------|----------|
| `create_case(job_card_id, profile_id)` | Idempotent OPEN case |
| `start_contact(case_id, admin_id)` | → CONTACTING, log attempt |
| `propose_changes(case_id)` | → CHANGES_PROPOSED |
| `publish_estimate(case_id, estimate_id)` | → CUSTOMER_CONFIRMATION_DUE |
| `confirm_scope(case_id, estimate_id)` | → CONFIRMED on customer accept |
| `decline_scope(case_id)` | → DECLINED on customer reject |
| `safe_customer_view(case)` | Strip internal notes |

### 10.3 Estimate publish service

`EstimatePublishService.publish_admin_revision()`:

1. Validate admin role and case ownership
2. Validate job card has active advisor case
3. Create new `estimates` row version = max+1, status READY
4. Replace `estimate_line_items` for new version
5. Update `job_card_items` to match published scope (sync REPAIR rows)
6. Transition AdvisorCase
7. Write `job_card_events` audit entry
8. Return estimate DTO with `revision_diff` for gpr-10 UI

### 10.4 Dev simulate router

```python
@router.post("/v1/dev/job-cards/{job_card_id}/simulate-advisor-estimate")
async def simulate_advisor_estimate(
    job_card_id: UUID,
    _: None = Depends(require_dev_environment),
):
    """Applies canned revision for JC-1042 demo path."""
```

Canned lines: brake pads 220000, add brake fluid flush 45000.

Must not register router when `ENVIRONMENT=production`.

### 10.5 Job card status extensions

Add or use statuses:

| Status | Meaning |
|--------|---------|
| `ADVISOR_REQUIRED` | v1 accepted, case not confirmed |
| `REVISED_ESTIMATE_PENDING` | v2 published, awaiting customer |
| `EDITABLE` | After deny — customer editing cart |

Document transitions in `job_card_events`.

### 10.6 Authorization matrix

| Route | customer | admin | technician |
|-------|----------|-------|------------|
| GET repair-offerings | ✓ | ✓ | ✓ |
| POST job-card items | ✓ owner | ✗ | ✗ |
| POST advisor-case | ✓ owner | ✗ | ✗ |
| GET admin/advisor-cases | ✗ | ✓ | ✗ |
| POST admin/job-cards/estimate | ✗ | ✓ | ✗ |
| POST dev/simulate | dev only | dev only | ✗ |

### 10.7 Error codes (additions)

| Code | When |
|------|------|
| `ADVISOR_CASE_REQUIRED` | Finalize before advisor confirm |
| `ADVISOR_SCOPE_PENDING` | Book while v2 pending |
| `REPAIR_NOT_COMPATIBLE` | Offering incompatible with vehicle |
| `ESTIMATE_VERSION_MISMATCH` | Accept wrong version |
| `ADVISOR_CASE_NOT_OPEN` | Admin publish on confirmed case |

Each returns `allowed_actions` for client recovery.

---

## 11. Database Implementation

### 11.1 `repair_offerings` (ensure exists)

```sql
CREATE TABLE IF NOT EXISTS repair_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS repair_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES repair_categories(id),
  display_price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  icon_key TEXT,
  dev_fixture BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 11.2 Seed data (canonical demo)

| slug | name | display_price_minor |
|------|------|---------------------|
| ac-gas-refill | AC gas refill | 120000 |
| brake-pads-pair | Brake pads (pair) | 180000 |
| ac-condenser-oem | AC condenser OEM | 420000 |
| bumper-repaint | Bumper repaint | 250000 |
| cabin-filter | Cabin filter | 65000 |
| headlight-assembly | Headlight assembly | 140000 |

Category seed: `ac-cooling`, `brakes`, `body`, `filters`, `lighting`.

### 11.3 `job_card_items` REPAIR rows

```sql
-- Existing from Phase 03; ensure columns:
ALTER TABLE job_card_items ADD COLUMN IF NOT EXISTS repair_offering_id UUID REFERENCES repair_offerings(id);
-- kind enum includes 'REPAIR'
```

Constraint: `kind=REPAIR` requires `repair_offering_id` NOT NULL.

### 11.4 `estimates` versioning

Partial unique: one `READY` estimate per job_card at a time.

On publish: previous READY → `SUPERSEDED` or `REPLACED`.

`estimate_line_items` includes optional `revision_marker`:

- `was_amount_minor` — for gpr-10 strike display
- `change_type` — `ADDED`, `PRICE_CHANGED`, `REMOVED` (customer-visible diff)

### 11.5 `estimate_rejections` (if not exists)

```sql
CREATE TABLE IF NOT EXISTS estimate_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  profile_id UUID NOT NULL REFERENCES profiles(id)
);
```

### 11.6 Advisor case indexes

```sql
CREATE INDEX idx_advisor_cases_status ON advisor_cases(status);
CREATE INDEX idx_advisor_cases_assigned ON advisor_cases(assigned_admin_id) WHERE status IN ('OPEN','CONTACTING');
CREATE INDEX idx_advisor_call_attempts_case ON advisor_call_attempts(advisor_case_id);
```

### 11.7 Dev fixtures

| Entity | Value |
|--------|-------|
| Customer | Rajesh Kumar +91 98765 43210 |
| Admin advisor | Priya +91 98000 00001 |
| Job card ref | JC-1042 |
| Submitted total | 599900 paise |
| Revised total | 684900 paise |

Seed script: `python -m scripts.seed_advisor_demo --env development`

### 11.8 Immutability rules

- `estimate_acceptances` — immutable after insert
- `booking_snapshots` — unchanged from Phase 03; must include repair lines at book time
- `advisor_notes` with `is_internal=true` — never exposed to customer API

---

## 12. API Contracts

### 12.1 `GET /v1/repair-offerings`

**Auth:** Optional (public catalog OK for MVP)

**Query:** `vehicle_make`, `vehicle_model`, `vehicle_year`, `category_id`, `query`

**Response 200:**

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "ac-gas-refill",
      "name": "AC gas refill",
      "display_price": { "amount_minor": 120000, "currency": "INR" },
      "category": { "id": "...", "name": "AC & cooling" },
      "icon_key": "part-ac",
      "compatible": true
    },
    {
      "slug": "brake-pads-pair",
      "name": "Brake pads (pair)",
      "display_price": { "amount_minor": 180000, "currency": "INR" },
      "compatible": true
    }
  ]
}
```

### 12.2 `POST /v1/job-cards/{id}/items`

**Auth:** Required, owner

**Request:**

```json
{
  "kind": "REPAIR",
  "repair_offering_slug": "ac-gas-refill",
  "quantity": 1
}
```

**Response 201:**

```json
{
  "item": {
    "id": "uuid",
    "kind": "REPAIR",
    "label": "AC gas refill",
    "repair_offering_slug": "ac-gas-refill",
    "unit_price_minor": 120000,
    "quantity": 1
  },
  "job_card": { "id": "...", "status": "EDITABLE" }
}
```

### 12.3 `DELETE /v1/job-cards/{id}/items/{item_id}`

**Response 200:** Updated job card without item.

**409 INVALID_STATE:** Cannot delete after booking confirmed.

### 12.4 `POST /v1/job-cards/{id}/price` (with repairs)

**Response 200:**

```json
{
  "estimate": {
    "id": "est-v1-uuid",
    "version": 1,
    "status": "READY",
    "total": { "amount_minor": 599900, "currency": "INR" },
    "line_items": [
      { "label": "General servicing + health report", "amount_minor": 299900, "kind": "SERVICE" },
      { "label": "AC gas refill", "amount_minor": 120000, "kind": "REPAIR" },
      { "label": "Brake pads (pair)", "amount_minor": 180000, "kind": "REPAIR" }
    ]
  },
  "flow_decision": {
    "policy": "GENERAL_SERVICE",
    "advisor_requirement": "REQUIRED_NOW",
    "required_next_action": "ACCEPT_ESTIMATE",
    "allowed_actions": ["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"]
  }
}
```

### 12.5 `POST /v1/job-cards/{id}/estimates/{id}/accept` (v1 — submit callback)

**Response 200:**

```json
{
  "acceptance": { "accepted_total_minor": 599900 },
  "flow_decision": {
    "advisor_requirement": "REQUIRED_NOW",
    "required_next_action": "CREATE_ADVISOR_CASE",
    "allowed_actions": ["CREATE_ADVISOR_CASE", "EDIT_JOB_CARD"]
  }
}
```

### 12.6 `POST /v1/job-cards/{id}/advisor-case`

**Response 201:**

```json
{
  "advisor_case": {
    "id": "case-uuid",
    "status": "OPEN",
    "safe_status_label": "Callback requested",
    "advisor_display_name": "Priya",
    "expected_response_window_minutes": 15,
    "submitted_total_minor": 599900,
    "customer_safe_summary": "Sales advisor will call to confirm repairs on the app."
  },
  "flow_decision": {
    "required_next_action": "WAIT_FOR_ADVISOR",
    "allowed_actions": ["VIEW_ADVISOR_STATUS", "CONTACT_SUPPORT"]
  }
}
```

### 12.7 `GET /v1/job-cards/{id}/advisor-case`

**Response 200 (waiting):**

```json
{
  "advisor_case": {
    "id": "case-uuid",
    "status": "CONTACTING",
    "safe_status_label": "On call",
    "advisor_display_name": "Priya",
    "submitted_total_minor": 599900,
    "pending_estimate_id": null
  }
}
```

**Response 200 (revised ready):**

```json
{
  "advisor_case": {
    "status": "CUSTOMER_CONFIRMATION_DUE",
    "safe_status_label": "Estimate ready on your app",
    "pending_estimate_id": "est-v2-uuid"
  },
  "pending_estimate_preview": {
    "total_minor": 684900,
    "version": 2
  }
}
```

### 12.8 `GET /v1/admin/advisor-cases`

**Auth:** admin

**Query:** `status=OPEN,CONTACTING,CUSTOMER_CONFIRMATION_DUE`

**Response 200:**

```json
{
  "items": [
    {
      "advisor_case_id": "uuid",
      "job_card_id": "uuid",
      "public_ref": "JC-1042",
      "customer_name": "Rajesh",
      "customer_phone_masked": "+91 98765 ***10",
      "status": "OPEN",
      "priority": "CALL_NOW",
      "submitted_total_minor": 599900,
      "summary": "AC + brake pads",
      "waiting_minutes": 2
    }
  ],
  "total_waiting": 3
}
```

### 12.9 `POST /v1/admin/job-cards/{id}/estimate`

**Auth:** admin

**Request:** See Task 4.14

**Response 200:**

```json
{
  "estimate": {
    "id": "est-v2-uuid",
    "version": 2,
    "status": "READY",
    "total": { "amount_minor": 684900, "currency": "INR" },
    "line_items": [
      { "label": "General service + health report", "amount_minor": 299900, "kind": "SERVICE" },
      { "label": "AC gas refill", "amount_minor": 120000, "kind": "REPAIR" },
      {
        "label": "Brake pads (pair)",
        "amount_minor": 220000,
        "kind": "REPAIR",
        "revision": { "change_type": "PRICE_CHANGED", "was_amount_minor": 180000 }
      },
      {
        "label": "Brake fluid flush",
        "amount_minor": 45000,
        "kind": "REPAIR",
        "revision": { "change_type": "ADDED" }
      }
    ]
  },
  "advisor_case": { "status": "CUSTOMER_CONFIRMATION_DUE" },
  "audit_ref": "AUD-..."
}
```

### 12.10 `POST /v1/job-cards/{id}/estimates/{id}/reject`

**Request:**

```json
{
  "reason": "CUSTOMER_DECLINED_ON_CALL"
}
```

**Response 200:**

```json
{
  "flow_decision": {
    "required_next_action": "EDIT_JOB_CARD",
    "allowed_actions": ["EDIT_JOB_CARD", "REQUEST_ESTIMATE"],
    "blocking_reasons": ["REVISED_ESTIMATE_DECLINED"]
  }
}
```

### 12.11 `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate`

**Auth:** dev environment only

**Request:** optional `{ "scenario": "demo_jc_1042" }`

**Response 200:** Same shape as §12.9

**Response 404:** Production environment

### 12.12 Checkout APIs (unchanged)

`POST /finalization`, `GET /slots`, `POST /slot-holds`, `POST /book` — reuse Phase 03 contracts.

**Guard:** `POST /finalization` returns 409 `ADVISOR_SCOPE_PENDING` if case not CONFIRMED.

---

## 13. Complete Data Flow

### 13.1 Happy path sequence diagram

```text
Customer                    API                         Admin-mobile
   |                         |                              |
   |-- GET repair-offerings ->|                              |
   |<- 6 items --------------|                              |
   |-- POST job-card + items>|                              |
   |-- POST price ---------->|                              |
   |<- estimate v1 ₹5999 ---|                              |
   |-- POST accept v1 ------>|                              |
   |<- CREATE_ADVISOR_CASE --|                              |
   |-- POST advisor-case --->|                              |
   |<- WAIT_FOR_ADVISOR -----|                              |
   |  [gpr-09 poll]          |                              |
   |                         |<-- GET admin/advisor-cases --|
   |                         |<-- POST admin/estimate -----|
   |<- CUSTOMER_CONFIRM_DUE -|                              |
   |-- GET advisor-case ---->|                              |
   |<- pending_estimate v2 --|                              |
   |-- POST accept v2 ------>|                              |
   |<- FINALIZE -------------|                              |
   |-- POST finalization --->|                              |
   |-- POST book ----------->|                              |
   |<- JC-1042 CONFIRMED ----|                              |
```

### 13.2 Deny path sequence

```text
Customer gpr-10 -- POST reject v2 --> JobCard EDITABLE
       --> gpr-02-deny-cart --> DELETE brake-pads item
       --> gpr-07 job card --> POST price --> gpr-08 --> advisor loop again
```

### 13.3 Dev simulate path (no admin UI)

```text
Customer gpr-09 poll --> POST /dev/simulate-advisor-estimate --> gpr-10
```

### 13.4 Data written per step

| Step | Tables touched |
|------|----------------|
| Add repair items | `job_card_items` |
| Price | `estimates`, `estimate_line_items` |
| Accept v1 | `estimate_acceptances`, `job_card_events` |
| Create case | `advisor_cases` |
| Admin publish | `estimates` v2, `estimate_line_items`, `advisor_cases`, `job_card_events` |
| Accept v2 | `estimate_acceptances`, `advisor_cases` CONFIRMED |
| Book | `bookings`, `booking_snapshots` |

### 13.5 Customer-visible vs internal data

| Field | Customer API | Admin API |
|-------|--------------|-------------|
| Advisor internal notes | Hidden | Visible |
| Call attempt outcomes | Hidden | Visible |
| `safe_status_label` | Visible | Visible |
| Raw estimate lines pre-publish | v1 only | All versions |
| Customer phone | Own profile | Full in admin job card |

---

## 14. UI/UX Conformance (embed ALL gpr-01 through gpr-12 and gpr-02-deny-cart walkthrough screens inline)

**Normative reference:** [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — Service + repair folder + admin advisorRevise folder.

**Global tokens (Phase 02 light-blue accent — unchanged):**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#176B9E` | Primary buttons, selected borders |
| `--brand-soft` | `#EAF6FC` | Policy note (general) |
| `--warn` / `--accent-warn` | `#E07A3D` | gpr-01 warn policy, gpr-09 chips, adm warn borders |
| `--warn-soft` | `#FFF4E8` | Warn policy note background |
| `--ok` | `#2E7D4F` | gpr-10 "Sent during call" chip, Included chips |
| Selected cell bg | `#EAF6FC` | Add-on tiles, slot selection |
| Banner deny | `#FEE2E2` bg, `#B91C1C` text | gpr-02-deny-cart banner |

**Service + repair flow rail:** **12 dots** (not 10). Steps:

| Screen | Flow dot |
|--------|----------|
| gpr-01 | 1 (home — rail optional) |
| gpr-02 | 2 |
| gpr-03–06 | 3–6 |
| gpr-07 | 7 |
| gpr-08 | 8 |
| gpr-09 | 9 |
| gpr-10 | 10 |
| gpr-11 | 11 |
| gpr-12 | 12 |

**Global chrome (gpr-01):** Location **Service at Koramangala**; vehicle pill; mode tab **Service + repair** active (brand underline); bottom nav Home/Orders/Profile.

**NOT Inspection + Repair:** No inspection chips, no "visit 1 / visit 2" copy, no `INSPECTION_REPAIR` policy notes anywhere in Phase 04 screens.

---

### 14.1 Screen `gpr-01-home`

**Walkthrough ID:** `gpr-01-home`  
**Route:** `app/(tabs)/home.tsx` — Service + repair tab body  
**Mode tab active:** `repair`  
**Flow step:** 1 of 12

#### Navigation

| Action | Target |
|--------|--------|
| **Select repairs / replacements** (primary CTA) | `/job-card/repairs-cart` or `/job-card/{id}/repairs-cart` |
| Other mode tabs | Swap home body (General, One-man, SOS) |
| Vehicle pill | `/vehicle/make?flow=service-repair` if no draft |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Hero kicker | General + repair/replacement |
| Hero title | Same service. Pick what to fix. |
| Policy note **warn** | Add repairs → callback → accept on app before slot |
| Section title | General servicing + health report |
| Package title | General servicing + health report |
| Package sub | Base package · same as General service tab |
| Package price | From ₹2,999 |
| Primary CTA | Select repairs / replacements |
| Section title (included) | Included in service |
| Included items | Engine oil & filter · Air filter check · Fluid top-up · 30-point health report |
| Included chip | Included |
| Section title (trust) | Why CARATOM |
| Trust cards | Van at your door · Trained techs · Genuine parts (3 cards in walkthrough) |

#### Layout (top to bottom)

1. Hero carousel 16:9 — video placeholder `VIDEO`; 2 pagination dots (first active)
2. **Warn policy note** — bg `#FFF3E5`, text warning color — NOT a brand-soft banner
3. Package card — selected green border 1.5px (same slug as gs-01)
4. Included list — 4 rows with green Included chips
5. Primary CTA full width
6. Trust strip — 3 cards (walkthrough shortens to 3 vs gs-01's 4)

#### Colors

- Warn policy: bg `#FFF4E8`, border `#E07A3D` tint, text `#8B4513` or brand warn
- Price: `#142532` bold
- CTA: bg `#176B9E`, text white

#### Sample data (API)

Same offering slug `general-service-health-report`, `flow_policy: GENERAL_SERVICE`.

#### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton hero + package |
| Error | Banner + retry on catalog fetch |

---

### 14.2 Screen `gpr-02-repairs` — Repairs cart

**Walkthrough ID:** `gpr-02-repairs`  
**Route:** `app/job-card/repairs-cart.tsx` or `app/job-card/[id]/repairs-cart.tsx?mode=normal`  
**Nav title:** Repairs cart  
**Flow step:** 2 of 12

#### Navigation

| Action | Target |
|--------|--------|
| Add-on tile tap | Toggle selection in `repairCartStore` |
| **Continue with N repairs** | `/vehicle/make?flow=service-repair` |
| Back | gpr-01 home (repair tab) |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Intro | Add repairs to your cart. You'll review the full estimate before requesting a callback. |
| Cart summary label | In cart |
| Cart summary value (demo) | AC gas refill · Brake pads (pair) |
| Primary CTA (demo) | Continue with 2 repairs |
| Primary CTA (dynamic) | Continue with {N} repairs |
| Primary CTA (0 selected) | Disabled — "Select at least one repair" |

#### Layout

1. Muted intro paragraph — margin bottom 12px
2. **2-column add-on tile grid** (`addon-grid`):

| Name | Price | Demo selected |
|------|-------|---------------|
| AC gas refill | ₹1,200 | ✓ |
| Brake pads (pair) | ₹1,800 | ✓ |
| AC condenser OEM | ₹4,200 | |
| Bumper repaint | ₹2,500 | |
| Cabin filter | ₹650 | |
| Headlight assembly | ₹1,400 | |

Each tile: part icon placeholder `PART`, name bold, price brand color, checkmark ✓ when selected.

3. Cart summary card — muted "In cart" label + bold item names
4. Primary CTA — dynamic count

#### Colors

- Selected tile: border 1.5px `#5DB7E8`, bg `#EAF6FC`, checkmark `#5DB7E8`
- Unselected: white card, border `#E6E2DC`
- Price on tile: `#142532` 14px bold

#### API

`GET /v1/repair-offerings` — map `display_price.amount_minor` to ₹ display (server paise / 100).

#### States

| State | Behavior |
|-------|----------|
| Loading | 6 skeleton tiles |
| Empty API | "No repairs available in your area" + support link |
| 0 selected | CTA disabled |

---

### 14.3 Screen `gpr-02-deny-cart` — After customer denies revised estimate

**Walkthrough ID:** `gpr-02-deny-cart`  
**Route:** `app/job-card/[id]/repairs-cart?mode=deny`  
**Nav title:** Repairs cart  
**Flow step:** 2 of 12 (re-entry branch)

#### Navigation

| Action | Target |
|--------|--------|
| Tile **Remove** | `DELETE /items/{id}` — deselect slug |
| Unselected tile tap | Add item back |
| **Back to ⑦ Job card** (secondary) | `/job-card/{id}` |
| **Continue with updated cart** (primary) | Re-price → gpr-08 or gpr-07 per coordinator |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Banner | Estimate declined on ⑩ — adjust your cart and go back through the steps. |
| Intro | Remove items you don't want, then continue from vehicle or job card again. |
| Cart summary label | In cart |
| Cart summary value (demo) | AC gas refill · Brake pads (pair) |
| Cart hint | Tap Remove to drop a repair |
| Unselected tile hint | Tap to add |
| Secondary CTA | Back to ⑦ Job card |
| Primary CTA | Continue with updated cart |

#### Layout

1. **Red/warn banner** full width — top of screen (not policy note style)
2. Muted intro
3. Same 2-column grid — selected tiles show **Remove** text link instead of ✓
4. Cart summary card with hint line
5. Secondary button (outline) **Back to ⑦ Job card**
6. Primary button **Continue with updated cart**

#### Colors

- Banner: bg `#FEE2E2` or walkthrough `banner` class; text `#B91C1C`
- Remove link: warn or destructive muted — not full red button

#### Server state

JobCard `EDITABLE`; AdvisorCase `DECLINED`; customer may edit items without creating new job card.

---

### 14.4 Screen `gpr-03-make`

**Walkthrough ID:** `gpr-03-make`  
**Route:** `app/vehicle/make.tsx?flow=service-repair`  
**Nav title:** Select make  
**Flow step:** 3 of 12

#### Navigation

| Action | Target |
|--------|--------|
| Back | gpr-02 repairs cart |
| Make tile | Select make |
| **Continue** | `/vehicle/model` |

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| Model \| Year \| Fuel — **Make** highlighted |
| CTA | Continue |

#### Layout

- Flow rail: dot **3** active (12-dot rail)
- Segment control — Make on
- **3-column logo grid** — 9 brands; Honda selected in demo (index 2)
- Primary CTA **Continue** (walkthrough uses "Continue" not "Continue to model" — match walkthrough for gpr flow)

**Reuse:** Same brand grid as gs-02; only segment labels and flow rail count differ.

---

### 14.5 Screen `gpr-04-model`

**Walkthrough ID:** `gpr-04-model`  
**Route:** `app/vehicle/model.tsx`  
**Nav title:** Select model  
**Flow step:** 4 of 12

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| **Model** \| Year \| Fuel |
| CTA | Continue |

#### Layout

- 3-column photo grid — City selected in demo
- Flow rail dot 4 active

---

### 14.6 Screen `gpr-05-year`

**Walkthrough ID:** `gpr-05-year`  
**Route:** `app/vehicle/year.tsx`  
**Nav title:** Select year  
**Flow step:** 5 of 12

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| Model \| **Year** \| Fuel |
| CTA | Continue |

#### Layout

- 3-column year grid: 2017, 2018, **2019** (selected), 2020, 2021 in walkthrough (subset OK; full 2016–2024 also acceptable)
- Flow rail dot 5 active

---

### 14.7 Screen `gpr-06-fuel`

**Walkthrough ID:** `gpr-06-fuel`  
**Route:** `app/vehicle/fuel.tsx`  
**Nav title:** Fuel & transmission  
**Flow step:** 6 of 12

#### Navigation

| Action | Target |
|--------|--------|
| **Use this car** | Create job card + repair items → `/job-card/{id}` |

#### Copy

| Element | Text |
|---------|------|
| Preview caption | Honda City · 2019 · Petrol |
| CTA | Use this car |

#### Layout

1. Fuel preview photo block — `CAR PHOTO` placeholder
2. Caption overlay: **Honda City · 2019 · Petrol**
3. Primary CTA

**Note:** Walkthrough gpr-06 omits transmission chips; gs-05 includes Manual/Petrol — **implement transmission selection** for API compatibility; caption may read **Honda City · 2019 · Petrol · Manual** after selection.

#### Post-action

- Create job card with `vehicle_context`
- POST each repair item from cart
- Navigate gpr-07

---

### 14.8 Screen `gpr-07-jobcard`

**Walkthrough ID:** `gpr-07-jobcard`  
**Route:** `app/job-card/[id]/index.tsx`  
**Nav title:** Job card  
**Flow step:** 7 of 12

#### Navigation

| Action | Target |
|--------|--------|
| Back | gpr-06 fuel (warn if edits) |
| **Review estimate** | `POST /price` → gpr-08 |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Vehicle summary | Honda City 2019 · Petrol |
| Concerns label | Concerns |
| Concerns demo | AC weak · brakes feel soft. |
| Line 1 | General servicing + health report — ₹2,999 |
| Line 2 | AC gas refill — ₹1,200 (part icon) |
| Line 3 | Brake pads (pair) — ₹1,800 (part icon) |
| CTA | Review estimate |

#### Layout

1. Vehicle card — car thumb + **Honda City 2019 · Petrol**
2. Concerns card — editable multiline; demo text pre-filled
3. Line items list — service row + 2 repair rows with `PART` icon placeholder
4. Sticky primary **Review estimate**

#### Differences from gs-06

- **No** footer "No repair add-ons on this flow"
- Repair lines visible with part icons
- Concerns copy differs from gs-06 demo text

---

### 14.9 Screen `gpr-08-estimate`

**Walkthrough ID:** `gpr-08-estimate`  
**Route:** `app/job-card/[id]/estimate.tsx` (repair branch)  
**Nav title:** Your estimate  
**Flow step:** 8 of 12

#### Navigation

| Action | Target |
|--------|--------|
| **Submit estimate & request callback** | accept v1 + create advisor case → gpr-09 |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Intro | Review your cart total. A sales advisor will call to confirm scope on the app. |
| Line 1 | General service + health report — ₹2,999 |
| Line 2 | AC gas refill — ₹1,200 |
| Line 3 | Brake pads (pair) — ₹1,800 |
| Total label | Indicative total |
| Total value | ₹5,999 |
| Primary CTA | Submit estimate & request callback |

#### Layout

1. Muted intro paragraph
2. Line item list with **Indicative total** row — both cells bold on last row
3. Single primary CTA — **no** secondary "Change job card" on walkthrough

#### Semantics

One user gesture:

```text
POST /estimates/{v1}/accept
POST /advisor-case
→ navigate gpr-09
```

**Do not** navigate to checkout/details. **Do not** show gs-07 "Accept estimate" copy.

#### Rules

- Total must match server `599900` paise
- Show "sales advisor" not "field technician"

---

### 14.10 Screen `gpr-09-call` — On call (waiting)

**Walkthrough ID:** `gpr-09-call`  
**Route:** `app/job-card/[id]/advisor-waiting.tsx`  
**Nav title:** On call  
**Flow step:** 9 of 12  
**Bottom nav:** Orders tab highlighted in walkthrough (customer may switch apps)

#### Navigation

| Action | Target |
|--------|--------|
| Auto on poll | `CUSTOMER_CONFIRMATION_DUE` → gpr-10 |
| Support link (optional) | `/support` stub |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Center icon | CALL icon placeholder (amber waiting state) |
| Chip | Callback in progress |
| Title | Priya is calling you |
| Body | Your sales advisor may add or remove repairs on the call. The estimate lands in your app while you're still talking — it might stay the same. |
| Row label 1 | Submitted total |
| Row value 1 | ₹5,999 |
| Row label 2 | Status |
| Status chip | On call |
| Footer hint | Watch for ⑩ on your app — Accept or Deny when the estimate arrives. |

#### Layout

```text
        [ CALL icon ]
     [ Callback in progress ]

      Priya is calling you

   (muted body paragraph)

   Submitted total     ₹5,999
   Status              [ On call ]

   (centered footer hint)
```

#### Colors

- Chip warn: bg warn-soft, text `#E07A3D`
- Title: 22px bold centered
- Status chip: warn variant

#### Data / polling

- Poll `GET /advisor-case` every 3s
- `submitted_total_minor` from case or v1 acceptance
- `advisor_display_name` = Priya from API
- Do not expose internal advisor notes

#### States

| State | UI |
|-------|-----|
| CONTACTING | Chip "On call" |
| CUSTOMER_CONFIRMATION_DUE | Navigate away to gpr-10 |
| DECLINED/CANCELLED | Error state + support |

---

### 14.11 Screen `gpr-10-revised` — Accept / Deny

**Walkthrough ID:** `gpr-10-revised`  
**Route:** `app/job-card/[id]/advisor-revised.tsx`  
**Nav title:** Estimate on app  
**Flow step:** 10 of 12

#### Navigation

| Action | Target |
|--------|--------|
| **Accept** (primary) | `POST accept v2` → checkout/details (gpr-11 path) |
| **Deny** (secondary) | `POST reject v2` → gpr-02-deny-cart |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Chip | Sent during your call |
| Intro | Priya updated this during your call with the advisor. Accept or Deny on the app — field technician does not change your bill. |
| Line 1 | General service + health report — ₹2,999 |
| Line 2 | AC gas refill — ₹1,200 |
| Line 3 label | Brake pads (pair) |
| Line 3 strike | Was ₹1,800 |
| Line 3 value | ₹2,200 |
| Line 4 label | Brake fluid flush |
| Line 4 chip | Added on call |
| Line 4 value | ₹450 |
| Total label | Total on app |
| Total value | ₹6,849 |
| Primary CTA | Accept |
| Secondary CTA | Deny |
| Footer hint | Accept → ⑪ Slot · Deny → repairs cart to remove items and go back. |

#### Layout

1. Green chip **Sent during your call** — `chip ok` style
2. Muted intro — emphasize **field technician does not change your bill**
3. Line list with **revised** row styling:
   - `.revised` rows — price change shows strike "Was ₹1,800" muted
   - Added row shows chip **Added on call**
4. Total row bold
5. Primary Accept + Secondary Deny
6. Muted footer hint

#### Colors

- Ok chip: bg `#EAF6FC`, text `#2E7D4F`
- Strike: `text-decoration: line-through`, muted color
- "Added on call" chip: neutral border chip

#### API

Load estimate v2 from `pending_estimate_id` with `revision` metadata on line items.

---

### 14.12 Screen `gpr-11-slot`

**Walkthrough ID:** `gpr-11-slot`  
**Route:** `app/checkout/slot.tsx?jobCardId={id}`  
**Nav title:** Pick a slot  
**Flow step:** 11 of 12

#### Navigation

| Action | Target |
|--------|--------|
| **Confirm slot & book** | `POST book` → gpr-12 |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Subtitle | Service + repairs · Wed preferred |
| Date strip | Tue 18 \| **Wed 19** \| Thu 20 |
| Time slot (demo selected) | 11:00 – 13:00 |
| Time slot alt | 14:00 – 16:00 |
| Primary CTA | Confirm slot & book |

#### Layout

1. Muted subtitle — differs from gs-09 "General service · ~2 hr visit"
2. Date segment — Wed 19 selected
3. **2-column grid** — only 2 slots shown in walkthrough (11–13 selected, 14–16 unselected)
4. Primary CTA

**Reuse:** Same slot component as gs-09; subtitle and CTA label differ.

---

### 14.13 Screen `gpr-12-confirmed`

**Walkthrough ID:** `gpr-12-confirmed`  
**Route:** `app/booking/[id]/index.tsx`  
**Nav title:** Confirmed  
**Flow step:** 12 of 12

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Icon | Green checkmark 48px |
| Title | Booking confirmed |
| Note | Service + repairs booked after you accepted on the call. |
| Reference | JC-1042 |
| When | Wed 19 · 11:00 – 13:00 |
| Vehicle | Honda City 2019 |
| Address | Koramangala |
| CTA | View booking |

#### Layout

Same structure as gs-10; note line and reference **JC-1042** (not JC-1050).

#### Branch detection

If booking has repair items in snapshot, show gpr-12 note; else gs-10 note.

---

### 14.14 Screen `adm-01-inbox` — Admin mobile

**Walkthrough ID:** `adm-01-inbox`  
**Route:** `apps/admin-mobile/app/(advisor)/inbox.tsx`  
**Nav title:** Inbox  
**Header right:** Priya

#### Navigation

| Action | Target |
|--------|--------|
| **Open & call customer** on JC-1042 card | `/case/{jobCardId}` adm-02 |
| Other cards | Case detail |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Queue title | Callback queue |
| Queue chip | 3 waiting |
| Card 1 ref | JC-1042 |
| Card 1 chip | Call now |
| Card 1 line 1 | Rajesh · submitted estimate · callback requested |
| Card 1 line 2 | ₹5,999 indicative · AC + brake pads |
| Card 1 CTA | Open & call customer |
| Card 2 ref | JC-1043 |
| Card 2 time | 8 min |
| Card 2 line | Meera · one-man |

#### Layout

1. Row: bold **Callback queue** + warn chip **3 waiting**
2. Priority card — **warn left border 3px** on JC-1042
3. Secondary cards — normal border
4. Each card: ref + chip/time, customer summary, muted price summary, CTA button

#### Colors

- Warn border: `var(--accent-warn)` or `#E07A3D`
- Call now chip: warn variant

#### API

`GET /v1/admin/advisor-cases` — map to card list.

---

### 14.15 Screen `adm-02-job` — Job on call

**Walkthrough ID:** `adm-02-job`  
**Route:** `apps/admin-mobile/app/(advisor)/case/[jobCardId]/index.tsx`  
**Nav title:** JC-1042 · on call

#### Navigation

| Action | Target |
|--------|--------|
| **Edit estimate on call** | `/case/{jobCardId}/estimate` adm-03 |
| Back | adm-01 inbox |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Chip | Sales advisor on call with Rajesh |
| Note | Only advisor edits estimate lines — field technician sees read-only job card later. |
| Concerns label | Concerns |
| Concerns value | AC weak · brakes soft |
| Line 1 | Health report — ₹2,999 |
| Line 2 | AC gas refill — ₹1,200 |
| Line 3 | Brake pads — ₹1,800 |
| Footer note | Add or remove lines during the call — estimate may stay the same. |
| Primary CTA | Edit estimate on call |

#### Layout

1. Warn chip top
2. Muted policy note — technician read-only
3. Concerns cell
4. Line list (3 rows)
5. Muted footer
6. Primary CTA

#### Server action on mount

Transition AdvisorCase to `CONTACTING` if `OPEN`.

---

### 14.16 Screen `adm-03-estimate` — Edit on call

**Walkthrough ID:** `adm-03-estimate`  
**Route:** `apps/admin-mobile/app/(advisor)/case/[jobCardId]/estimate.tsx`  
**Nav title:** Edit on call

#### Navigation

| Action | Target |
|--------|--------|
| **Ready to send to app** | `/case/{jobCardId}/send` with draft lines |
| **+ Add line** | Bottom sheet repair picker |
| **Remove line** | Remove selected row locally |
| Back | adm-02 |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Chip | Sales advisor · live call |
| Note | Advisor adds or removes lines with customer. Technician app never gets this screen. |
| Line 1 | General service + health report — ₹2,999 |
| Line 2 | AC gas refill — ₹1,200 |
| Line 3 | Brake pads (pair) — ₹2,200 |
| Line 4 | Brake fluid flush — ₹450 |
| Total label | Total to send |
| Total value | ₹6,849 |
| Secondary CTA 1 | + Add line |
| Secondary CTA 2 | Remove line |
| Primary CTA | Ready to send to app |

#### Layout

1. Warn chip + muted note
2. Editable line list — demo shows revised brake pads price and new fluid line
3. Total row bold
4. Two secondary outline buttons in row or stacked
5. Primary **Ready to send to app**

---

### 14.17 Screen `adm-04-send` — Send to app

**Walkthrough ID:** `adm-04-send`  
**Route:** `apps/admin-mobile/app/(advisor)/case/[jobCardId]/send.tsx`  
**Nav title:** Send to app

#### Navigation

| Action | Target |
|--------|--------|
| **Send to customer app now** | `POST /admin/job-cards/{id}/estimate` → success toast → adm-02 or inbox |
| **Still on call with Rajesh** | Back to adm-02 without publish |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Card muted | Estimate on customer app · during call |
| Large total | ₹6,849 |
| Card note | May match submitted cart — customer still Accepts or Denies |
| Banner | Customer sees ⑩ Accept / Deny · Accept → ⑪ Slot · Deny → repairs cart |
| Primary CTA | Send to customer app now |
| Secondary CTA | Still on call with Rajesh |

#### Layout

1. Summary card — large ₹6,849 (32px+), muted labels
2. Info banner — flow reminder for advisor
3. Primary send button
4. Secondary outline — stay on call

#### Post-send

Customer gpr-09 poll detects `CUSTOMER_CONFIRMATION_DUE` within 3 seconds.

---

## 15. Security

### 15.1 Authentication & authorization

| Control | Implementation |
|---------|----------------|
| Customer job card ownership | All `/v1/job-cards/{id}/*` — `profile_id` match |
| Advisor case customer view | Safe fields only; filter `is_internal` notes |
| Admin routes | `role=admin` required; 403 for customer/technician |
| Dev simulate | `ENVIRONMENT=development` or explicit flag; never in production router |
| Admin publish | Audit log every estimate publish with `actor_id` |

### 15.2 Commercial integrity

| Rule | Enforcement |
|------|-------------|
| Technician cannot set sell price | No technician UI in Phase 04; document in API |
| Customer must accept v2 before finalize | `POST /finalization` checks AdvisorCase `CONFIRMED` |
| Customer must accept v2 before book | `POST /book` checks latest acceptance matches READY estimate |
| Server totals only | Client displays `amount_minor` from API |

### 15.3 Idempotency

Apply `Idempotency-Key` to:

- `POST .../estimates/{id}/accept` (v1 and v2)
- `POST .../estimates/{id}/reject`
- `POST .../advisor-case`
- `POST /admin/job-cards/{id}/estimate`
- Phase 03: finalization, slot-holds, book (unchanged)

### 15.4 PII in admin inbox

- Mask phone in list: `+91 98765 ***10`
- Full phone on adm-02 after admin auth
- Do not log full phone in application logs — use `public_ref`

### 15.5 Rate limiting (recommended)

| Endpoint | Limit |
|----------|-------|
| GET advisor-case (poll) | 30/min per job card per user |
| POST admin/estimate | 10/min per admin |
| POST dev/simulate | 5/min per dev user |

---

## 16. Testing Strategy

### 16.1 Backend unit tests

| Test file | Coverage |
|-----------|----------|
| `test_flow_decision_repairs.py` | REQUIRED_NOW when REPAIR items |
| `test_advisor_case_transitions.py` | Status guards |
| `test_estimate_publish.py` | Version increment, line sync |
| `test_repair_offerings_api.py` | List + filter |

### 16.2 Backend integration tests

| Test file | Scenario |
|-----------|----------|
| `test_service_repair_advisor_e2e.py` | Full happy path to JC-1042 |
| `test_advisor_deny_loop.py` | Reject → EDITABLE → remove item |
| `test_admin_estimate_publish.py` | Admin publish → customer pending estimate |
| `test_dev_simulate_advisor.py` | Dev endpoint canned revision |
| `test_general_service_e2e.py` | **Regression** — no advisor |

### 16.3 Customer mobile tests

| Test | Scope |
|------|-------|
| `serviceRepairCoordinator.test.ts` | All `required_next_action` branches |
| `repairCartStore.test.ts` | Toggle, persist, clear |
| `AddonTile.test.tsx` | Selected vs remove mode |

### 16.4 Admin-mobile tests

| Test | Scope |
|------|-------|
| `estimateDraft.test.ts` | Add/remove lines, total calculation display |
| `inboxMapping.test.ts` | API → card props |

### 16.5 Manual E2E scripts

**Script A — Full advisor with admin-mobile:**

1. Customer gpr-01 → gpr-02 (2 repairs) → vehicle → job card
2. Submit estimate → gpr-09 waiting
3. Admin adm-01 → adm-04 send ₹6,849
4. Customer gpr-10 Accept → details → slot → JC-1042

**Script B — Deny loop:**

1. Same through gpr-09
2. Dev simulate or admin send
3. Deny → deny-cart → Remove brake pads → job card → re-submit

**Script C — Dev simulate only:**

1. Customer through gpr-09
2. `curl -X POST /v1/dev/job-cards/{id}/simulate-advisor-estimate`
3. gpr-10 appears without admin app

**Script D — Regression GS:**

1. General service tab gs-01 → gs-10
2. Confirm no advisor screens

---

## 17. Verification Procedure

### 17.1 Environment setup

```powershell
cd c:\Users
anda\OneDrive\Desktop\CarAtom-main
docker compose up -d
cd backend
uv run alembic upgrade head
uv run python -m scripts.seed_catalog_koramangala --env development
uv run python -m scripts.seed_advisor_demo --env development
uv run uvicorn app.main:app --reload --port 8000
```

```powershell
cd ..
pnpm install
pnpm --filter @caratom/customer exec expo start --port 8081
pnpm --filter @caratom/admin-mobile exec expo start --port 8083
```

### 17.2 API verification commands

```powershell
# Repair catalog
curl -s "http://localhost:8000/v1/repair-offerings" | jq '.items | length'
# Expect: 6

# Create job card with repairs (after auth token export)
curl -s -X POST "http://localhost:8000/v1/job-cards/{id}/price" -H "Authorization: Bearer $TOKEN" | jq '.flow_decision.advisor_requirement'
# Expect: REQUIRED_NOW

# Dev simulate (development only)
curl -s -X POST "http://localhost:8000/v1/dev/job-cards/{id}/simulate-advisor-estimate" -H "Authorization: Bearer $TOKEN"
# Expect: 200 with total 684900

# Production guard
$env:ENVIRONMENT="production"
# Expect simulate route 404
```

### 17.3 Automated test gate

```powershell
cd backend
uv run pytest tests/integration/test_service_repair_advisor_e2e.py tests/integration/test_advisor_deny_loop.py tests/integration/test_admin_estimate_publish.py tests/integration/test_general_service_e2e.py -v
cd ..
pnpm --filter @caratom/customer test
pnpm --filter @caratom/admin-mobile test
pnpm typecheck
```

### 17.4 Visual walkthrough checklist

| Screen | Pass criteria |
|--------|---------------|
| gpr-01 | Warn policy note; CTA "Select repairs / replacements" |
| gpr-02 | 6 tiles; 2 selected; "Continue with 2 repairs" |
| gpr-02-deny-cart | Red banner; Remove on selected |
| gpr-07 | 3 line items with prices |
| gpr-08 | Single CTA "Submit estimate & request callback" |
| gpr-09 | "Priya is calling you"; ₹5,999 submitted |
| gpr-10 | Strike Was ₹1,800; Added on call; ₹6,849 |
| gpr-12 | JC-1042; call acceptance note |
| adm-01 | JC-1042 Call now card |
| adm-04 | Send to customer app now |

### 17.5 Negative tests

| Case | Expected |
|------|----------|
| Finalize before advisor confirm | 409 ADVISOR_SCOPE_PENDING |
| Customer calls admin estimate | 403 |
| Book with pending v2 | 409 |
| Simulate in production | 404 |
| Add INSPECTION_REPAIR policy job card | Out of scope — reject in seed tests |

---

## 18. Full Codebase Audit

### 18.1 Customer app audit

| Check | Pass? |
|-------|-------|
| gpr-01 CTA navigates to repair cart not vehicle | |
| Repair cart before vehicle (gpr-02 → gpr-03) | |
| No client-side total for ₹5,999 / ₹6,849 | |
| gpr-08 does not skip advisor case | |
| gpr-09 polls and stops on terminal state | |
| Deny navigates deny-cart mode | |
| serviceRepairCoordinator used for post-API nav | |
| Phase 03 gs flow unchanged | |
| No inspection/repair strings in gpr flow | |

### 18.2 Admin-mobile audit

| Check | Pass? |
|-------|-------|
| admin role enforced | |
| adm-01 loads inbox from API | |
| adm-03 edits lines locally before publish | |
| adm-04 calls admin estimate endpoint | |
| No catalog/inventory screens (Phase 09) | |

### 18.3 Backend audit

| Check | Pass? |
|-------|-------|
| advisor_cases migration applied | |
| One case per job card unique constraint | |
| Estimate v2 supersedes v1 | |
| Customer API omits internal notes | |
| dev router not mounted in production | |
| FlowDecision regression for zero repairs | |

### 18.4 Contracts audit

| Check | Pass? |
|-------|-------|
| RepairOffering type exported | |
| AdvisorCase safe view type exported | |
| FlowDecision new actions in enum | |
| OpenAPI matches Pydantic schemas | |

---

## 19. Vibe Coding Principles Audit (table)

| Principle | Phase 04 evidence | Pass? |
|-----------|-------------------|-------|
| Security before features | Admin role on publish; dev guard | |
| Server owns money | All totals from `amount_minor` | |
| No secrets in repo | Dev flags in env only | |
| AI code unverified until tests | Integration E2E required | |
| Minimal scope | No Phase 07 inspection | |
| Audit trail | job_card_events + admin publish audit | |
| Dependency scan | CI unchanged from Phase 03 | |

Reference: [`Vibe code principles/AUDIT-PLAYBOOK.md`](../../Vibe%20code%20principles/AUDIT-PLAYBOOK.md)

---

## 20. Architecture Conformance Audit

| Architecture doc | Requirement | Phase 04 |
|------------------|-------------|----------|
| 01-product-constitution | Advisor before book with add-ons | ✓ |
| 02-product-flows | GS with add-ons sequence | ✓ |
| 03-domain-model | AdvisorCase statuses | ✓ |
| 08-data-model | repair_offerings, advisor_cases tables | ✓ |
| 09-api-contracts | Advisor + admin estimate routes | ✓ |
| 11-screen-specifications | Advisor status screen | gpr-09 |
| 14-security | JWT, idempotency | ✓ |
| 15-testing-strategy | Advisor E2E | ✓ |

| Violation | Status |
|-----------|--------|
| Inspection + Repair in Phase 04 | Must NOT implement |
| Technician price edit | Must NOT implement |
| Client infers advisor from tab | Must NOT implement |

---

## 21. Walkthrough Conformance Audit (screen-by-screen gpr-* and adm-*)

| Walkthrough ID | Implemented | Copy match | API wired |
|----------------|-------------|------------|-----------|
| gpr-01-home | | | |
| gpr-02-repairs | | | |
| gpr-02-deny-cart | | | |
| gpr-03-make | | | |
| gpr-04-model | | | |
| gpr-05-year | | | |
| gpr-06-fuel | | | |
| gpr-07-jobcard | | | |
| gpr-08-estimate | | | |
| gpr-09-call | | | |
| gpr-10-revised | | | |
| gpr-11-slot | | | |
| gpr-12-confirmed | | | |
| adm-01-inbox | | | |
| adm-02-job | | | |
| adm-03-estimate | | | |
| adm-04-send | | | |

**Walkthrough HTML reference:** [`CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — compare rendered screens side-by-side with Expo app.

---

## 22. Regression Audit

### 22.1 Phase 03 General Service

| Test | Must pass |
|------|-----------|
| `test_general_service_e2e.py` | ✓ |
| Manual gs-01 → gs-10 | ✓ |
| `advisor_requirement=NOT_REQUIRED` on GS | ✓ |

### 22.2 Phase 02 Identity & catalog

| Test | Must pass |
|------|-----------|
| Login OTP | ✓ |
| Home 4 tabs render | ✓ |
| `GET /v1/catalog/home` | ✓ |

### 22.3 Phase 01 platform

| Test | Must pass |
|------|-----------|
| `GET /health` | ✓ |
| CI lint/typecheck | ✓ |

### 22.4 Cross-flow isolation

| Check | Expected |
|-------|----------|
| One-man tab body | Still stub — Phase 05 |
| SOS tab | Still stub — Phase 05 |
| Technician app | Unchanged — Phase 06 |

---

## 23. Technical Debt Review

| Debt item | Severity | Follow-up |
|-----------|----------|-----------|
| Polling instead of push | Medium | Phase 11 notifications |
| No vehicle compatibility matrix | Low | Phase 09 catalog admin |
| Admin estimate editor — local only until publish | Low | OK for MVP |
| gpr-06 transmission omitted in walkthrough | Low | Implement for API; document |
| Single advisor Priya hardcoded display name | Low | Phase 09 people admin |
| No call attempt recording | Low | Legal review |
| Inbox shows one-man JC-1043 card (non-advisor) | Low | Filter to advisor cases only in API |
| Realtime channel optional | Low | Phase 11 |

**Acceptable for Phase 04 exit:** All Medium items have documented follow-up phases.

---

## 24. Phase Exit Gate

### 24.1 Backend

- [ ] Migration `20260830_0004_phase04_advisor` applied
- [ ] `GET /v1/repair-offerings` returns 6 seeds
- [ ] REPAIR item CRUD on job cards
- [ ] Price with repairs returns `REQUIRED_NOW`
- [ ] Advisor case create + safe GET
- [ ] Admin inbox + estimate publish
- [ ] Customer accept/reject v2
- [ ] Dev simulate endpoint guarded
- [ ] Integration tests green
- [ ] Phase 03 regression tests green

### 24.2 Customer mobile

- [ ] gpr-01 through gpr-12 implemented
- [ ] gpr-02-deny-cart branch works
- [ ] Walkthrough copy §14 verified
- [ ] serviceRepairCoordinator routes correctly
- [ ] JC-1042 demo path manual E2E pass

### 24.3 Admin mobile

- [ ] adm-01 through adm-04 implemented
- [ ] Admin auth enforced
- [ ] Publish triggers customer gpr-10 within poll window

### 24.4 Security & quality

- [ ] No internal notes in customer API
- [ ] Admin routes 403 for customer JWT
- [ ] Dev simulate 404 in production config
- [ ] `pnpm typecheck` passes
- [ ] CI green

### 24.5 Documentation

- [ ] This document committed
- [ ] README phase index links Phase 04
- [ ] `.env.example` updated for `ENABLE_DEV_SIMULATE`

**Exit statement:** Phase 04 complete when all §24.1–24.5 boxes checked and verification §17 executed with evidence.

---

## 25. Outputs Passed to Next Phase

### 25.1 Artifacts for Phase 05 (One-man + SOS + account)

| Artifact | Location | Use |
|----------|----------|-----|
| Checkout details + slot | `app/checkout/*` | om-04, om-05 |
| Booking confirmation | `app/booking/[id]/index.tsx` | om-06 |
| Bookings API | `GET /v1/bookings/{id}` | Orders list |
| Home mode tabs | `app/(tabs)/home.tsx` | om-01, sos-01 bodies |

### 25.2 Artifacts for Phase 06 (Technician)

| Artifact | Location | Use |
|----------|----------|-----|
| Confirmed bookings with repair scope | DB `booking_snapshots` | Visit job card read-only |
| Advisor-confirmed estimates | `estimate_acceptances` | Technician bill immutable |
| JC-1042 fixture | Seed | Field demo |

### 25.3 Artifacts for Phase 08 (Payments)

| Artifact | Location | Use |
|----------|----------|-----|
| Final estimate totals | `booking_snapshots` | Invoice generation |
| Accept/deny consent audit | `estimate_acceptances`, rejections | Payment dispute evidence |

### 25.4 Artifacts for Phase 09 (Admin web)

| Artifact | Location | Use |
|----------|----------|-----|
| Admin estimate publish service | `estimate_publish.py` | Desk advisor UI |
| Advisor case repository | `advisor/` | Full inbox on web |
| Repair offerings seed | DB | Catalog admin CRUD |

### 25.5 Demo credentials & fixtures

| Fixture | Value |
|---------|-------|
| Customer | Rajesh Kumar +91 98765 43210 |
| Admin advisor | Priya +91 98000 00001 |
| Submitted total | ₹5,999 (599900 paise) |
| Revised total | ₹6,849 (684900 paise) |
| Booking ref | JC-1042 |
| Repair slugs demo | ac-gas-refill, brake-pads-pair |
| Revised add | brake fluid flush ₹450 |

### 25.6 API surface frozen for downstream

Phase 05+ must not break:

- `POST /v1/admin/job-cards/{id}/estimate` publish semantics
- AdvisorCase status enum values
- `FlowDecision.advisor_requirement` tri-state
- Customer accept/reject estimate with version id
- Repair item CRUD on EDITABLE job cards

---

## 26. Cursor Execution Instructions

### 26.1 Agent preamble

When executing Phase 04 in Cursor:

1. Read this entire document before writing code.
2. Confirm Phase 03 exit gate (§24) — GS E2E must pass first.
3. Read [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) advisor push and deny→cart sections.
4. **Repeat:** Service + repair is NOT Inspection + Repair (Phase 07).
5. Execute §8 tasks in order; admin-mobile parallel OK after Task 4.14.
6. Embed walkthrough copy from §14 — do not paraphrase customer-facing strings.
7. Technician never edits selling prices — enforce in docs and API stubs.
8. Run §17 verification before claiming §24 exit gate.
9. AI-generated code is unverified until pytest + manual E2E pass.

### 26.2 Recommended workflow

```text
Step 1: Tasks 4.1–4.4   (advisor migration + models)
Step 2: Tasks 4.5–4.18  (repair catalog + advisor APIs + publish)
Step 3: Tasks 4.19–4.29 (customer gpr screens + coordinator)
Step 4: Tasks 4.30–4.34 (admin-mobile adm-01–04)
Step 5: Tasks 4.35–4.38 (integration tests)
Step 6: §17 verification (API + dual mobile checklist)
Step 7: §18–§23 audits
Step 8: §24 exit gate
```

### 26.3 Scope discipline

| Do | Do not |
|----|--------|
| Implement gpr-01→12 + deny-cart | Implement ir-* inspection screens |
| Implement adm-01→04 | Implement board/dispatch (Phase 10) |
| `flow_policy=GENERAL_SERVICE` with REPAIR items | `INSPECTION_REPAIR` policy |
| Navigate via FlowDecision | Infer advisor from tab or cart length |
| Poll advisor case on gpr-09 | Fake instant revised estimate without API |
| Dev simulate for CI/E2E | Expose simulate in production |
| Reuse Phase 03 checkout after advisor confirm | Skip advisor case on gpr-08 |

### 26.4 File creation order

1. Alembic advisor migration + repair offerings verify
2. Advisor module + estimate publish service
3. Repair offerings router + job card items CRUD
4. Update flow_decision.py
5. Dev simulate router (environment guard)
6. `packages/contracts` types
7. Customer `repairCartStore` + gpr-02
8. Vehicle flow param + job card repair lines gpr-07
9. gpr-08, gpr-09, gpr-10, deny-cart
10. serviceRepairCoordinator
11. Admin-mobile inbox → send
12. Integration tests
13. Wire gpr-01 CTA last

### 26.5 Common failure modes

| Failure | Fix |
|---------|-----|
| gpr-08 goes to checkout | Check repair items → must CREATE_ADVISOR_CASE |
| gpr-09 never transitions | Verify admin publish or dev simulate |
| Accept v2 returns FINALIZE but finalize 409 | AdvisorCase not CONFIRMED — accept must confirm case |
| Deny does not show Remove | `mode=deny` query param on repairs-cart |
| Admin 403 | Seed admin profile; check JWT role |
| Total wrong on gpr-10 | Publish must use paise; client format only |
| Phase 03 regression fails | FlowDecision guard — zero repairs = NOT_REQUIRED |
| Simulate 404 in dev | Set ENVIRONMENT=development |
| Wrong flow rail count | Service+repair uses 12 dots |

### 26.6 Testing commands (run before completion report)

```powershell
cd backend && uv run pytest tests/integration/test_service_repair_advisor_e2e.py tests/integration/test_advisor_deny_loop.py tests/integration/test_admin_estimate_publish.py tests/integration/test_general_service_e2e.py -v
cd ..
pnpm --filter @caratom/customer test
pnpm --filter @caratom/admin-mobile test
pnpm typecheck
```

### 26.7 Dual-device manual E2E

1. Phone A (customer): Expo Go customer app
2. Phone B (admin): Expo Go admin-mobile OR curl admin publish
3. Customer reaches gpr-09 on Phone A
4. Admin adm-04 send on Phone B
5. Phone A shows gpr-10 within 3 seconds

### 26.8 Commit guidance

Suggested messages (commit only when user requests):

```text
feat(phase-04): add advisor_cases migration and repair catalog API
feat(phase-04): implement advisor case and admin estimate publish
feat(phase-04): add service+repair customer flow gpr-01 to gpr-12
feat(phase-04): add admin-mobile advisor inbox adm-01 to adm-04
feat(phase-04): add dev simulate advisor estimate endpoint
test(phase-04): service repair advisor E2E integration tests
docs(phase-04): PHASE-04-service-repair-advisor specification
```

### 26.9 Completion report template

```markdown
## Phase 04 Complete

- Exit gate: X/X checkboxes (§24)
- Integration test: test_service_repair_advisor_e2e [pass/fail]
- Deny loop test: test_advisor_deny_loop [pass/fail]
- Regression Phase 03: test_general_service_e2e [pass/fail]
- Manual E2E customer: gpr-01–12 [pass/fail]
- Manual E2E admin: adm-01–04 [pass/fail]
- Walkthrough audit: gpr + adm screens [pass/fail]
- NOT implemented (by design): Inspection+Repair Phase 07
- Ready for Phase 05: [yes/no]
```

**Stop after §24 exit gate passes.** Do not implement one-man booking, SOS, technician visits, inspection+repair, payments, or dispatch — those belong to Phases 05–08 and 10.

---

## Phase 04 Complete

Phase 04 delivers the **Service + repair** tab end-to-end with **AdvisorCase** callback loop, **admin-mobile** advisor inbox through publish (`adm-01`→`adm-04`), and customer screens **`gpr-01` through `gpr-12`** plus **`gpr-02-deny-cart`**, with walkthrough copy embedded in §14. Inspection + Repair remains Phase 07.