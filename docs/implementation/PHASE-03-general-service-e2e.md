# PHASE 03 — General Service E2E (gs-01 → gs-10)

**Document ID:** `PHASE-03-general-service-e2e.md`  
**Version:** 1.0.0  
**Status:** Execution-ready specification  
**Depends on:** [PHASE-01-monorepo-platform-foundation.md](./PHASE-01-monorepo-platform-foundation.md), [PHASE-02-identity-design-catalog.md](./PHASE-02-identity-design-catalog.md) (Exit Gate §24 complete)  
**Unblocks:** [PHASE-04-service-repair-advisor.md](./PHASE-04-service-repair-advisor.md), [PHASE-05-oneman-sos-account.md](./PHASE-05-oneman-sos-account.md), [PHASE-06-technician-field-execution.md](./PHASE-06-technician-field-execution.md)  
**Estimated effort:** 10–16 engineer-days (single developer + Cursor agent)

**Authority chain:**

1. Walkthrough screens embedded inline in §14 and [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — UI/flow truth.
2. [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) — resolved contradictions: **vehicle picker before job card**, **combined details screen**, **no advisor on no-add-on path**.
3. [`docs/architecture/01-product-constitution.md`](../architecture/01-product-constitution.md) — commercial invariants.
4. Architecture docs **02, 04, 08, 09, 11** — server-owned flow policy, state machines, API shapes.

**Critical glossary (repeat in code review):**

> **"Service + repair" tab** = General Service **with optional repair add-ons** + advisor (Phase 04). It is **NOT** Inspection + Repair (Phase 07).  
> Phase 03 implements **General service tab only** — `flow_policy = GENERAL_SERVICE`, **zero add-ons**, **no advisor screens**.

---

## 0. Phase Summary

### Objective

Deliver the **first complete customer booking journey**: General Service **without add-ons** and **without advisor**, from home (`gs-01`) through vehicle picker (`gs-02`–`gs-05`), job card (`gs-06`), estimate accept (`gs-07`), combined customer details (`gs-08`), slot selection (`gs-09`), and booking confirmation (`gs-10`).

The backend must own pricing, `FlowDecision`, estimate versioning, finalization validation, slot holds, and idempotent booking creation. The mobile app must navigate via `generalServiceCoordinator` reading `allowed_actions[]` — never inferring advisor need from tab or route.

### What Phase 03 delivers

| ID | Deliverable | Description |
|----|-------------|-------------|
| P03-A | Vehicle context picker | Four-step flow: make → model → year → fuel/transmission; local draft + optional `vehicles` row on finalization |
| P03-B | Job card module | Create/patch job card with `flow_policy=GENERAL_SERVICE`, concerns, base service line item only |
| P03-C | Pricing + estimates | `POST /price`, estimate versions, accept with idempotency; `advisor_requirement=NOT_REQUIRED` |
| P03-D | Finalization | Combined name/phone/address on one screen (`gs-08`); OTP gate if guest; persists `addresses` |
| P03-E | Slots + booking | List slots, create hold, confirm booking; `bookings` + `booking_snapshots` |
| P03-F | Confirmation UI | `gs-10` with reference `JC-1050` pattern, visit window, vehicle/address summary |
| P03-G | DB tables | `vehicles`, `addresses`, `job_cards`, `job_card_concerns`, `job_card_items`, `estimates`, `estimate_line_items`, `estimate_acceptances`, `bookings`, `booking_snapshots`, `slot_holds`, `service_calendars`, `holidays` (minimal) |
| P03-H | Contracts + tests | OpenAPI-aligned DTOs; API integration tests; coordinator unit tests; manual E2E checklist |

### What Phase 03 explicitly does NOT deliver

| Item | Phase |
|------|-------|
| Repair add-on cart (`gpr-02`), advisor case (`gpr-09`–`gpr-10`) | 04 |
| One-man booking (`om-02`–`om-06`) | 05 |
| SOS (`sos-01`–`sos-04`) | 05 |
| Orders list, profile hub, saved vehicles/addresses management UI | 05 |
| Technician visits, dispatch, admin job board | 06, 09, 10 |
| Razorpay, invoice, payment, review | 08 |
| Inspection + Repair | 07 |
| Push notifications | 11 |
| Production Railway deploy / store submission | 12 |

### Canonical journey (Phase 03 only)

```text
gs-01-home (General service tab)
  → gs-02-make → gs-03-model → gs-04-year → gs-05-fuel   [vehicle BEFORE job card — walkthrough wins]
  → gs-06-jobcard (concerns + base line only)
  → gs-07-estimate (accept)
  → gs-08-details (name + phone + address — combined screen)
  → gs-09-slot (hold + confirm in one CTA)
  → gs-10-confirmed
```

**Server policy:** `flow_policy = GENERAL_SERVICE`, `advisor_requirement = NOT_REQUIRED` after estimate accept.

### Success statement

At Phase 03 exit, a guest or authenticated user on the **General service** tab can tap **Start job card**, complete vehicle picker, enter concerns, receive server estimate ₹2,999, accept, enter details (OTP if needed), pick Wed 19 11:00–13:00, confirm booking, and see **Booking confirmed** with reference `JC-####`. API tests prove no advisor route is invoked; slot book is idempotent; customer cannot access admin routes.

---

## 1. Starting State

### 1.1 Phase 02 exit gate (must be true)

| Prerequisite | Verification |
|--------------|--------------|
| Supabase phone OTP works; session restore | Login flow on device |
| JWT validated on FastAPI; `profiles` upsert | `GET /v1/me` with Bearer token |
| Light-blue accent tokens in `packages/ui` or customer app | `#5DB7E8` primary |
| Customer home: 4 mode tabs, chrome, gs-01 body from API | Visual compare to walkthrough |
| `GET /v1/catalog/home` returns `general-service-health-report` | curl + jq |
| Catalog seed: Koramangala area, inclusions, trust strip | DB query |
| CI: lint, typecheck, Phase 02 tests green | GitHub Actions |
| `packages/contracts` has catalog + profile types | import in customer app |

### 1.2 Repository state at Phase 03 start

```text
apps/customer/          # Home with gs-01; CTA may toast "Phase 03" or navigate stub
apps/admin/             # Optional read-only /catalog from Phase 02
backend/
  app/modules/
    auth/, profiles/, catalog/    # Implemented
    job_cards/, pricing/, bookings/, slots/   # Missing or stub
packages/contracts/     # Catalog + Me; no JobCard/Estimate/Booking yet
packages/api-client/    # GET helpers; no job-card mutations
```

**Absent at start:**

- `vehicles`, `addresses`, `job_cards`, `estimates`, `bookings`, `slot_holds` tables
- Vehicle picker routes (`app/vehicle/*`)
- Job card / estimate / checkout routes
- `generalServiceCoordinator`
- Slot generation logic
- Booking confirmation screen

### 1.3 Walkthrough vs architecture resolution (apply in Phase 03)

| Topic | Winning rule | Phase 03 implementation |
|-------|--------------|-------------------------|
| Vehicle timing | Walkthrough wins | Picker at gs-02–05 **before** gs-06 job card |
| Customer + address | Walkthrough wins | Single `gs-08-details` screen; one `POST /finalization` |
| Advisor on no add-ons | Constitution + audit | Skip advisor entirely; `FlowDecision` goes to `FINALIZE` |
| Slot confirm UX | Walkthrough wins | One button: hold + book (gs-09 CTA) |
| Architecture doc sequence (vehicle after estimate) | Superseded for GS UI | Backend still validates vehicle at finalization; may reprice if incompatible |

---

## 2. Desired End State

### 2.1 Repository tree (additions)

```text
apps/customer/
  app/
    vehicle/
      _layout.tsx
      make.tsx          # gs-02
      model.tsx         # gs-03
      year.tsx          # gs-04
      fuel.tsx          # gs-05
    job-card/
      [id]/
        index.tsx       # gs-06
        estimate.tsx    # gs-07
    checkout/
      details.tsx       # gs-08
      slot.tsx          # gs-09
    booking/
      [id]/
        index.tsx       # gs-10 (+ future detail)
  src/
    coordinators/
      generalServiceCoordinator.ts
    stores/
      vehicleDraftStore.ts
      jobCardFlowStore.ts
    hooks/
      useJobCard.ts
      useEstimate.ts
      useSlots.ts
      useBooking.ts
    data/
      vehicleCatalog.ts   # static make/model/year seed for picker

backend/
  app/modules/
    vehicles/
    addresses/
    job_cards/
    pricing/
    estimates/
    slots/
    bookings/
  alembic/versions/
    20260829_0003_phase03_job_booking.py
  tests/
    integration/
      test_general_service_e2e.py
      test_slot_idempotency.py
      test_flow_decision_no_advisor.py

packages/contracts/src/
  job-card.ts
  estimate.ts
  booking.ts
  flow-decision.ts
  vehicle.ts
  address.ts
  slots.ts
```

### 2.2 Runtime capabilities

| Capability | Endpoint / surface |
|------------|-------------------|
| Create job card with vehicle context | `POST /v1/job-cards` |
| Price job card | `POST /v1/job-cards/{id}/price` → Estimate + FlowDecision |
| Accept estimate | `POST /v1/job-cards/{id}/estimates/{id}/accept` |
| Finalize customer + address | `POST /v1/job-cards/{id}/finalization` |
| List slots | `GET /v1/job-cards/{id}/slots` |
| Hold slot | `POST /v1/job-cards/{id}/slot-holds` |
| Confirm booking | `POST /v1/job-cards/{id}/book` |
| Read booking | `GET /v1/bookings/{id}` |

### 2.3 Demo data path (manual E2E)

| Step | User action | Expected server state |
|------|-------------|----------------------|
| 1 | Open General service tab | Catalog home loaded |
| 2 | Start job card | Navigate to vehicle make |
| 3 | Honda → City → 2019 → Petrol Manual | `vehicleDraft` in Zustand |
| 4 | Review estimate | JobCard `ESTIMATE_READY`, Estimate READY ₹2,999 |
| 5 | Accept estimate | `ESTIMATE_ACCEPTED`, FlowDecision `FINALIZE` |
| 6 | Enter Rajesh details + OTP | Profile updated, address saved |
| 7 | Confirm Wed 19 11–13 | Booking CONFIRMED, ref `JC-1050` style |
| 8 | View booking | `customer_progress = BOOKING_CONFIRMED` |

---

## 3. Why This Phase Exists Here

Phase 03 is the **first vertical slice** that proves the platform can sell something:

1. **Validates core aggregates** — JobCard, Estimate, Booking, SlotHold — before advisor, one-man, and SOS add complexity.
2. **Establishes FlowDecision pattern** — Phase 04 adds `REQUIRED_NOW`; Phase 05 uses direct book; all reuse the same coordinator contract.
3. **Proves money rules** — Server-side paise, immutable estimate versions, acceptance idempotency — required before payments (Phase 08).
4. **Unlocks parallel work** — Phase 04 (advisor), 05 (one-man/SOS), and 06 (technician) all depend on booking records existing.
5. **Walkthrough credibility** — Stakeholders can demo gs-01→gs-10 on Expo Go without waiting for full product.

**Why not earlier?** Phase 01–02 provide monorepo, auth, and catalog without which job cards have no offering to attach. **Why not later?** Without Phase 03, advisor and one-man flows have nothing to attach estimates and slots to.

---

## 4. Source Material

| Document | Use in Phase 03 |
|----------|-----------------|
| [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) | gs-01–gs-10 HTML/CSS reference; copy verbatim where specified |
| [`docs/EMERGENT-IMPLEMENTATION-PROMPT.md`](../EMERGENT-IMPLEMENTATION-PROMPT.md) | §5.2 General service flow, §6.5–6.9 API list, Phase C scope |
| [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) | §4 mapping, C1 vehicle timing, C3 combined details |
| [`docs/architecture/02-product-flows.md`](../architecture/02-product-flows.md) | FlowDecision, GS without add-ons bypass |
| [`docs/architecture/04-state-machines.md`](../architecture/04-state-machines.md) | JobCard, Estimate, Booking transitions |
| [`docs/architecture/08-data-model.md`](../architecture/08-data-model.md) | Table groups, snapshots, constraints |
| [`docs/architecture/09-api-contracts.md`](../architecture/09-api-contracts.md) | Endpoint semantics, error shape |
| [`docs/architecture/11-screen-specifications.md`](../architecture/11-screen-specifications.md) | Job card, estimate, slot recovery behavior |
| [`docs/architecture/14-security.md`](../architecture/14-security.md) | JWT, idempotency, ownership checks |
| [`docs/architecture/15-testing-strategy.md`](../architecture/15-testing-strategy.md) | GS no-advisor E2E |
| [`PHASE-02-identity-design-catalog.md`](./PHASE-02-identity-design-catalog.md) | gs-01 home spec, tokens, catalog slug |
| [`Vibe code principles/GREENFIELD-PLAYBOOK.md`](../../Vibe%20code%20principles/GREENFIELD-PLAYBOOK.md) | Security-before-code checklist |

---

## 5. Architectural Context

### 5.1 System diagram (Phase 03 slice)

```text
┌─────────────────────────────────────────────────────────────────┐
│  apps/customer (Expo)                                            │
│  ┌──────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │ Home gs-01   │→ │ Vehicle gs-02..05   │→ │ Job card gs-06  │ │
│  └──────────────┘  │ (Zustand draft)       │  └────────┬────────┘ │
│                    └─────────────────────┘           │          │
│  ┌──────────────┐  ┌─────────────────────┐  ┌───────▼────────┐ │
│  │ Confirmed    │← │ Slot gs-09          │← │ Estimate gs-07 │ │
│  │ gs-10        │  │ Details gs-08       │  └────────────────┘ │
│  └──────────────┘  └─────────────────────┘                       │
│         │                    │                                     │
│         │    generalServiceCoordinator + TanStack Query            │
└─────────┼────────────────────┼─────────────────────────────────────┘
          │                    │  HTTPS + Bearer JWT
          ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI (Railway / local)                                       │
│  job_cards │ pricing │ estimates │ slots │ bookings │ vehicles  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Supabase Postgres│
                    │ vehicles         │
                    │ addresses        │
                    │ job_cards        │
                    │ estimates        │
                    │ bookings         │
                    │ slot_holds       │
                    └─────────────────┘
```

### 5.2 FlowDecision on no-add-on General Service

```text
POST /price
  → policy: GENERAL_SERVICE
  → advisor_requirement: NOT_REQUIRED
  → estimate_requirement: PRE_BOOKING
  → required_next_action: ACCEPT_ESTIMATE
  → allowed_actions: [ACCEPT_ESTIMATE, EDIT_JOB_CARD]

POST /estimates/{id}/accept
  → advisor_requirement: NOT_REQUIRED
  → required_next_action: FINALIZE
  → allowed_actions: [FINALIZE, EDIT_JOB_CARD]

POST /finalization (success)
  → required_next_action: SELECT_SLOT
  → allowed_actions: [LIST_SLOTS, FINALIZE]

POST /slot-holds (success)
  → required_next_action: CONFIRM_BOOKING
  → allowed_actions: [CONFIRM_BOOKING, LIST_SLOTS]

POST /book (success)
  → customer_progress: BOOKING_CONFIRMED
```

### 5.3 Job Card state path (Phase 03 happy path)

```text
LOCAL_DRAFT (client) → PRICING → ESTIMATE_READY → ESTIMATE_ACCEPTED
  → READY_FOR_FINALIZATION → FINALIZATION_IN_PROGRESS → READY_TO_BOOK
  → BOOKING_CREATED
```

No `ADVISOR_REQUIRED` or `ADVISOR_IN_PROGRESS` states in Phase 03 happy path.

### 5.4 Aggregate boundaries

| Aggregate | Owner module | Phase 03 scope |
|-----------|--------------|----------------|
| Vehicle | `vehicles` | Create on finalization or link draft to profile |
| Address | `addresses` | Create on finalization; serviceability check |
| JobCard | `job_cards` | Full create/update for GS base item + concerns |
| Estimate | `estimates` | Version 1 from price; accept once |
| SlotHold | `slots` | 15-minute hold; one active per job card |
| Booking | `bookings` | Confirm from hold; snapshot all parties |

---

## 6. Exact Implementation Scope + Out of Scope

### 6.1 In scope (mandatory)

| ID | Requirement |
|----|-------------|
| S1 | Vehicle picker UI gs-02–gs-05 with flow rail dots 2–5 of 10 |
| S2 | Static vehicle catalog: 9 makes, Honda models demo, years 2016–2024 |
| S3 | `POST /v1/job-cards` with `service_offering_slug=general-service-health-report`, vehicle context, no repair items |
| S4 | Concerns text area on gs-06; optional but pre-filled in demo |
| S5 | `POST /price` returns estimate total 299900 paise for demo vehicle |
| S6 | gs-07 accept + secondary "Change job card" |
| S7 | gs-08 combined form; OTP modal if `401` / `AUTH_REQUIRED` |
| S8 | gs-09 date strip + 2-col time grid; single confirm CTA runs hold+book |
| S9 | gs-10 confirmation with `customer_progress` |
| S10 | `vehicles`, `addresses`, `job_cards`, `estimates`, `bookings`, `slot_holds` migrations |
| S11 | Role enforcement: customer routes only for `role=customer` |
| S12 | Idempotency-Key on accept, finalization, slot-holds, book |
| S13 | Integration test: full API path without advisor |
| S14 | Coordinator unit tests for `allowed_actions` routing |

### 6.2 Out of scope (do not implement)

| ID | Item | Reason |
|----|------|--------|
| O1 | Repair add-on tiles, `job_card_items` type=REPAIR | Phase 04 |
| O2 | `POST /advisor-case`, gpr screens | Phase 04 |
| O3 | Separate vehicle screen after details | Walkthrough merged into picker + finalization |
| O4 | Separate address screen | Combined gs-08 |
| O5 | Booking review screen between slot and confirm | Walkthrough: gs-09 CTA is confirm |
| O6 | Orders tab list content | Phase 05 — placeholder OK |
| O7 | MapLibre live geocoding | Map placeholder image on gs-08 |
| O8 | Visit creation, technician assignment | Phase 06 |
| O9 | Invoice, payment | Phase 08 |
| O10 | `GET /v1/repair-offerings` customer UI | Phase 04 |
| O11 | Real SMS OTP template customization | Phase 12 |
| O12 | Redis slot cache | Optional; DB-backed slots sufficient |

### 6.3 Assumptions

- Launch geography: Koramangala (`koramangala-bengaluru` service area from Phase 02).
- Operating hours: 09:00–18:00 IST; 2-hour slots: 9–11, 11–13, 14–16, 16–18.
- Slot hold duration: 15 minutes (`SLOT_HOLD_MINUTES=15`).
- General service duration: 120 minutes (from catalog).
- Guest may complete vehicle + job card + estimate; OTP required at gs-08 before finalization persists.
- Human-readable job card refs: `JC-{sequence}` starting ~1050 in dev fixtures.

---

## 7. Repository Changes

### 7.1 New files (create)

| Path | Purpose |
|------|---------|
| `backend/alembic/versions/20260829_0003_phase03_job_booking.py` | All Phase 03 tables |
| `backend/app/modules/vehicles/models.py` | SQLAlchemy `Vehicle` |
| `backend/app/modules/vehicles/schemas.py` | Pydantic DTOs |
| `backend/app/modules/vehicles/router.py` | `GET/POST/PATCH /v1/me/vehicles` |
| `backend/app/modules/addresses/models.py` | SQLAlchemy `Address` |
| `backend/app/modules/addresses/router.py` | `GET/POST/PATCH /v1/me/addresses` |
| `backend/app/modules/job_cards/models.py` | JobCard, concerns, items, events |
| `backend/app/modules/job_cards/service.py` | Create, patch, state transitions |
| `backend/app/modules/job_cards/router.py` | Job card REST |
| `backend/app/modules/pricing/service.py` | Price calculation |
| `backend/app/modules/estimates/models.py` | Estimate, line items, acceptances |
| `backend/app/modules/slots/service.py` | Slot generation, holds |
| `backend/app/modules/slots/router.py` | Slots + holds endpoints |
| `backend/app/modules/bookings/models.py` | Booking, snapshots |
| `backend/app/modules/bookings/service.py` | Confirm transaction |
| `backend/app/modules/bookings/router.py` | Book + GET booking |
| `backend/app/core/flow_decision.py` | FlowDecision builder |
| `backend/app/core/idempotency.py` | Idempotency middleware/store |
| `backend/app/core/refs.py` | `JC-####` sequence generator |
| `backend/tests/integration/test_general_service_e2e.py` | API E2E |
| `backend/tests/integration/test_slot_idempotency.py` | Hold/book idempotency |
| `backend/tests/unit/test_flow_decision_gs.py` | No-advisor path |
| `packages/contracts/src/flow-decision.ts` | Shared FlowDecision type |
| `packages/contracts/src/job-card.ts` | JobCard DTOs |
| `packages/contracts/src/estimate.ts` | Estimate DTOs |
| `packages/contracts/src/booking.ts` | Booking DTOs |
| `packages/contracts/src/vehicle.ts` | Vehicle DTOs |
| `packages/contracts/src/address.ts` | Address DTOs |
| `packages/contracts/src/slots.ts` | Slot + hold DTOs |
| `apps/customer/src/coordinators/generalServiceCoordinator.ts` | Route from FlowDecision |
| `apps/customer/src/stores/vehicleDraftStore.ts` | Persist make/model/year/fuel |
| `apps/customer/src/stores/jobCardFlowStore.ts` | Active job card id, step |
| `apps/customer/src/data/vehicleCatalog.ts` | Static picker data |
| `apps/customer/app/vehicle/_layout.tsx` | Stack with flow rail header |
| `apps/customer/app/vehicle/make.tsx` | gs-02 |
| `apps/customer/app/vehicle/model.tsx` | gs-03 |
| `apps/customer/app/vehicle/year.tsx` | gs-04 |
| `apps/customer/app/vehicle/fuel.tsx` | gs-05 |
| `apps/customer/app/job-card/[id]/index.tsx` | gs-06 |
| `apps/customer/app/job-card/[id]/estimate.tsx` | gs-07 |
| `apps/customer/app/checkout/details.tsx` | gs-08 |
| `apps/customer/app/checkout/slot.tsx` | gs-09 |
| `apps/customer/app/booking/[id]/index.tsx` | gs-10 |
| `apps/customer/src/components/FlowRail.tsx` | 10-dot progress indicator |
| `apps/customer/src/components/PolicyNote.tsx` | Brand-soft policy banner |
| `apps/customer/src/components/VehicleSummaryCard.tsx` | gs-06 vehicle row |

### 7.2 Modified files

| Path | Change |
|------|--------|
| `apps/customer/app/(tabs)/home.tsx` | Wire **Start job card** → `/vehicle/make?offering=general-service-health-report` |
| `apps/customer/app/_layout.tsx` | Register vehicle, job-card, checkout, booking stacks |
| `backend/app/main.py` | Include new routers |
| `backend/app/core/deps.py` | `get_current_user`, ownership checks |
| `packages/contracts/src/index.ts` | Export new types |
| `packages/api-client/src/client.ts` | POST helpers with Idempotency-Key |
| `backend/.env.example` | `SLOT_HOLD_MINUTES`, `OPERATING_HOURS` |
| `apps/customer/.env.example` | No new vars |

### 7.3 Files explicitly NOT created in Phase 03

- `apps/customer/app/job-card/[id]/repairs-cart.tsx` (Phase 04)
- `apps/customer/app/job-card/[id]/advisor-*.tsx` (Phase 04)
- `backend/app/modules/advisor/*` (Phase 04 — stub import OK in flow_decision only)
- `apps/technician/**` changes beyond README note

---

## 8. Detailed Implementation Sequence (Task X.Y)

Execute in order unless noted **parallel OK**. Each task lists verification before marking complete.

### Block A — Database & domain models (Days 1–3)

#### Task 3.1 — Alembic migration: vehicles + addresses

Create `20260829_0003_phase03_job_booking.py` with:

- `vehicles` table (see §11.1)
- `addresses` table (see §11.2)
- Indexes: `vehicles(profile_id)`, `addresses(profile_id)`
- FK: `profile_id` → `profiles.id` ON DELETE RESTRICT

**Verify:** `uv run alembic upgrade head`; `\d vehicles` in psql.

#### Task 3.2 — Alembic migration: job_cards aggregate

Add tables:

- `job_cards`
- `job_card_concerns`
- `job_card_items`
- `job_card_events`

Enums: `job_card_status`, `flow_policy`, `job_card_item_kind` (`SERVICE`, `REPAIR` — repair unused in Phase 03).

**Verify:** Insert fixture row via test; status default `EDITABLE`.

#### Task 3.3 — Alembic migration: estimates

Add:

- `estimates`
- `estimate_line_items`
- `estimate_acceptances`

Partial unique index: one `READY` estimate per job_card_id.

**Verify:** Cannot insert two READY estimates for same job card.

#### Task 3.4 — Alembic migration: scheduling + bookings

Add:

- `service_calendars` (single row: koramangala default)
- `holidays` (empty seed OK)
- `slot_holds`
- `bookings`
- `booking_snapshots`

**Verify:** FK booking → job_card; snapshot JSONB not null.

#### Task 3.5 — SQLAlchemy models + repositories

Implement ORM models mirroring migration. Repository pattern per module:

- `VehicleRepository`, `AddressRepository`
- `JobCardRepository` with `get_for_customer(job_card_id, profile_id)`
- `EstimateRepository`, `BookingRepository`, `SlotHoldRepository`

**Verify:** `pytest backend/tests/unit/test_models_import.py` (create if missing).

#### Task 3.6 — Reference generator `JC-####`

Implement `refs.next_job_card_ref()` using PostgreSQL sequence `job_card_ref_seq` START 1050.

**Verify:** Two concurrent creates get unique refs.

### Block B — Backend services (Days 3–7)

#### Task 3.7 — `POST /v1/job-cards` + `PATCH`

Request body:

```json
{
  "service_offering_slug": "general-service-health-report",
  "vehicle_context": {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL"
  },
  "concerns": [{ "text": "Want full service and a health report. AC feels weak on idle." }]
}
```

Creates JobCard `EDITABLE`, one `job_card_items` row kind=SERVICE linked to offering, concerns rows.

Returns JobCard + `FlowDecision` with `EDIT_JOB_CARD`, `REQUEST_ESTIMATE` in allowed_actions.

**Verify:** pytest `test_create_job_card_gs`.

#### Task 3.8 — `POST /v1/job-cards/{id}/price`

- Load offering pricing policy `general-service-koramangala-2026`
- Compute lines: base service 299900 paise; included fluids check as zero-priced inclusion line
- Create Estimate version, JobCard → `ESTIMATE_READY`
- Return Estimate + FlowDecision (`ACCEPT_ESTIMATE`)

**Verify:** Total `amount_minor=299900`; policy `GENERAL_SERVICE`; `advisor_requirement=NOT_REQUIRED`.

#### Task 3.9 — `POST /v1/job-cards/{id}/estimates/{id}/accept`

- Validate estimate READY, not expired
- Idempotency-Key: return same acceptance on retry
- JobCard → `ESTIMATE_ACCEPTED` → `READY_FOR_FINALIZATION`
- FlowDecision: `required_next_action=FINALIZE`

**Verify:** Second accept with same key returns 200 same body; advisor endpoints not in allowed_actions.

#### Task 3.10 — `POST /v1/job-cards/{id}/finalization`

Combined payload (gs-08):

```json
{
  "customer": {
    "full_name": "Rajesh Kumar",
    "phone_e164": "+919876543210"
  },
  "address": {
    "line1": "12, 5th Cross, Koramangala 5th Block",
    "locality": "Koramangala 5th Block",
    "city": "Bengaluru",
    "postal_code": "560034",
    "latitude": 12.9352,
    "longitude": 77.6245
  },
  "vehicle": {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL"
  },
  "save_vehicle": true,
  "save_address": true
}
```

- Requires authenticated user (JWT); else `401 AUTH_REQUIRED`
- Upsert profile name/phone
- Create `addresses` row if save_address
- Create `vehicles` row if save_vehicle; link `job_cards.vehicle_id`
- Serviceability check against `service_area_rules`
- JobCard → `READY_TO_BOOK`
- FlowDecision: `SELECT_SLOT`

**Verify:** Guest without token gets 401; authenticated succeeds.

#### Task 3.11 — `GET /v1/job-cards/{id}/slots`

Query: `from=2026-08-18&to=2026-08-25&visit_type=SERVICE`

Return generated slots excluding holidays and existing holds/bookings:

```json
{
  "timezone": "Asia/Kolkata",
  "slots": [
    {
      "slot_id": "2026-08-19T11:00:00+05:30",
      "starts_at": "2026-08-19T11:00:00+05:30",
      "ends_at": "2026-08-19T13:00:00+05:30",
      "label": "11:00 – 13:00",
      "available": true
    }
  ]
}
```

**Verify:** Wed 19 shows 4 windows; booked slot marked unavailable.

#### Task 3.12 — `POST /v1/job-cards/{id}/slot-holds`

Body: `{ "slot_id": "2026-08-19T11:00:00+05:30" }`

- Create `slot_holds` expires_at = now + 15m
- Idempotent per (job_card, slot_id, idempotency key)

**Verify:** Expired hold returns `HOLD_EXPIRED` problem.

#### Task 3.13 — `POST /v1/job-cards/{id}/book`

Body: `{ "slot_hold_id": "uuid" }`

Transactional:

1. Validate hold active and owned
2. Create `bookings` status CONFIRMED
3. Create `booking_snapshots` (customer, address, vehicle, estimate, offering)
4. JobCard → `BOOKING_CREATED`
5. Release/consume hold

Returns Booking with `public_ref`, `customer_progress`.

**Verify:** Idempotent replay returns same booking id.

#### Task 3.14 — `GET /v1/bookings/{id}`

Customer-scoped read with composed summary for gs-10.

**Verify:** Non-owner gets 404.

#### Task 3.15 — Vehicles + addresses CRUD (profile)

Implement `GET/POST/PATCH /v1/me/vehicles` and `/v1/me/addresses` per architecture §09.

Used by finalization save flags; not required for gs UI list in Phase 03.

**Verify:** curl CRUD roundtrip.

#### Task 3.16 — FlowDecision module

Centralize in `flow_decision.py`:

```python
def build_flow_decision(job_card: JobCard, estimate: Estimate | None) -> FlowDecision:
    ...
```

Rules for Phase 03:

- If any repair items → not tested in Phase 03 (guard raises if present)
- If `ESTIMATE_ACCEPTED` and no advisor → `FINALIZE`
- Never emit `CREATE_ADVISOR_CASE` without repair items

**Verify:** unit test matrix in `test_flow_decision_gs.py`.

#### Task 3.17 — Problem Details errors

Implement codes: `AUTH_REQUIRED`, `ESTIMATE_EXPIRED`, `SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, `SERVICE_AREA_UNSUPPORTED`, `INVALID_STATE_TRANSITION`.

Each includes `allowed_actions` for client recovery.

**Verify:** Wrong-state accept returns 409 with `allowed_actions`.

#### Task 3.18 — OpenAPI export + contracts sync

Regenerate or hand-update `packages/contracts` to match Pydantic schemas.

**Verify:** `pnpm --filter @caratom/customer typecheck` passes.

### Block C — Customer mobile (Days 6–11)

#### Task 3.19 — `vehicleDraftStore` (Zustand + persist)

```typescript
interface VehicleDraft {
  make: string | null;
  model: string | null;
  year: number | null;
  fuelType: 'PETROL' | 'DIESEL' | 'CNG' | 'EV' | null;
  transmission: 'MANUAL' | 'AUTOMATIC' | null;
}
```

Persist to AsyncStorage; clear on booking complete.

**Verify:** Kill app mid-picker; draft restores.

#### Task 3.20 — Vehicle picker screens gs-02–gs-05

Implement per §14.2–§14.5. Shared `FlowRail` currentStep 2–5.

Navigation:

```text
/vehicle/make → /vehicle/model → /vehicle/year → /vehicle/fuel → /job-card/create
```

On fuel **Use this car**: call `POST /v1/job-cards` then navigate to `/job-card/{id}`.

**Verify:** Segment control highlights correct step; Honda/City/2019/Petrol selected states match walkthrough.

#### Task 3.21 — gs-06 Job card screen

- Load job card by id
- Vehicle summary from draft/API
- Concerns `TextInput` debounced PATCH
- Line item read-only from API
- Footer note: "No repair add-ons on this flow."
- CTA **Review estimate** → `POST /price` → navigate estimate

**Verify:** Concerns persist on back navigation.

#### Task 3.22 — gs-07 Estimate screen

- Policy note banner
- Line items from API
- **Accept estimate** → accept mutation → coordinator next route
- **Change job card** → back to gs-06 without clearing accept if not yet accepted

**Verify:** Accept disabled while loading; total never computed client-side.

#### Task 3.23 — `generalServiceCoordinator`

```typescript
export function nextRouteFromDecision(
  decision: FlowDecision,
  ctx: { jobCardId: string; bookingId?: string }
): Href | null {
  switch (decision.required_next_action) {
    case 'ACCEPT_ESTIMATE':
      return `/job-card/${ctx.jobCardId}/estimate`;
    case 'FINALIZE':
      return '/checkout/details';
    case 'SELECT_SLOT':
      return '/checkout/slot';
    case 'CONFIRM_BOOKING':
      return '/checkout/slot';
    default:
      return null;
  }
}
```

After book success → `/booking/{bookingId}`.

**Verify:** Jest tests for each `required_next_action`.

#### Task 3.24 — gs-08 Details screen

- React Hook Form + Zod: name, phone E.164, address line1, locality, city, postal
- Map placeholder `Image` below address
- On submit: if no session → navigate `/(auth)/phone` with return path
- Else `POST /finalization` → slot on success

Pre-fill from `GET /v1/me` when authenticated.

**Verify:** Demo values Rajesh Kumar / +91 98765 43210 / Koramangala address.

#### Task 3.25 — gs-09 Slot screen

- Subtitle from offering duration
- Date strip: 3 days (dynamic from API or client-generated rolling window)
- Time grid 2 columns
- On slot tap: create hold
- CTA **Confirm {time}** → `POST /book` → gs-10

Handle `SLOT_UNAVAILABLE` → refresh slots toast.

**Verify:** Selected cell green border `#5DB7E8` / bg `#EAF6FC`.

#### Task 3.26 — gs-10 Confirmed screen

- Green checkmark 48px circle
- Title **Booking confirmed**
- Subtitle from API note
- Summary: Reference, When, Vehicle, Address
- CTA **View booking** → booking detail stub

**Verify:** Matches walkthrough copy for JC-1050 demo when seeded.

#### Task 3.27 — Wire gs-01 CTA

Replace Phase 02 toast with navigation:

```typescript
router.push({ pathname: '/vehicle/make', params: { offering: 'general-service-health-report' } });
```

Update vehicle pill on home when draft complete: **Honda City 2019**.

**Verify:** Full manual E2E from home tab.

#### Task 3.28 — Loading, error, offline states

Per §14 and architecture §11:

- Skeletons on job card and estimate
- Preserve form on finalization error
- Offline banner blocks book with explanation

**Verify:** Airplane mode on slot screen shows banner.

### Block D — Testing & audits (Days 11–14)

#### Task 3.29 — API integration test full path

`test_general_service_e2e.py`:

1. Auth as test customer
2. Create job card
3. Price → accept
4. Finalize
5. List slots → hold → book
6. Assert `advisor_requirement` never `REQUIRED_NOW`
7. Assert booking snapshot totals match estimate

**Verify:** `uv run pytest tests/integration -v`

#### Task 3.30 — Slot idempotency test

Double `POST /book` same Idempotency-Key → one booking row.

**Verify:** `test_slot_idempotency.py` passes.

#### Task 3.31 — Role enforcement test

Customer JWT cannot `POST /v1/admin/*` (404/403).

**Verify:** pytest security test.

#### Task 3.32 — Coordinator unit tests

**Verify:** `pnpm --filter @caratom/customer test`

#### Task 3.33 — Manual E2E checklist (Expo Go)

Document in §17; execute iOS + Android.

#### Task 3.34 — Walkthrough side-by-side

Compare gs-01–gs-10 to HTML walkthrough.

#### Task 3.35 — Phase exit audits §18–§24

Complete all checklists before declaring done.

---

## 9. Mobile Implementation

### 9.1 Stack (unchanged from Phase 02)

| Library | Phase 03 usage |
|---------|----------------|
| Expo Router 4 | Vehicle stack, job-card dynamic routes, checkout |
| TanStack Query | `useJobCard`, `useEstimate`, `useSlots`, `useBooking` |
| Zustand | `vehicleDraftStore`, `jobCardFlowStore` |
| React Hook Form + Zod | gs-08 details form |
| Expo SecureStore | Auth tokens (Phase 02) |
| FlashList | Make/model grids if list long |

### 9.2 Route map

```text
app/(tabs)/home.tsx                    # gs-01 (General tab body)
app/vehicle/_layout.tsx                # Stack + FlowRail
app/vehicle/make.tsx                   # gs-02
app/vehicle/model.tsx                  # gs-03
app/vehicle/year.tsx                   # gs-04
app/vehicle/fuel.tsx                   # gs-05
app/job-card/[id]/index.tsx            # gs-06
app/job-card/[id]/estimate.tsx         # gs-07
app/checkout/details.tsx               # gs-08 (jobCardId query param)
app/checkout/slot.tsx                  # gs-09
app/booking/[id]/index.tsx             # gs-10
app/(auth)/phone.tsx                   # OTP interrupt from gs-08
app/(auth)/otp.tsx
```

### 9.3 `generalServiceCoordinator` (normative)

Location: `apps/customer/src/coordinators/generalServiceCoordinator.ts`

**Rules:**

1. Never navigate to advisor routes in Phase 03.
2. After `POST /price`, if `required_next_action === 'ACCEPT_ESTIMATE'`, go to estimate screen.
3. After accept, if `advisor_requirement !== 'NOT_REQUIRED'`, throw dev error (should not happen without add-ons).
4. On `AUTH_REQUIRED` from finalization, push auth with `returnTo=/checkout/details?jobCardId=...`.
5. On successful book, `router.replace(/booking/${id})` — no back to slot.

### 9.4 TanStack Query keys

```typescript
export const queryKeys = {
  jobCard: (id: string) => ['job-card', id] as const,
  estimate: (jobCardId: string) => ['estimate', jobCardId] as const,
  slots: (jobCardId: string, from: string, to: string) => ['slots', jobCardId, from, to] as const,
  booking: (id: string) => ['booking', id] as const,
};
```

Invalidate `jobCard` after price, accept, finalization, book.

### 9.5 API client mutations

All write operations pass headers:

```typescript
headers: {
  Authorization: `Bearer ${token}`,
  'Idempotency-Key': idempotencyKey,
  'X-Request-Id': requestId,
}
```

Generate idempotency key per user action (accept, finalization, hold, book) — store in mutation state until success.

### 9.6 Vehicle catalog (static)

`apps/customer/src/data/vehicleCatalog.ts`:

```typescript
export const MAKES = [
  { id: 'maruti', label: 'Maruti', logoKey: 'MS' },
  { id: 'hyundai', label: 'Hyundai', logoKey: 'HY' },
  { id: 'honda', label: 'Honda', logoKey: 'HO' },
  { id: 'tata', label: 'Tata', logoKey: 'TA' },
  { id: 'mahindra', label: 'Mahindra', logoKey: 'MA' },
  { id: 'toyota', label: 'Toyota', logoKey: 'TO' },
  { id: 'kia', label: 'Kia', logoKey: 'KI' },
  { id: 'skoda', label: 'Skoda', logoKey: 'SK' },
  { id: 'volkswagen', label: 'Volkswagen', logoKey: 'VW' },
];

export const MODELS_BY_MAKE: Record<string, Array<{ name: string; bodyType: string }>> = {
  honda: [
    { name: 'Amaze', bodyType: 'Compact' },
    { name: 'City', bodyType: 'Sedan' },
    { name: 'Jazz', bodyType: 'Hatch' },
    { name: 'WR-V', bodyType: 'SUV' },
    { name: 'Elevate', bodyType: 'SUV' },
    { name: 'Civic', bodyType: 'Sedan' },
  ],
  // Other makes: minimal 2–4 models each for MVP
};

export const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
```

Server compatibility validation deferred to `POST /price` — client does not block year selection.

### 9.7 Component reuse from Phase 02

| Component | Phase 03 usage |
|-----------|----------------|
| `HomeChrome` | gs-01 only |
| `ModeTabs` | gs-01 |
| `PrimaryButton` | All CTAs |
| `PolicyNote` | gs-01, gs-07 |
| `IncludedList` | gs-01 |
| `TrustStrip` | gs-01 |

### 9.8 Analytics events (Phase 03)

| Event | When |
|-------|------|
| `vehicle_context_started` | gs-02 mount |
| `vehicle_context_completed` | gs-05 Use this car |
| `job_card_started` | gs-06 mount |
| `job_card_proceeded` | Review estimate tap |
| `estimate_viewed` | gs-07 mount |
| `estimate_accepted` | Accept tap success |
| `customer_details_completed` | gs-08 success |
| `slot_selected` | Time cell tap |
| `booking_confirmed` | gs-10 mount |

Stub analytics provider OK; events must be callable.

### 9.9 Accessibility

- Flow rail dots: `accessibilityLabel` "Step 3 of 10, Model"
- Make/model tiles: selected state announced
- Estimate total: `accessibilityRole="text"` read in order
- Slot cells: include date and time in label, not color alone
- Confirm button: "Confirm booking for Wednesday 11 AM to 1 PM"

---

## 10. Backend Implementation

### 10.1 Module layout

```text
backend/app/modules/
  vehicles/
    models.py, schemas.py, repository.py, router.py, service.py
  addresses/
    models.py, schemas.py, repository.py, router.py, service.py
  job_cards/
    models.py, schemas.py, repository.py, router.py, service.py, state_machine.py
  pricing/
    service.py, policies.py
  estimates/
    models.py, schemas.py, repository.py, service.py
  slots/
    models.py, schemas.py, generator.py, repository.py, router.py, service.py
  bookings/
    models.py, schemas.py, repository.py, router.py, service.py, snapshots.py
```

### 10.2 Job card service (core logic)

```python
class JobCardService:
    async def create(self, user_id: UUID, body: CreateJobCardRequest) -> JobCardResponse:
        offering = await self.catalog.get_active_offering(body.service_offering_slug)
        if offering.flow_policy != FlowPolicy.GENERAL_SERVICE:
            raise UnprocessableEntity("INVALID_OFFERING_FOR_FLOW")
        # Phase 03: reject if repair items in request
        job_card = await self.repo.create(...)
        await self.repo.add_service_item(job_card.id, offering)
        await self.repo.add_concerns(job_card.id, body.concerns)
        return self._to_response(job_card)

    async def price(self, job_card_id: UUID, user_id: UUID) -> PriceResponse:
        job_card = await self._get_owned(job_card_id, user_id)
        self.state_machine.transition(job_card, JobCardStatus.PRICING)
        estimate = await self.pricing.build_estimate(job_card)
        self.state_machine.transition(job_card, JobCardStatus.ESTIMATE_READY)
        return PriceResponse(estimate=estimate, flow_decision=build_flow_decision(job_card, estimate))
```

### 10.3 Pricing service (Phase 03 simplified)

```python
async def build_estimate(self, job_card: JobCard) -> Estimate:
    offering = job_card.primary_service_offering
    amount = offering.display_price_minor  # 299900 from pricing_policy
    lines = [
        EstimateLineItem(label=offering.name, amount_minor=amount, kind="SERVICE"),
        EstimateLineItem(label="Included fluids check", amount_minor=0, kind="INCLUSION"),
    ]
    return await self.estimate_repo.create_version(job_card.id, lines, total_minor=amount)
```

No tax line in Phase 03 MVP (document as debt; GST in Phase 08).

### 10.4 Slot generator

```python
def generate_slots(
    calendar: ServiceCalendar,
    from_date: date,
    to_date: date,
    duration_minutes: int,
    existing_holds: list[SlotHold],
    existing_bookings: list[Booking],
) -> list[Slot]:
    windows = [(time(9, 0), time(11, 0)), (time(11, 0), time(13, 0)),
               (time(14, 0), time(16, 0)), (time(16, 0), time(18, 0))]
    # Iterate dates in Asia/Kolkata; skip holidays; mark unavailable on conflict
```

Capacity model Phase 03: **global van pool** — max 3 concurrent bookings per slot window (configurable `SLOT_CAPACITY=3`).

### 10.5 Booking transaction (pseudocode)

```python
async def confirm_booking(self, job_card_id, hold_id, user_id, idempotency_key):
    async with self.db.begin():
        hold = await self.holds.get_for_update(hold_id)
        if hold.expired:
            raise ProblemDetail(code="HOLD_EXPIRED", ...)
        job_card = await self.job_cards.get_for_update(job_card_id)
        if job_card.status != JobCardStatus.READY_TO_BOOK:
            raise ProblemDetail(code="INVALID_STATE_TRANSITION", ...)
        booking = await self.bookings.create(...)
        await self.snapshots.write_all(booking, job_card)
        job_card.status = JobCardStatus.BOOKING_CREATED
        hold.status = HoldStatus.CONSUMED
    return booking
```

### 10.6 Authorization

Every `job_cards/{id}` route:

```python
job_card = await repo.get(job_card_id)
if job_card.profile_id != current_user.id and current_user.role != "admin":
    raise NotFound()  # Do not leak existence
```

### 10.7 Rate limiting (recommended)

- `POST /job-cards`: 10/hour per IP unauthenticated preview; 30/hour authenticated
- `POST /price`: 20/hour per job card

Implement via slowapi or middleware stub; full limits Phase 12.

### 10.8 Dev fixtures endpoint (optional)

Not required Phase 03. Phase 04 adds `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate`.

---

## 11. Database Implementation

### 11.1 Table `vehicles`

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','EV')),
  transmission TEXT NOT NULL CHECK (transmission IN ('MANUAL','AUTOMATIC')),
  registration_number TEXT,
  variant TEXT,
  mileage_km INTEGER,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_profile_id ON vehicles(profile_id) WHERE is_archived = FALSE;
```

### 11.2 Table `addresses`

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  label TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  locality TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bengaluru',
  state TEXT NOT NULL DEFAULT 'Karnataka',
  postal_code TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_profile_id ON addresses(profile_id) WHERE is_archived = FALSE;
```

### 11.3 Table `job_cards`

```sql
CREATE TYPE job_card_status AS ENUM (
  'EDITABLE','PRICING','PRICING_FAILED','ESTIMATE_READY','ESTIMATE_ACCEPTED',
  'ADVISOR_REQUIRED','ADVISOR_IN_PROGRESS','SCOPE_CONFIRMED',
  'READY_FOR_FINALIZATION','FINALIZATION_IN_PROGRESS','READY_TO_BOOK',
  'BOOKING_CREATED','IN_SERVICE','COMPLETED','ABANDONED','CANCELLED'
);

CREATE TABLE job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id),
  service_offering_id UUID NOT NULL REFERENCES service_offerings(id),
  flow_policy TEXT NOT NULL,
  status job_card_status NOT NULL DEFAULT 'EDITABLE',
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_context JSONB NOT NULL,
  service_area_id UUID REFERENCES service_area_rules(id),
  accepted_estimate_id UUID,
  idempotency_namespace TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_cards_profile_status ON job_cards(profile_id, status);
```

`vehicle_context` stores picker snapshot at create time:

```json
{"make":"Honda","model":"City","year":2019,"fuel_type":"PETROL","transmission":"MANUAL"}
```

### 11.4 Table `job_card_concerns`

```sql
CREATE TABLE job_card_concerns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 11.5 Table `job_card_items`

```sql
CREATE TYPE job_card_item_kind AS ENUM ('SERVICE','REPAIR');

CREATE TABLE job_card_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  kind job_card_item_kind NOT NULL,
  service_offering_id UUID REFERENCES service_offerings(id),
  repair_offering_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  label_snapshot TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Phase 03: only `kind=SERVICE` rows.

### 11.6 Table `estimates`

```sql
CREATE TYPE estimate_status AS ENUM (
  'DRAFT','READY','ACCEPTED','REJECTED','EXPIRED','SUPERSEDED','CALCULATION_FAILED'
);

CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status estimate_status NOT NULL DEFAULT 'DRAFT',
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  expires_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_card_id, version)
);

CREATE UNIQUE INDEX uq_estimates_one_ready_per_job_card
  ON estimates(job_card_id) WHERE status = 'READY';
```

### 11.7 Table `estimate_line_items`

```sql
CREATE TABLE estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_included BOOLEAN NOT NULL DEFAULT FALSE
);
```

### 11.8 Table `estimate_acceptances`

```sql
CREATE TABLE estimate_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  accepted_total_minor INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
```

### 11.9 Table `slot_holds`

```sql
CREATE TYPE slot_hold_status AS ENUM ('ACTIVE','CONSUMED','EXPIRED','RELEASED');

CREATE TABLE slot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  slot_starts_at TIMESTAMPTZ NOT NULL,
  slot_ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status slot_hold_status NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_slot_holds_active ON slot_holds(slot_starts_at, slot_ends_at)
  WHERE status = 'ACTIVE';
```

### 11.10 Table `bookings`

```sql
CREATE TYPE booking_status AS ENUM (
  'DRAFT','HOLDING','CONFIRMED','RESCHEDULE_REQUESTED','CANCEL_REQUESTED',
  'IN_PROGRESS','COMPLETED','CANCELLED'
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref TEXT NOT NULL UNIQUE,
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  status booking_status NOT NULL DEFAULT 'CONFIRMED',
  slot_starts_at TIMESTAMPTZ NOT NULL,
  slot_ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  visit_type TEXT NOT NULL DEFAULT 'SERVICE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 11.11 Table `booking_snapshots`

```sql
CREATE TABLE booking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_snapshot JSONB NOT NULL,
  address_snapshot JSONB NOT NULL,
  vehicle_snapshot JSONB NOT NULL,
  estimate_snapshot JSONB NOT NULL,
  offering_snapshot JSONB NOT NULL,
  flow_policy TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Snapshots are **immutable** after insert.

### 11.12 Supporting tables (minimal)

```sql
CREATE TABLE service_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  operating_start TIME NOT NULL DEFAULT '09:00',
  operating_end TIME NOT NULL DEFAULT '18:00',
  slot_capacity INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES service_calendars(id),
  holiday_date DATE NOT NULL,
  reason TEXT,
  UNIQUE (calendar_id, holiday_date)
);
```

Seed: `service_calendars` row `koramangala-default`.

### 11.13 Idempotency store

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  profile_id UUID,
  route TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

TTL 24 hours.

---

## 12. API Contracts

### 12.1 `POST /v1/job-cards`

**Auth:** Optional — if authenticated, `profile_id` set; guest creates anonymous draft allowed **only** if Phase 02 policy permits; **Phase 03 requires auth at finalization**. Recommend authenticated create after gs-05 or allow guest create with `profile_id=null` until finalization.

**Request:**

```json
{
  "service_offering_slug": "general-service-health-report",
  "vehicle_context": {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL"
  },
  "concerns": [
    { "text": "Want full service and a health report. AC feels weak on idle." }
  ]
}
```

**Response 201:**

```json
{
  "job_card": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "public_ref": "JC-1050",
    "status": "EDITABLE",
    "flow_policy": "GENERAL_SERVICE",
    "vehicle_context": { "make": "Honda", "model": "City", "year": 2019, "fuel_type": "PETROL", "transmission": "MANUAL" },
    "items": [
      {
        "id": "...",
        "kind": "SERVICE",
        "label": "General servicing + health report",
        "unit_price_minor": 299900,
        "currency": "INR"
      }
    ],
    "concerns": [{ "id": "...", "text": "Want full service and a health report. AC feels weak on idle." }]
  },
  "flow_decision": {
    "policy": "GENERAL_SERVICE",
    "advisor_requirement": "NOT_REQUIRED",
    "estimate_requirement": "PRE_BOOKING",
    "required_next_action": "REQUEST_ESTIMATE",
    "allowed_actions": ["REQUEST_ESTIMATE", "EDIT_JOB_CARD"],
    "blocking_reasons": [],
    "estimate_version_id": null,
    "expires_at": null
  }
}
```

### 12.2 `PATCH /v1/job-cards/{id}`

Update concerns only in Phase 03.

```json
{
  "concerns": [{ "text": "Updated concern text" }]
}
```

### 12.3 `POST /v1/job-cards/{id}/price`

**Response 200:**

```json
{
  "estimate": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "version": 1,
    "status": "READY",
    "total": { "amount_minor": 299900, "currency": "INR" },
    "expires_at": "2026-08-30T12:00:00Z",
    "line_items": [
      { "label": "General servicing + health report", "amount_minor": 299900, "kind": "SERVICE", "is_included": false },
      { "label": "Included fluids check", "amount_minor": 0, "kind": "INCLUSION", "is_included": true }
    ]
  },
  "flow_decision": {
    "policy": "GENERAL_SERVICE",
    "advisor_requirement": "NOT_REQUIRED",
    "estimate_requirement": "PRE_BOOKING",
    "required_next_action": "ACCEPT_ESTIMATE",
    "allowed_actions": ["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"],
    "blocking_reasons": [],
    "estimate_version_id": "660e8400-e29b-41d4-a716-446655440001",
    "expires_at": "2026-08-30T12:00:00Z"
  }
}
```

### 12.4 `POST /v1/job-cards/{id}/estimates/{estimate_id}/accept`

**Headers:** `Idempotency-Key: accept-{jobCardId}-{estimateId}`

**Request:**

```json
{
  "expected_total_minor": 299900,
  "expected_content_hash": "sha256:abc123..."
}
```

**Response 200:**

```json
{
  "acceptance": {
    "id": "...",
    "accepted_at": "2026-08-29T10:30:00Z",
    "accepted_total_minor": 299900
  },
  "flow_decision": {
    "policy": "GENERAL_SERVICE",
    "advisor_requirement": "NOT_REQUIRED",
    "required_next_action": "FINALIZE",
    "allowed_actions": ["FINALIZE", "EDIT_JOB_CARD"],
    "blocking_reasons": []
  }
}
```

**409 ESTIMATE_EXPIRED:** Client must re-call `/price`.

### 12.5 `POST /v1/job-cards/{id}/finalization`

**Auth:** Required

**Request:** See Task 3.10

**Response 200:**

```json
{
  "job_card": { "id": "...", "status": "READY_TO_BOOK", "vehicle_id": "..." },
  "address_id": "...",
  "vehicle_id": "...",
  "flow_decision": {
    "required_next_action": "SELECT_SLOT",
    "allowed_actions": ["LIST_SLOTS", "FINALIZE"]
  }
}
```

**401 AUTH_REQUIRED:**

```json
{
  "code": "AUTH_REQUIRED",
  "message": "Sign in to continue booking.",
  "retryable": false,
  "allowed_actions": ["AUTHENTICATE"]
}
```

### 12.6 `GET /v1/job-cards/{id}/slots`

See Task 3.11 response shape.

### 12.7 `POST /v1/job-cards/{id}/slot-holds`

**Request:**

```json
{ "slot_id": "2026-08-19T11:00:00+05:30" }
```

**Response 201:**

```json
{
  "hold": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "slot_starts_at": "2026-08-19T05:30:00Z",
    "slot_ends_at": "2026-08-19T07:30:00Z",
    "expires_at": "2026-08-29T10:45:00Z",
    "status": "ACTIVE"
  },
  "flow_decision": {
    "required_next_action": "CONFIRM_BOOKING",
    "allowed_actions": ["CONFIRM_BOOKING", "LIST_SLOTS"]
  }
}
```

### 12.8 `POST /v1/job-cards/{id}/book`

**Request:**

```json
{ "slot_hold_id": "770e8400-e29b-41d4-a716-446655440002" }
```

**Response 201:**

```json
{
  "booking": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "public_ref": "BK-2201",
    "status": "CONFIRMED",
    "slot": {
      "starts_at": "2026-08-19T05:30:00Z",
      "ends_at": "2026-08-19T07:30:00Z",
      "display": "Wed 19 · 11:00 – 13:00"
    },
    "job_card_ref": "JC-1050",
    "vehicle_summary": "Honda City 2019 · Petrol",
    "address_summary": "Koramangala 5th Block",
    "customer_progress": "BOOKING_CONFIRMED"
  }
}
```

### 12.9 `GET /v1/bookings/{id}`

Returns same booking object plus `snapshot` summaries for detail screen.

### 12.10 Error catalog (Phase 03)

| Code | HTTP | retryable | allowed_actions |
|------|------|-----------|-----------------|
| AUTH_REQUIRED | 401 | false | AUTHENTICATE |
| ESTIMATE_EXPIRED | 409 | true | REQUEST_ESTIMATE |
| INVALID_STATE_TRANSITION | 409 | false | varies |
| SLOT_UNAVAILABLE | 409 | true | LIST_SLOTS |
| HOLD_EXPIRED | 409 | true | LIST_SLOTS |
| SERVICE_AREA_UNSUPPORTED | 422 | false | EDIT_ADDRESS, SUPPORT |
| FORBIDDEN | 403 | false | [] |
| NOT_FOUND | 404 | false | [] |

---

## 13. Complete Data Flow

### 13.1 Sequence diagram (happy path)

```text
Customer                Mobile App              FastAPI                 Postgres
   |                        |                      |                        |
   |-- Open General tab ---->|                      |                        |
   |                        |-- GET /catalog/home ->|                        |
   |                        |<----- gs-01 payload --|                        |
   |-- Start job card ----->|                      |                        |
   |                        |  [vehicle draft local]|                        |
   |-- Use this car -------->|                      |                        |
   |                        |-- POST /job-cards -->|---- INSERT job_cards -->|
   |                        |<----- JC + decision -|<-----------------------|
   |-- Review estimate ----->|                      |                        |
   |                        |-- POST /price ------>|---- INSERT estimates -->|
   |                        |<----- estimate -------|<-----------------------|
   |-- Accept estimate ---->|                      |                        |
   |                        |-- POST .../accept --->|---- acceptance -------->|
   |                        |<----- FINALIZE -------|<-----------------------|
   |-- Continue to slot ---->|                      |                        |
   |   [OTP if guest]       |-- POST /finalization>|---- vehicles, addresses|
   |                        |                      |---- READY_TO_BOOK ----->|
   |-- Pick 11-13 ---------->|-- POST /slot-holds ->|---- slot_holds -------->|
   |-- Confirm --------------|-- POST /book -------->|---- bookings + snap -->|
   |                        |<----- BOOKING_CONFIRMED                        |
   |<-- gs-10 confirmed ----|                      |                        |
```

### 13.2 Data written per step

| Step | Tables touched | Immutable? |
|------|----------------|------------|
| gs-05 create | `job_cards`, `job_card_items`, `job_card_concerns`, `job_card_events` | Job card mutable until book |
| gs-07 price | `estimates`, `estimate_line_items`, `job_card_events` | Estimate version immutable once READY |
| gs-07 accept | `estimate_acceptances`, `job_cards.status` | Acceptance immutable |
| gs-08 finalize | `profiles`, `vehicles`, `addresses`, `job_cards.vehicle_id` | Address/vehicle mutable in profile; snapshot at book |
| gs-09 hold | `slot_holds` | Hold expires |
| gs-09 book | `bookings`, `booking_snapshots`, `slot_holds.status` | Booking + snapshots immutable |

### 13.3 Client-side state

| Store | Keys | Cleared when |
|-------|------|--------------|
| `vehicleDraftStore` | make, model, year, fuel, transmission | Booking confirmed or explicit discard |
| `jobCardFlowStore` | `activeJobCardId`, `offeringSlug` | Booking confirmed |
| TanStack Query cache | job-card, estimate, slots, booking | Invalidated on mutations |
| SecureStore | Supabase session | Logout only |

### 13.4 Failure recovery flows

| Failure | Client behavior |
|---------|-----------------|
| Price network error | Retain gs-06 edits; retry Review estimate |
| Accept while expired | Show banner; auto re-price or manual retry |
| Finalization 401 | OTP flow; preserve form fields in Zustand |
| Hold expired on confirm | Refresh slots; toast "That time was just taken" |
| Book idempotent success | Navigate to gs-10 even if duplicate response |
| App backgrounded on confirm | On resume `GET /job-cards/{id}` — if `BOOKING_CREATED`, route to booking |

### 13.5 No advisor invariant (assert in tests)

```python
def assert_no_advisor_path(flow_decisions: list[FlowDecision]):
    for fd in flow_decisions:
        assert fd.advisor_requirement == "NOT_REQUIRED"
        assert "CREATE_ADVISOR_CASE" not in fd.allowed_actions
```

---

## 14. UI/UX Conformance (embed ALL gs-01 through gs-10 walkthrough screens inline)

**Normative reference:** [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — General service folder.

**Global tokens (Phase 02 light-blue accent):**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#5DB7E8` | Active tabs, selected borders, links |
| `--brand-2` | `#176B9E` | Filled primary CTAs, pressed |
| `--brand-soft` | `#EAF6FC` | Policy note background, selected tile bg |
| `--bg` | `#F7FAFC` | Screen canvas |
| `--card` | `#FFFFFF` | Cards |
| `--border` | `#DCE8EF` | Default borders |
| `--text` | `#142532` | Body text |
| `--muted` | `#6A7B86` | Secondary copy |
| `--ok` | `#2D8A61` | Included chips, success checkmark |
| Selected cell bg | `#EAF6FC` | Year grid, slot grid selection |

**Global chrome (gs-01 through gs-05 home only):**

- Location top-left: **Service at Koramangala**
- Vehicle pill top-right: **Add your car** → **Honda City 2019** after picker complete
- Mode tabs: **General service** active (brand underline); bottom nav Home/Orders/Profile visible

**Flow rail (gs-02 through gs-10):** 10 dots; steps 2–5 active during picker; dot 6 job card; 7 estimate; 8 details; 9 slot; 10 confirmed. Completed dots: `--brand-soft` fill.

---

### 14.1 Screen `gs-01-home`

**Walkthrough ID:** `gs-01-home`  
**Route:** `app/(tabs)/home.tsx` — General service tab body  
**Mode tab active:** `general`  
**Flow step:** 1 of 10 (dot 1 on rail if shown; rail optional on home)

#### Navigation

| Action | Target |
|--------|--------|
| **Start job card** (primary CTA) | `/vehicle/make?offering=general-service-health-report` |
| Vehicle pill tap (no draft) | `/vehicle/make` |
| Vehicle pill tap (draft complete) | Show summary sheet or re-enter picker |
| Other mode tabs | Swap home body (Phase 02); no stack push |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Hero kicker | General service · doorstep |
| Hero title | Full service + health report |
| Search placeholder | Search make, model or plate (optional) |
| Policy note | Estimate before slot · no add-ons · no advisor call |
| Section title | General servicing + health report |
| Package title | General servicing + health report |
| Package sub | Usually 1 visit |
| Package price | From ₹2,999 |
| Primary CTA | Start job card |
| Section title (included) | Included in service |
| Included items | Engine oil & filter · Air filter check · Fluid top-up · 30-point health report |
| Included chip | Included (green) |
| Section title (trust) | Why CARATOM |
| Trust cards | Van at your door · Trained techs · Genuine parts · Warranty |

#### Layout (top to bottom)

1. Hero carousel 16:9 — video or image placeholder `VIDEO`; 3 pagination dots (first active)
2. Search bar — non-submitting in Phase 03
3. Policy note — brand-soft banner
4. Package card — selected state green border 1.5px
5. Primary button full width
6. Included list — 4 rows with chips
7. Trust strip — horizontal scroll 4 cards

#### Colors

- Policy note: bg `#EAF6FC`, text `#5DB7E8`
- Price: `#142532` bold
- Included chip: bg success-soft, text `#2E7D4F`
- CTA: bg `#176B9E`, text white

#### Sample data (API)

From `GET /v1/catalog/home` → `sections.general_service.offering`:

- `slug`: `general-service-health-report`
- `flow_policy`: `GENERAL_SERVICE`
- `display_price.amount_minor`: `299900`

#### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton hero + package + 4 list rows |
| Error | Banner + retry |
| Offline | Top banner; cached catalog if available |

---

### 14.2 Screen `gs-02-make`

**Walkthrough ID:** `gs-02-make`  
**Route:** `app/vehicle/make.tsx`  
**Nav title:** Select make  
**Flow step:** 2 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | Home (General tab) |
| **Continue to model** | `/vehicle/model` (requires make selected) |
| Make tile tap | Select make; enable continue |

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| Model \| Year \| Fuel — **Make** highlighted |
| Search | Search company |
| CTA | Continue to model |

#### Layout

- Flow rail: dot 2 active (brand)
- Segment control 4 labels
- Search input
- **3-column logo grid** — 9 brands:

| Logo key | Name | Demo selected |
|----------|------|---------------|
| MS | Maruti | |
| HY | Hyundai | |
| HO | Honda | ✓ (demo default) |
| TA | Tata | |
| MA | Mahindra | |
| TO | Toyota | |
| KI | Kia | |
| SK | Skoda | |
| VW | Volkswagen | |

Selected tile: border `#5DB7E8`, checkmark ✓

#### Colors

- Segment active: `#5DB7E8` on soft bg
- Grid tile default: white card `#FFFFFF`, border `#E6E2DC`
- Selected: border 1.5px `#5DB7E8`, bg `#EAF6FC`

---

### 14.3 Screen `gs-03-model`

**Walkthrough ID:** `gs-03-model`  
**Route:** `app/vehicle/model.tsx`  
**Nav title:** Select model  
**Flow step:** 3 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/vehicle/make` |
| **Continue to year** | `/vehicle/year` |

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| **Model** \| Year \| Fuel |
| Context label | Honda |
| CTA | Continue to year |

#### Layout

- **3-column photo grid** under Honda:

| Model | Body type | Demo selected |
|-------|-----------|---------------|
| Amaze | Compact | |
| City | Sedan | ✓ |
| Jazz | Hatch | |
| WR-V | SUV | |
| Elevate | SUV | |
| Civic | Sedan | |

Each tile: car photo placeholder, name 13px bold, body type 11px muted.

---

### 14.4 Screen `gs-04-year`

**Walkthrough ID:** `gs-04-year`  
**Route:** `app/vehicle/year.tsx`  
**Nav title:** Select year  
**Flow step:** 4 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/vehicle/model` |
| **Continue to fuel** | `/vehicle/fuel` |

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| Model \| **Year** \| Fuel |
| CTA | Continue to fuel |

#### Layout

- **3-column year grid:** 2016, 2017, 2018, **2019** (selected), 2020, 2021, 2022, 2023, 2024
- Selected 2019: border 1.5px `#5DB7E8`, bg `#EAF6FC`, checkmark

---

### 14.5 Screen `gs-05-fuel`

**Walkthrough ID:** `gs-05-fuel`  
**Route:** `app/vehicle/fuel.tsx`  
**Nav title:** Fuel & transmission  
**Flow step:** 5 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/vehicle/year` |
| **Use this car** | `POST /v1/job-cards` → `/job-card/{id}` |

#### Copy

| Element | Text |
|---------|------|
| Segment | Make \| Model \| Year \| **Fuel** |
| Preview caption | Honda City · 2019 |
| Transmission chips | Manual \| Automatic — **Manual** active |
| Fuel card | **Petrol** selected |
| CTA | Use this car |

#### Layout

1. Car preview photo placeholder full width
2. Caption overlay/center: **Honda City · 2019**
3. Transmission chip row — Manual selected
4. Petrol card selected with checkmark
5. Primary CTA

#### Post-action

- Update home vehicle pill: **Honda City 2019**
- Persist `vehicleDraftStore`

---

### 14.6 Screen `gs-06-jobcard`

**Walkthrough ID:** `gs-06-jobcard`  
**Route:** `app/job-card/[id]/index.tsx`  
**Nav title:** Job card  
**Flow step:** 6 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/vehicle/fuel` (warn if concerns edited — OK to go back) |
| **Review estimate** | `POST /price` → `/job-card/{id}/estimate` |

#### Copy

| Element | Text |
|---------|------|
| Vehicle label | Vehicle |
| Vehicle summary | Honda City 2019 · Petrol |
| Concerns label | What's wrong with the car? |
| Concerns demo text | Want full service and a health report. AC feels weak on idle. |
| Line item | General servicing + health report — **₹2,999** |
| Footer note | No repair add-ons on this flow. |
| CTA | Review estimate |

#### Layout

1. Vehicle summary card — car thumb + summary row
2. Concerns card — editable `TextInput` multiline
3. Line items list — single service row
4. Muted footer note
5. Sticky bottom primary button

#### Colors

- Line item price: bold `#1A1A1A`
- No add-on section — **must not render** repair tiles in Phase 03

---

### 14.7 Screen `gs-07-estimate`

**Walkthrough ID:** `gs-07-estimate`  
**Route:** `app/job-card/[id]/estimate.tsx`  
**Nav title:** Your estimate  
**Flow step:** 7 of 10

#### Navigation

| Action | Target |
|--------|--------|
| **Accept estimate** | `POST .../accept` → coordinator → `/checkout/details` |
| **Change job card** (secondary) | `/job-card/{id}` — preserve unaccepted state |

#### Copy

| Element | Text |
|---------|------|
| Policy note | Indicative total · accept to continue booking |
| Line 1 | General servicing + health report — ₹2,999 |
| Line 2 | Included fluids check — **Included** chip |
| Total row | **Total** — **₹2,999** |
| Primary CTA | Accept estimate |
| Secondary CTA | Change job card |

#### Layout

1. Green policy note banner
2. Line item list with total row separated
3. Primary button
4. Secondary outline button below

#### Rules

- Total **must** match server `estimate.total.amount_minor`
- Never show advisor copy on this screen
- Loading: disable accept, show spinner on button

---

### 14.8 Screen `gs-08-details`

**Walkthrough ID:** `gs-08-details`  
**Route:** `app/checkout/details.tsx?jobCardId={id}`  
**Nav title:** Your details  
**Flow step:** 8 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/job-card/{id}/estimate` |
| **Continue to slot** | `POST /finalization` → `/checkout/slot` or OTP if guest |

#### Copy

| Element | Text |
|---------|------|
| Name label | Name |
| Name value (demo) | Rajesh Kumar |
| Phone label | Phone |
| Phone value (demo) | +91 98765 43210 |
| Address label | Address |
| Address value (demo) | 12, 5th Cross, Koramangala 5th Block |
| Map placeholder | ADDRESS MAP |
| CTA | Continue to slot |

#### Layout

1. Name field — `TextInput`
2. Phone field — phone keyboard, E.164 normalization
3. Address field — multiline or structured (line1 required)
4. Map placeholder block — static image, height ~120px
5. Primary CTA

#### Auth gate

If session missing on submit → navigate `/(auth)/phone` with return path; preserve form in store.

#### Combined screen rule

**Do not split** into separate customer / address routes. One scrollable form per walkthrough.

---

### 14.9 Screen `gs-09-slot`

**Walkthrough ID:** `gs-09-slot`  
**Route:** `app/checkout/slot.tsx?jobCardId={id}`  
**Nav title:** Pick a slot  
**Flow step:** 9 of 10

#### Navigation

| Action | Target |
|--------|--------|
| Back | `/checkout/details` |
| Time cell tap | Select slot; create hold |
| **Confirm 11:00 – 13:00** (dynamic label) | `POST /book` → `/booking/{id}` |

#### Copy

| Element | Text |
|---------|------|
| Subtitle | General service · ~2 hr visit |
| Date strip | Tue 18 \| **Wed 19** \| Thu 20 |
| Time slots | 9:00 – 11:00 · **11:00 – 13:00** · 14:00 – 16:00 · 16:00 – 18:00 |
| CTA (demo) | Confirm 11:00 – 13:00 |

#### Layout

1. Muted subtitle
2. Horizontal date segment — Wed 19 selected
3. **2-column grid** of time cells
4. Selected cell: border `#5DB7E8`, bg `#EAF6FC`
5. Primary CTA reflects selected slot label

#### API sequence on confirm

```text
POST /slot-holds (if not already held for selection)
POST /book
```

Single user gesture — do not show intermediate "review" screen.

---

### 14.10 Screen `gs-10-confirmed`

**Walkthrough ID:** `gs-10-confirmed`  
**Route:** `app/booking/[id]/index.tsx`  
**Nav title:** Confirmed  
**Flow step:** 10 of 10

#### Navigation

| Action | Target |
|--------|--------|
| **View booking** | Same screen scroll/detail or stub |
| Home | `/(tabs)/home` via tab bar |

#### Copy

| Element | Text |
|---------|------|
| Icon | Green checkmark 48px circle |
| Title | Booking confirmed |
| Note | We'll assign a van before your visit. |
| Reference | JC-1050 |
| When | Wed 19 · 11:00 – 13:00 |
| Vehicle | Honda City 2019 |
| Address | Koramangala |
| CTA | View booking |

#### Layout

```text
        ( ✓ )   green circle 48px
   Booking confirmed
We'll assign a van before your visit.

Reference    JC-1050
When         Wed 19 · 11:00 – 13:00
Vehicle      Honda City 2019
Address      Koramangala

[ View booking ]
```

#### Colors

- Checkmark circle: bg `#2E7D4F` or brand; white icon
- Title: 20px bold `#1A1A1A`
- Summary rows: label muted, value bold

---

## 15. Security

### 15.1 Authentication & authorization

| Control | Implementation |
|---------|----------------|
| JWT validation | All `/v1/job-cards/*`, `/v1/bookings/*` except optional guest create — finalization **requires** auth |
| Ownership | Job card `profile_id` must match JWT `sub`; return 404 on mismatch |
| Role | `role=customer` only on customer routes; admin/technician get 403 |
| No PostgREST | Mobile never writes domain tables via Supabase client |

### 15.2 Idempotency

Apply `Idempotency-Key` middleware to:

- `POST .../estimates/{id}/accept`
- `POST .../finalization`
- `POST .../slot-holds`
- `POST .../book`

Store response 24h; replay returns same status + body.

### 15.3 Input validation

| Field | Rule |
|-------|------|
| `phone_e164` | E.164; India +91 default |
| `postal_code` | 6 digits; validate against service area prefixes |
| `year` | 1990–2030 integer |
| `concerns.text` | Max 2000 chars; strip HTML |
| `slot_id` | ISO8601 instant in calendar window |

### 15.4 Money integrity

- All totals computed server-side in paise
- Client sends `expected_total_minor` + `content_hash` on accept — reject mismatch
- Booking snapshot stores accepted estimate totals — never recompute from live catalog at read time

### 15.5 Rate limiting

Document limits in README; implement basic per-IP limits on `POST /job-cards` and `POST /price` (see §10.7).

### 15.6 Secrets

- No Razorpay keys in Phase 03
- `DATABASE_URL`, `SUPABASE_JWT_SECRET` server-only
- Customer app: `EXPO_PUBLIC_*` only

### 15.7 Audit

Log `job_card_events` for: CREATED, PRICED, ESTIMATE_ACCEPTED, FINALIZED, BOOKED with actor and request_id.

Admin override not in Phase 03.

---

## 16. Testing Strategy

### 16.1 Backend unit tests

| Test file | Cases |
|-----------|-------|
| `test_flow_decision_gs.py` | No add-ons → NOT_REQUIRED; no CREATE_ADVISOR_CASE |
| `test_job_card_state_machine.py` | Legal transitions only |
| `test_pricing_gs.py` | 299900 paise for general-service offering |
| `test_slot_generator.py` | 4 windows/day; holiday skip |
| `test_refs.py` | Unique JC refs |

### 16.2 Backend integration tests

| Test | Assertion |
|------|-----------|
| `test_general_service_e2e.py` | Full HTTP path guest→auth→book |
| `test_slot_idempotency.py` | Double book one row |
| `test_estimate_expiry.py` | Accept after expiry → 409 |
| `test_service_area.py` | Invalid postal → 422 |
| `test_role_enforcement.py` | Customer cannot admin routes |

### 16.3 Mobile unit tests

| Test | Assertion |
|------|-----------|
| `generalServiceCoordinator.test.ts` | Maps each `required_next_action` |
| `vehicleDraftStore.test.ts` | Persist + clear |
| `formatSlotLabel.test.ts` | Wed 19 · 11:00 – 13:00 |

### 16.4 Manual E2E (Expo Go)

Execute §17 checklist on iOS and Android.

### 16.5 Walkthrough conformance

Side-by-side gs-01–gs-10 vs HTML walkthrough (§21).

### 16.6 Non-goals for Phase 03 tests

- Advisor simulation
- Payment webhooks
- Technician visit transitions
- Load testing (Phase 11)

---

## 17. Verification Procedure

### 17.1 Environment setup

```powershell
cd c:\Users
anda\OneDrive\Desktop\CarAtom-main
pnpm install
docker compose up -d
cd backend
uv sync
uv run alembic upgrade head
uv run pytest tests/ -v
cd ..
pnpm dev:api
# Separate terminal:
pnpm --filter @caratom/customer start
```

### 17.2 Database verification

```powershell
cd backend
uv run python -c "
from app.db.session import SessionLocal
from sqlalchemy import text
s = SessionLocal()
for t in ['vehicles','addresses','job_cards','estimates','bookings','slot_holds']:
    r = s.execute(text(f'SELECT COUNT(*) FROM {t}')).scalar()
    print(t, r)
"
```

Expected: tables exist (counts may be 0 pre-test).

### 17.3 API verification script

```powershell
$BASE = "http://localhost:8000"
$TOKEN = "<paste-supabase-jwt>"

# Create job card
$jc = Invoke-RestMethod -Method POST -Uri "$BASE/v1/job-cards" `
  -Headers @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
  -Body '{"service_offering_slug":"general-service-health-report","vehicle_context":{"make":"Honda","model":"City","year":2019,"fuel_type":"PETROL","transmission":"MANUAL"},"concerns":[{"text":"Demo"}]}'

$jid = $jc.job_card.id
Write-Host "Job card:" $jc.job_card.public_ref

# Price
$price = Invoke-RestMethod -Method POST -Uri "$BASE/v1/job-cards/$jid/price" `
  -Headers @{ Authorization = "Bearer $TOKEN" }
Write-Host "Total:" $price.estimate.total.amount_minor
Write-Host "Advisor:" $price.flow_decision.advisor_requirement

# Accept
$eid = $price.estimate.id
$accept = Invoke-RestMethod -Method POST -Uri "$BASE/v1/job-cards/$jid/estimates/$eid/accept" `
  -Headers @{ Authorization = "Bearer $TOKEN"; "Idempotency-Key" = "test-accept-1"; "Content-Type" = "application/json" } `
  -Body "{`"expected_total_minor`":299900,`"expected_content_hash`":`"$($price.estimate.content_hash)`"}"
Write-Host "Next:" $accept.flow_decision.required_next_action
```

Expected: `advisor_requirement=NOT_REQUIRED`, `required_next_action=FINALIZE`.

### 17.4 curl equivalents

```bash
curl -s -X POST http://localhost:8000/v1/job-cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @fixtures/create_job_card.json | jq '.flow_decision.advisor_requirement'
# Expected: "NOT_REQUIRED"
```

### 17.5 Mobile verification checklist

| # | Step | Pass |
|---|------|------|
| 1 | General tab shows gs-01 copy | ☐ |
| 2 | Start job card → gs-02 | ☐ |
| 3 | Honda → City → 2019 → Petrol → Use this car | ☐ |
| 4 | gs-06 shows concerns + ₹2,999 line | ☐ |
| 5 | Review estimate → gs-07 | ☐ |
| 6 | Accept → gs-08 (OTP if logged out) | ☐ |
| 7 | Rajesh details → Continue to slot | ☐ |
| 8 | Select Wed 19 11–13 → Confirm | ☐ |
| 9 | gs-10 Booking confirmed + JC ref | ☐ |
| 10 | No advisor screen appeared | ☐ |
| 11 | Android repeat | ☐ |
| 12 | iOS repeat | ☐ |

### 17.6 CI verification

```powershell
pnpm lint
pnpm typecheck
cd backend && uv run ruff check . && uv run pytest tests/integration/test_general_service_e2e.py -v
```

All green before exit gate.

### 17.7 Regression from Phase 02

```powershell
curl -s http://localhost:8000/v1/catalog/home | jq '.sections.general_service.offering.slug'
# Expected: general-service-health-report

curl -s http://localhost:8000/v1/me -H "Authorization: Bearer $TOKEN" | jq '.id'
# Expected: profile uuid
```

---

## 18. Full Codebase Audit

Complete before Phase 03 exit. Mark each item Pass / Fail / N/A.

### 18.1 Monorepo structure

| Check | Pass |
|-------|------|
| `apps/customer` vehicle + job-card + checkout routes exist | ☐ |
| `backend/app/modules/job_cards` implemented | ☐ |
| `backend/app/modules/bookings` implemented | ☐ |
| `packages/contracts` exports JobCard, Estimate, Booking, FlowDecision | ☐ |
| No accidental `packages/ui` bloat unrelated to Phase 03 | ☐ |

### 18.2 Backend completeness

| Check | Pass |
|-------|------|
| All §12 endpoints implemented | ☐ |
| Alembic migration applies cleanly on empty DB | ☐ |
| `flow_policy=GENERAL_SERVICE` enforced on create | ☐ |
| Repair items rejected or ignored in Phase 03 create | ☐ |
| Job card events logged | ☐ |
| OpenAPI `/docs` lists new routes | ☐ |

### 18.3 Mobile completeness

| Check | Pass |
|-------|------|
| gs-01 CTA wired (not Phase 03 toast) | ☐ |
| Flow rail on gs-02–gs-10 | ☐ |
| `generalServiceCoordinator` used for navigation after API | ☐ |
| No hardcoded ₹ totals except display from API | ☐ |
| OTP interrupt preserves gs-08 form | ☐ |
| Bottom tabs still work | ☐ |

### 18.4 Data integrity

| Check | Pass |
|-------|------|
| Booking snapshot written on confirm | ☐ |
| Estimate immutable after READY | ☐ |
| One READY estimate per job card | ☐ |
| Slot hold expires after 15m | ☐ |
| Idempotency replay works | ☐ |

### 18.5 Documentation

| Check | Pass |
|-------|------|
| `backend/README.md` documents new env vars | ☐ |
| `apps/customer/README.md` documents E2E path | ☐ |
| This document §24 exit gate complete | ☐ |

---

## 19. Vibe Coding Principles Audit (table)

Evaluate against [`Vibe code principles/`](../../Vibe%20code%20principles/). Missing companion files noted N/A per implementation README.

| Control / Principle | Source | Phase 03 expectation | Pass criteria |
|---------------------|--------|------------------------|---------------|
| AI claims ≠ evidence | VIBE-CODING §4.3 | §17 commands executed | pytest + manual checklist attached |
| Minimum scope | VIBE-CODING §4.11 | No advisor, no repair cart | §6.2 out-of-scope respected |
| No secrets in repo | GREENFIELD Checklist 3 | No JWT secrets in mobile | gitleaks / manual review |
| Server-authoritative money | Constitution | Client displays API totals only | Code review: no client sum |
| Idempotent writes | Constitution §6 | accept, finalize, hold, book | `test_slot_idempotency` passes |
| Flow from FlowDecision | EMERGENT §6.6 | Coordinator tests | Jest green |
| REQ-TRACE-001 | CONTROLS-CATALOG-1 | GS E2E traced to test | `test_general_service_e2e` maps gs-01–10 |
| SEC-AUTH-001 | CONTROLS-CATALOG-1 | JWT on protected routes | 401 without token on finalization |
| UX-DESTRUCTIVE-001 | CONTROLS-CATALOG-1 | No destructive actions in Phase 03 | N/A — confirm no accidental delete |
| Independent test execution | VIBE-CODING §4.3 | CI runs pytest without agent | GitHub Actions green |
| Diff review for removed checks | VIBE-CODING §4.2 | Phase 02 auth not weakened | OTP still required at finalize |
| Dependency verify | VIBE-CODING §4.4 | No hallucinated packages | lockfiles committed |
| CONSTITUTION.md | Referenced | **Missing** | Use product constitution doc |
| CONTROLS-CATALOG-2.md | Referenced | **Missing** | Part 1 only |
| SECURITY_ANALYSIS.md | Referenced | **Missing** | Use `security prompt.md` partial |
| SCORING-AND-GATES.md | Referenced | **Missing** | Use §24 exit gate |

**Phase 03 Vibe exit:** All applicable rows Pass. Document N/A rows.

---

## 20. Architecture Conformance Audit

| Architecture rule | Phase 03 conformance | Evidence |
|-------------------|----------------------|----------|
| Server-owned flow policy | Required | `flow_policy` on offering; FlowDecision on responses |
| GS no add-ons bypasses advisor | Required | `advisor_requirement=NOT_REQUIRED` in tests |
| Separate state machines | Required | JobCard, Estimate, Booking enums per §04 |
| Vehicle before job card (walkthrough) | Required | gs-02–05 before gs-06 |
| Combined details screen | Required | gs-08 single route |
| UUID PKs + human refs | Required | `JC-####`, `BK-####` |
| UTC storage, IST display | Required | Slot API returns timezone |
| INR minor units | Required | `amount_minor` everywhere |
| Booking snapshots immutable | Required | `booking_snapshots` insert-only |
| Idempotency on retryable writes | Required | §15.2 |
| Clients use API not PostgREST | Required | api-client only |
| Technician cannot set prices | N/A UI | No technician UI |
| Partial unique index one READY estimate | Required | §11.6 migration |
| Problem Details errors | Required | §12.10 |
| `INSPECTION_REPAIR` not in customer UI | Required | No IR routes |

**Allowed non-conformance:** GST/tax lines deferred to Phase 08; map placeholder not live geocoding.

---

## 21. Walkthrough Conformance Audit (screen-by-screen gs-*)

| Screen | Walkthrough element | Required | Verify method |
|--------|---------------------|----------|---------------|
| gs-01 | General service tab active | Yes | Visual |
| gs-01 | Hero kicker/title exact copy | Yes | §14.1 table |
| gs-01 | Policy note brand-soft | Yes | Color picker |
| gs-01 | Package ₹2,999 | Yes | API-driven display |
| gs-01 | 4 included items + chips | Yes | Catalog |
| gs-01 | Trust strip 4 items | Yes | Scroll |
| gs-01 | CTA "Start job card" | Yes | Tap → gs-02 |
| gs-02 | Segment Make active | Yes | Visual |
| gs-02 | 9-brand grid, Honda selected | Yes | Default selection |
| gs-02 | Search "Search company" | Yes | Placeholder |
| gs-03 | Honda context + City selected | Yes | Visual |
| gs-04 | Year grid 2016–2024, 2019 selected | Yes | Visual |
| gs-05 | Honda City · 2019 preview | Yes | Caption |
| gs-05 | Manual + Petrol selected | Yes | Chips |
| gs-05 | CTA "Use this car" | Yes | Creates job card |
| gs-06 | Vehicle summary card | Yes | API + draft |
| gs-06 | Concerns textarea + demo copy | Yes | Editable |
| gs-06 | Single service line ₹2,999 | Yes | API |
| gs-06 | "No repair add-ons" note | Yes | Static copy |
| gs-07 | Policy note indicative total | Yes | Banner |
| gs-07 | Included fluids chip | Yes | Estimate line |
| gs-07 | Accept + Change job card | Yes | Both buttons |
| gs-08 | Name/phone/address combined | Yes | One screen |
| gs-08 | Demo Rajesh / Koramangala | Yes | Pre-fill |
| gs-08 | Map placeholder | Yes | Static block |
| gs-09 | Subtitle ~2 hr visit | Yes | Copy |
| gs-09 | Date strip 3 days | Yes | UI |
| gs-09 | 2-col time grid, 11–13 selected | Yes | Selection style |
| gs-09 | Confirm CTA with time | Yes | Hold+book |
| gs-10 | Green checkmark 48px | Yes | Icon size |
| gs-10 | "Booking confirmed" | Yes | Title |
| gs-10 | Van assignment note | Yes | Subtitle |
| gs-10 | JC-1050 style ref | Yes | API public_ref |
| gs-10 | Summary rows | Yes | When/vehicle/address |
| gs-10 | View booking CTA | Yes | Navigation |

**Flow order:** gs-01 → gs-02 → gs-03 → gs-04 → gs-05 → gs-06 → gs-07 → gs-08 → gs-09 → gs-10 — **no skips, no advisor insert**.

**Fail criteria:** Any copy/color/navigation deviation not documented in §23 debt register.

---

## 22. Regression Audit

| Phase 02 capability | Regression check | Pass |
|--------------------|------------------|------|
| Home 4 tabs render | Open app → all tabs | ☐ |
| Catalog home API | curl §17.7 | ☐ |
| OTP login | Login → session restore | ☐ |
| GET /v1/me | Profile returns | ☐ |
| Light-blue accent tokens on home | Visual compare | ☐ |
| Admin /catalog read-only | If implemented, still loads | ☐ |
| CI lint/typecheck | Green | ☐ |

| Phase 03 must not break | Check | Pass |
|-------------------------|-------|------|
| gpr/om/sos tab bodies | Still Phase 02 placeholders | ☐ |
| Service + repair tab | Does not start Phase 03 flow | ☐ |

---

## 23. Technical Debt Review

| Debt item | Severity | Accept in Phase 03? | Paydown phase |
|-----------|----------|---------------------|---------------|
| Static vehicle catalog (not API) | Medium | Yes | Post-MVP catalog API |
| Map placeholder (no geocode) | Low | Yes | Phase 05 addresses |
| No GST line on estimate | Medium | Yes | Phase 08 |
| Global slot capacity (not per-tech) | Medium | Yes | Phase 06 dispatch |
| Guest job card before auth | Low | Yes | Document; auth at finalize |
| No orders list after book | Low | Yes | Phase 05 |
| Search on gs-01 non-functional | Low | Yes | Future search phase |
| Manual contract sync | Medium | Yes | OpenAPI codegen Phase 11 |
| Redis slot cache absent | Low | Yes | Phase 11 perf |
| Visit record not created on book | Medium | Yes | Phase 06 |
| Dev fixture refs JC-1050 sequence | Low | Yes | Production sequence config Phase 12 |

Register accepted debt in PR description.

---

## 24. Phase Exit Gate

All checkboxes required unless marked optional.

### 24.1 Backend

- [ ] Migration `20260829_0003_phase03_job_booking` applies on clean DB
- [ ] `POST /v1/job-cards` creates GENERAL_SERVICE card with vehicle context
- [ ] `POST /price` returns ₹2,999 estimate + NOT_REQUIRED advisor
- [ ] `POST /accept` transitions to FINALIZE
- [ ] `POST /finalization` requires auth; saves vehicle + address
- [ ] `GET /slots` returns bookable windows
- [ ] `POST /slot-holds` + `POST /book` create confirmed booking + snapshot
- [ ] Idempotency on accept and book verified
- [ ] Integration test `test_general_service_e2e` passes
- [ ] Customer cannot call `/v1/admin/*`

### 24.2 Mobile

- [ ] gs-01 through gs-10 implemented per §14
- [ ] Vehicle picker **before** job card (gs-02–05 → gs-06)
- [ ] Combined details screen gs-08 (not split)
- [ ] No advisor screens in flow
- [ ] `generalServiceCoordinator` routes from FlowDecision
- [ ] Manual E2E checklist §17.5 complete iOS + Android
- [ ] Phase 02 home/auth/catalog regression §22 passes

### 24.3 Contracts & CI

- [ ] `@caratom/contracts` types match API
- [ ] `pnpm typecheck` green
- [ ] `pnpm lint` green
- [ ] Backend ruff + pytest green
- [ ] CI pipeline green on PR

### 24.4 Audits

- [ ] §18 Full codebase audit complete
- [ ] §19 Vibe audit complete
- [ ] §20 Architecture audit complete
- [ ] §21 Walkthrough audit complete (all gs-* rows)
- [ ] §22 Regression audit complete
- [ ] §23 Debt registered

### 24.5 Documentation

- [ ] README updated with Phase 03 E2E instructions
- [ ] `.env.example` updated for slot config

**Exit statement:** Phase 03 complete when all §24.1–24.5 boxes checked and verification §17 executed with evidence.

---

## 25. Outputs Passed to Next Phase

### 25.1 Artifacts for Phase 04 (Service + repair + advisor)

| Artifact | Location | Use |
|----------|----------|-----|
| Job card module | `backend/app/modules/job_cards/` | Add repair items |
| Estimate versioning | `backend/app/modules/estimates/` | Revised estimates |
| FlowDecision builder | `backend/app/core/flow_decision.py` | Add REQUIRED_NOW branch |
| Job card editor UI | `app/job-card/[id]/index.tsx` | Add repair section + gpr-02 route |
| Vehicle picker | `app/vehicle/*` | Reused by gpr-03–06 |
| `repair_offerings` seed | DB from Phase 02 | gpr-02 cart |

### 25.2 Artifacts for Phase 05 (One-man + SOS + account)

| Artifact | Location | Use |
|----------|----------|-----|
| Checkout details | `app/checkout/details.tsx` | Reused om-04 |
| Slot picker | `app/checkout/slot.tsx` | Reused om-05 |
| Booking confirmation | `app/booking/[id]/index.tsx` | Reused om-06 |
| Bookings API | `GET /v1/bookings/{id}` | Orders list |
| Addresses/vehicles tables | DB | Profile management |

### 25.3 Artifacts for Phase 06 (Technician)

| Artifact | Location | Use |
|----------|----------|-----|
| `bookings` rows | DB | Create visits from confirmed bookings |
| `booking_snapshots` | DB | Technician read scope |
| Slot capacity model | `slots/service.py` | Extend for assignment |

### 25.4 Demo credentials & fixtures

| Fixture | Value |
|---------|-------|
| Test customer phone | +91 98765 43210 |
| Demo name | Rajesh Kumar |
| Demo address | 12, 5th Cross, Koramangala 5th Block |
| Demo vehicle | Honda City 2019 Petrol Manual |
| Expected total | ₹2,999 (299900 paise) |
| Sample booking ref | JC-1050 pattern |

### 25.5 API surface frozen for downstream

Phase 04+ must not break:

- `POST /v1/job-cards` request shape
- `FlowDecision` response shape
- `POST /v1/job-cards/{id}/book` idempotency semantics
- `booking_snapshots` immutability

---

## 26. Cursor Execution Instructions

### 26.1 Agent preamble

When executing Phase 03 in Cursor:

1. Read this entire document before writing code.
2. Confirm Phase 02 exit gate (§1.1) — do not start if catalog/auth missing.
3. Read [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) C1 (vehicle timing) and C3 (combined details).
4. Execute §8 tasks in order; parallel OK only where noted.
5. Embed walkthrough copy from §14 — do not paraphrase customer-facing strings.
6. Never add advisor UI or repair cart in Phase 03.
7. Run §17 verification before claiming §24 exit gate.
8. AI-generated code is unverified until pytest + manual E2E pass (Vibe §4.3).

### 26.2 Recommended workflow

```text
Step 1: Tasks 3.1–3.6   (migrations + models)
Step 2: Tasks 3.7–3.18  (backend APIs + FlowDecision)
Step 3: Tasks 3.19–3.28 (mobile screens gs-02–gs-10)
Step 4: Task 3.27       (wire gs-01 CTA)
Step 5: Tasks 3.29–3.32 (tests)
Step 6: §17 verification (API + mobile checklist)
Step 7: §18–§23 audits
Step 8: §24 exit gate
```

### 26.3 Scope discipline

| Do | Do not |
|----|--------|
| Implement gs-01→gs-10 General tab path only | Implement gpr-* or om-* booking |
| Use `flow_policy=GENERAL_SERVICE` | Infer policy from tab index |
| Vehicle picker before job card | Move vehicle to after estimate |
| Combined gs-08 details | Split customer/address screens |
| Navigate via FlowDecision | Hardcode advisor skip only in coordinator |
| Server-side pricing | Client-side total calculation |

### 26.4 File creation order

1. Alembic migration + SQLAlchemy models
2. Backend services + routers (job_cards → estimates → slots → bookings)
3. `packages/contracts` types
4. `api-client` mutation helpers
5. Mobile stores + coordinator
6. Vehicle screens gs-02–05
7. Job card + estimate gs-06–07
8. Checkout gs-08–09
9. Booking confirmed gs-10
10. Wire gs-01 CTA last (after routes exist)

### 26.5 Common failure modes

| Failure | Fix |
|---------|-----|
| Accept returns advisor required | Check job_card_items — remove repair rows |
| Finalization 401 | Expected for guest — implement OTP return path |
| Slot always unavailable | Check capacity seed + timezone IST |
| Double booking on retry | Verify Idempotency-Key middleware |
| FlowDecision ignored | Route all post-API nav through coordinator |
| Expo route not found | Register stacks in `_layout.tsx` |
| Estimate hash mismatch | Return `content_hash` from price response |
| Phase 02 home broken | Regression §22 before exit |

### 26.6 Testing commands (run before completion report)

```powershell
cd backend && uv run pytest tests/integration/test_general_service_e2e.py tests/integration/test_slot_idempotency.py -v
cd ..
pnpm --filter @caratom/customer test
pnpm typecheck
```

### 26.7 Commit guidance

Suggested messages (commit only when user requests):

```text
feat(phase-03): add job card and estimate migrations
feat(phase-03): implement pricing, slots, and booking APIs
feat(phase-03): add vehicle picker and general service flow UI
test(phase-03): general service E2E integration tests
docs(phase-03): update README with booking verification steps
```

### 26.8 Completion report template

```markdown
## Phase 03 Complete

- Exit gate: X/X checkboxes (§24)
- Integration test: test_general_service_e2e [pass/fail]
- Manual E2E: iOS [pass/fail] Android [pass/fail]
- Walkthrough audit: gs-01–gs-10 [pass/fail]
- Regression Phase 02: [pass/fail]
- Known debt: [§23 items]
- Ready for Phase 04: [yes/no]
```

### 26.9 Stop condition

**Stop after §24 exit gate passes.** Do not implement gpr-02 repair cart, advisor waiting screen, one-man booking, SOS tickets, orders list, or payments — those belong to Phases 04–08.

---

*End of PHASE-03-general-service-e2e.md*