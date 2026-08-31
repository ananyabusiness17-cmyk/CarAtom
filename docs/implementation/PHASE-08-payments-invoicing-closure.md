# PHASE 08 — Payments, Invoicing & Post-Booking Closure

**Document ID:** `PHASE-08-payments-invoicing-closure.md`  
**Version:** 1.0.0  
**Status:** Execution-ready specification  
**Depends on:** [PHASE-04-service-repair-advisor.md](./PHASE-04-service-repair-advisor.md), [PHASE-05-oneman-sos-account.md](./PHASE-05-oneman-sos-account.md), [PHASE-07-inspection-repair-loop.md](./PHASE-07-inspection-repair-loop.md) (Exit Gate §24 complete on each)  
**Unblocks:** [PHASE-11-notifications-integrations-hardening.md](./PHASE-11-notifications-integrations-hardening.md)  
**Estimated effort:** 12–18 engineer-days (single developer + Cursor agent)

**Authority chain:**

1. [`docs/architecture/01-product-constitution.md`](../architecture/01-product-constitution.md) — **server-authoritative money**; clients never settle invoices.
2. [`docs/architecture/11-screen-specifications.md`](../architecture/11-screen-specifications.md) — post-booking screen purpose, recovery, analytics (embedded inline in §14).
3. [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — visual language for Orders tab; booking detail/invoice/payment/review derive from architecture where walkthrough is silent ([`AUDIT-REPORT.md`](../AUDIT-REPORT.md) I5).
4. Architecture docs **04, 07, 08, 09, 13, 14, 16** — state machines, invoice/payment service, API contracts, error recovery, security.

**Critical glossary (repeat in code review):**

> **Server-authoritative money:** Only the FastAPI backend (via verified Razorpay webhooks or audited admin offline commands) may transition `Payment` → `CAPTURED` and `Invoice` → `PAID`. The mobile client may show Razorpay success UI but MUST display `PAYMENT_VERIFICATION_PENDING` until `GET /v1/payments/{id}` confirms server truth.  
> **Invoice ≠ Estimate:** Final invoice lines derive from approved scope + actual fitted parts/labour + tax policy — not a copy-paste of the pre-booking estimate.  
> **Parts advance vs balance:** Inspection + Repair (Phase 07) may require `PARTS_PAYMENT_REQUIRED` before visit 2; Phase 08 implements generic payment allocation against invoice purposes (`PARTS_ADVANCE`, `BALANCE`, `FULL`).

---

## 0. Phase Summary

### Objective

Close the customer money and post-booking loop: **booking detail/progress**, **invoice issuance + PDF**, **Razorpay payment-order + webhook reconciliation**, **review/rating**, and **in-app notifications read**. All financial state transitions remain **server-authoritative**; clients render `allowed_actions[]` and `customer_progress` from the API.

Phase 08 completes the customer surfaces missing from the walkthrough (AUDIT I5) using architecture screen specs with walkthrough visual language (light-blue accent tokens, card/list patterns, chip statuses).

### What Phase 08 delivers

| ID | Deliverable | Description |
|----|-------------|-------------|
| P08-A | Invoice domain | `InvoiceService` derives final lines from completed visits; states per §04; immutable line snapshots |
| P08-B | Invoice PDF | ARQ worker renders PDF → Supabase Storage; signed download URL on invoice DTO |
| P08-C | Razorpay adapter | Create order (`POST /payment-order`), verify webhook signature, idempotent event processing |
| P08-D | Payment reconciliation | `payments` + `payment_events`; allocation to invoice; `PAYMENT_VERIFICATION_PENDING` UX |
| P08-E | Booking detail/progress | `GET /v1/bookings/{id}` enriched `customer_progress`, visits, next action, deep links |
| P08-F | Orders list enhancement | Paginated summaries with status chip + next action hint (walkthrough `orders` screen) |
| P08-G | Invoice & payment UI | Line items, tax, balance, pay CTA, download/share; never local paid state |
| P08-H | Review/rating | `POST /v1/reviews` idempotent per booking; star UI with numeric a11y labels |
| P08-I | Notifications read | `GET /v1/me/notifications` cursor list; mark read; deep link to booking/invoice |
| P08-J | DB tables | `invoices`, `invoice_line_items`, `payments`, `payment_events`, `refunds`, `reviews`, `notifications` |
| P08-K | Contracts + tests | OpenAPI DTOs; webhook integration tests; duplicate event idempotency; E2E payment happy path |

### What Phase 08 explicitly does NOT deliver

| Item | Phase |
|------|-------|
| Push notification delivery (Expo Push worker) | 11 |
| SMS/WhatsApp provider integration | 11 |
| Admin offline payment UI (`Record offline payment`) | 09 |
| Admin refund/void workflows beyond API stubs | 09 |
| Full vehicle service history timeline UI | 11 (API seed OK) |
| GST registration/legal invoice numbering compliance review | 12 |
| Production Razorpay live keys / Railway deploy | 12 |
| Inventory consumption reconciliation | 09 |
| Rate limiting production tuning | 12 |

### Canonical post-booking journeys (Phase 08)

```text
General Service / One-man (single visit, balance due at end):
  orders → booking-detail (VISIT_IN_PROGRESS → COMPLETED → PAYMENT_DUE)
    → invoice-payment → Razorpay → webhook CAPTURED → PAID
    → review-rating → thank-you

General Service + repairs (completed after service visit):
  Same as above; invoice includes advisor-approved repair lines + fitted parts

Inspection + Repair (two visits, parts advance optional):
  booking-detail (PARTS_PAYMENT_REQUIRED) → partial pay → REPAIR_BOOKING_REQUIRED
    → visit 2 → COMPLETED → balance invoice → pay → review

Notification deep link:
  notifications → tap "Invoice ready" → invoice-payment
  notifications → tap "Rate your service" → review-rating
```

### Success statement

At Phase 08 exit, a customer with a **completed** booking can open Orders, see accurate progress, view a server-issued invoice with PDF download, pay the balance via Razorpay test mode, observe **verification pending** until webhook confirms, land on **Paid** state from API poll, submit a 5-star review once, and read/mark notifications. Duplicate webhooks do not double-allocate. Integration tests prove the server rejects client attempts to mark invoices paid. Phase 04–07 booking flows remain regression-clean.

---

## 1. Starting State

### 1.1 Prerequisite exit gates (must be true)

| Prerequisite | Source phase | Verification |
|--------------|--------------|--------------|
| Bookings exist in `CONFIRMED` → `COMPLETED` paths | 03–07 | Seed fixture `JC-1042`, `JC-0991` |
| Visits complete via technician app | 06 | `POST .../complete` integration test |
| Inspection + Repair two-visit flow issues final invoice trigger | 07 | Visit 2 complete → invoice DRAFT |
| Orders list stub navigates | 05 | `app/(tabs)/orders.tsx` renders cards |
| Profile links to orders | 05 | Profile hub row |
| `GET /v1/bookings/{id}` basic shape | 03+ | Returns booking + snapshot |
| Outbox table exists (may be empty) | 04 | Migration present |
| Razorpay env vars documented in `.env.example` | 01 | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Light-blue accent tokens | 02 | `#5DB7E8` primary |

### 1.2 Repository state at Phase 08 start

```text
apps/customer/
  app/(tabs)/orders.tsx           # Walkthrough cards; tap → stub detail
  app/booking/[id].tsx            # Missing or placeholder
  app/invoice/[id].tsx            # Missing
  app/review/[bookingId].tsx      # Missing
  app/notifications.tsx           # Missing or stub
backend/app/modules/
  bookings/                       # GET list/detail; no customer_progress composer
  visits/                         # Complete transitions from Phase 06
  invoices/                       # Missing
  payments/                       # Missing
  reviews/                        # Missing
  notifications/                  # Missing or write-only outbox stub
packages/contracts/               # Booking types; no Invoice/Payment/Review/Notification
```

**Absent at start:**

- `invoices`, `invoice_line_items`, `payments`, `payment_events`, `refunds`, `reviews` tables
- Razorpay SDK integration (Python + React Native)
- Webhook route `POST /v1/payments/webhook/razorpay`
- Invoice PDF generation pipeline
- `customer_progress` composer on booking detail
- Payment verification pending UI state
- Notification read endpoints

### 1.3 Walkthrough vs architecture resolution (apply in Phase 08)

| Topic | Winning rule | Phase 08 implementation |
|-------|--------------|-------------------------|
| Post-booking screens | Architecture wins (AUDIT I5) | §14 embeds `11-screen-specifications` post-booking block |
| Orders list visual | Walkthrough wins | JC-1042 / JC-0991 card pattern from HTML |
| Money authority | Constitution + §04 Payment SM | Webhook-only capture; client poll |
| Invoice copy | Architecture: derived lines | Show fitted parts/labour from visit records |
| Offline payment | Admin-only (Phase 09) | Customer UI shows note if `payment_method=OFFLINE` on DTO |
| Notification delivery | Phase 11 | Phase 08: in-app list + read state only; seed rows via outbox/dev |

---

## 2. Desired End State

After Phase 08 passes the Exit Gate (§24), the repository MUST include:

```text
apps/customer/
  app/(tabs)/orders.tsx                 # Paginated booking summaries
  app/booking/[id].tsx                  # Detail + progress stepper
  app/invoice/[invoiceId].tsx           # Invoice + payment flow
  app/review/[bookingId].tsx            # Star rating + optional comment
  app/notifications.tsx                 # Cursor list + mark read
  src/features/booking/
    useBookingDetail.ts
    BookingProgressStepper.tsx
  src/features/payments/
    usePaymentOrder.ts
    RazorpayCheckout.tsx                # Wrapper; verification pending handling
    PaymentStatusBanner.tsx
  src/features/reviews/
    ReviewForm.tsx
  src/features/notifications/
    NotificationList.tsx
backend/app/modules/
  invoices/
    router.py, service.py, pdf_worker.py, models.py, repository.py
  payments/
    router.py, service.py, razorpay_client.py, webhook.py, models.py
  reviews/
    router.py, service.py, models.py
  notifications/
    router.py, service.py, models.py
  bookings/
    progress_composer.py                # customer_progress derivation
backend/alembic/versions/
  20260829_0008_phase08_money_closure.py
backend/tests/
  integration/test_razorpay_webhook.py
  integration/test_invoice_payment_e2e.py
  integration/test_review_idempotency.py
packages/contracts/src/
  invoice.ts, payment.ts, review.ts, notification.ts, customer-progress.ts
packages/api-client/src/
  payments.ts, invoices.ts, reviews.ts, notifications.ts
```

**Runtime capabilities:**

- Completed booking auto-triggers invoice issuance (or admin/manual trigger in dev simulate)
- Customer pays via Razorpay Checkout; webhook idempotent
- PDF stored at `invoices/{id}/invoice.pdf` in Supabase Storage
- Review one-per-booking enforced at DB + API
- Notifications readable with `read_at` timestamp

---

## 3. Why This Phase Exists Here

Phase 08 sits after **operational execution** (Phases 06–07) and **booking creation** (Phases 03–05) because:

1. **Invoices require truth from the field** — fitted parts, labour, QC completion must exist before final lines are derived ([`07-backend-architecture.md`](../architecture/07-backend-architecture.md) Invoice/payment service).
2. **Money must not precede fulfillment policy** — paying a balance before visit completion would violate operational gates; `customer_progress` exposes `PAYMENT_DUE` only when invoice is `ISSUED` and booking operational state allows.
3. **Razorpay webhooks need a running API** — Phase 01 stubbed env vars; Phase 08 implements the adapter with signature verification ([`14-security.md`](../architecture/14-security.md)).
4. **Post-booking UX completes the customer loop** — walkthrough ends at confirmation; architecture defines detail/invoice/review/notifications ([`AUDIT-REPORT.md`](../AUDIT-REPORT.md) I5).
5. **Phase 11 hardening assumes money paths exist** — push notifications for `payment_verified` and deep links target Phase 08 routes.

**Risk if skipped:** Clients invent paid state from Razorpay callbacks; duplicate charges on webhook retry; invoices copied from estimates; reviews duplicated; operations cannot reconcile payments.

---

## 4. Source Material

| Source | Use in Phase 08 |
|--------|-----------------|
| [`04-state-machines.md`](../architecture/04-state-machines.md) | Invoice, Payment, customer_progress states |
| [`07-backend-architecture.md`](../architecture/07-backend-architecture.md) | InvoiceService, PaymentService, outbox |
| [`08-data-model.md`](../architecture/08-data-model.md) | Financial tables, snapshots, indexes |
| [`09-api-contracts.md`](../architecture/09-api-contracts.md) | Customer money endpoints |
| [`11-screen-specifications.md`](../architecture/11-screen-specifications.md) | Post-booking screens — **embedded inline §14** |
| [`13-error-recovery.md`](../architecture/13-error-recovery.md) | Payment failure/verification pending |
| [`14-security.md`](../architecture/14-security.md) | Webhook signatures, no client paid transition |
| [`15-testing-strategy.md`](../architecture/15-testing-strategy.md) | Webhook reconciliation tests |
| [`16-analytics.md`](../architecture/16-analytics.md) | `invoice_viewed`, `payment_*`, `review_*` events |
| [`18-implementation-roadmap.md`](../architecture/18-implementation-roadmap.md) | Phase 7 money closure |
| [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) | I5 post-booking gap; server money authority |
| [`CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) | Orders tab cards, profile link |
| [`PHASE-03-general-service-e2e.md`](./PHASE-03-general-service-e2e.md) | Booking aggregate, snapshots |
| [`PHASE-07-inspection-repair-loop.md`](./PHASE-07-inspection-repair-loop.md) | Parts advance, two-visit progress |
| [`README.md`](./README.md) | Phase dependency graph |

---

## 5. Architectural Context

### 5.1 Phase 08 money flow (server-authoritative)

```mermaid
sequenceDiagram
  participant C as Customer App
  participant API as FastAPI
  participant RZ as Razorpay
  participant WRK as ARQ Worker
  participant ST as Supabase Storage

  Note over API: Visit COMPLETED → Invoice ISSUED
  WRK->>ST: Upload invoice PDF
  C->>API: GET /bookings/{id}/invoice
  API-->>C: Invoice ISSUED + pdf_url + allowed_actions PAY
  C->>API: POST /invoices/{id}/payment-order
  API->>RZ: orders.create(amount, receipt)
  API-->>C: razorpay_order_id, key_id, payment_id PENDING
  C->>RZ: Checkout UI
  RZ-->>C: checkout success callback
  Note over C: UI = VERIFICATION_PENDING only
  RZ->>API: POST /webhook/razorpay (signed)
  API->>API: Verify HMAC, idempotent event insert
  API->>API: Payment CAPTURED, allocate invoice
  C->>API: GET /payments/{id} poll
  API-->>C: CAPTURED, Invoice PAID
  C->>C: Show success; offer review
```

### 5.2 Trust boundaries for money

```text
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT ZONE — Expo customer app                                  │
│  - RAZORPAY_KEY_ID (public) only                                  │
│  - May display Razorpay checkout result                           │
│  - MUST NOT PATCH invoice/payment status                          │
│  - MUST poll GET /payments/{id} after checkout                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS + JWT
┌────────────────────────────▼─────────────────────────────────────┐
│  API ZONE — FastAPI                                               │
│  - Creates Razorpay orders; owns Payment rows                     │
│  - Webhook: signature verify + idempotency                        │
│  - Sole writer of CAPTURED / Invoice PAID                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  PROVIDER ZONE — Razorpay                                         │
│  - order_id, payment_id, webhook events                           │
│  - Source of truth for provider capture (via verified webhook)    │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 customer_progress composition

The API composes `customer_progress` read-only from linked aggregates ([`04-state-machines.md`](../architecture/04-state-machines.md)):

| Progress key | Typical triggers | Customer next action |
|--------------|------------------|----------------------|
| `BOOKING_CONFIRMED` | Post book | View detail; wait for visit |
| `VISIT_IN_PROGRESS` | Technician check-in | View ETA if exposed |
| `PARTS_PAYMENT_REQUIRED` | Inspection approved, advance due | Pay parts advance |
| `REPAIR_BOOKING_REQUIRED` | Parts paid + ready | Book visit 2 (Phase 07) |
| `COMPLETED` | All visits QC passed | Rate service |
| `PAYMENT_DUE` | Invoice ISSUED, balance > 0 | Pay invoice |
| `PAYMENT_VERIFICATION_PENDING` | Checkout returned, webhook pending | Wait / poll |
| `PAID` | Invoice PAID | Download PDF; review if not submitted |

Composer lives in `bookings/progress_composer.py`; unit-tested with fixture aggregates.

### 5.4 Invoice derivation (not estimate copy)

```text
InvoiceService.issue(booking_id):
  1. Assert booking operational COMPLETED (or admin override flag in dev)
  2. Load accepted estimate snapshot for labels/reference
  3. Load actual job_parts + job_labour from completed visit(s)
  4. Apply pricing policy: tax, fees, rounding (GST fixture 18% demo)
  5. Subtract prior PARTS_ADVANCE allocations
  6. Persist invoice + line_items (immutable snapshots)
  7. Transition DRAFT → ISSUED; enqueue PDF job + notification outbox
```

### 5.5 Payment allocation rules

| Purpose | When created | Allocates to |
|---------|--------------|--------------|
| `FULL` | Single-pay flows (One-man) | Entire invoice |
| `PARTS_ADVANCE` | Inspection + Repair gate | Partial; invoice may stay PARTIALLY_PAID |
| `BALANCE` | After visit completion | Remaining balance_minor |

One active `PENDING`/`AUTHORIZED` payment per (invoice_id, purpose) at a time; new order after `FAILED` or expiry.

---

## 6. Exact Implementation Scope + Out of Scope

### 6.1 In scope (MUST implement)

| ID | Requirement |
|----|-------------|
| S1 | Alembic migration: invoices, invoice_line_items, payments, payment_events, refunds, reviews, notifications |
| S2 | `InvoiceService.issue`, `get_for_booking`, state transitions per §04 |
| S3 | PDF generation worker; Supabase signed URL on DTO |
| S4 | `POST /v1/invoices/{id}/payment-order` creates Razorpay order + Payment PENDING |
| S5 | `POST /v1/payments/webhook/razorpay` HMAC verify + idempotent processing |
| S6 | `GET /v1/payments/{id}` for client poll; includes `verification_status` |
| S7 | `GET /v1/bookings/{id}` includes `customer_progress`, visits summary, `allowed_actions` |
| S8 | `GET /v1/bookings` cursor list for Orders tab |
| S9 | `GET /v1/bookings/{id}/invoice` |
| S10 | `POST /v1/reviews` idempotent; one review per booking |
| S11 | `GET /v1/me/notifications` + `PATCH /v1/me/notifications/{id}/read` |
| S12 | Customer mobile: orders, booking detail, invoice/payment, review, notifications screens per §14 |
| S13 | Razorpay React Native checkout wrapper with verification pending UX |
| S14 | Integration tests: webhook duplicate, payment fail, review duplicate |
| S15 | Contracts Zod schemas for all new DTOs |
| S16 | Analytics events per §16 for money funnel |
| S17 | Error codes: `PAYMENT_FAILED`, `PAYMENT_VERIFICATION_PENDING`, `PAYMENT_ALREADY_SETTLED` |

### 6.2 Out of scope (MUST NOT implement in Phase 08)

| Item | Reason |
|------|--------|
| Admin payments desk UI | Phase 09 |
| Push notification send | Phase 11 |
| Refund execution (Razorpay refund API) | Phase 09; stub `refunds` table OK |
| Live production Razorpay | Phase 12 |
| Client-side invoice total calculation | Violates constitution |
| Mark invoice paid on checkout callback | Violates constitution |
| Technician selling price edit | Forbidden all phases |
| PostgREST direct writes | Forbidden all phases |

### 6.3 Boundary rules

- **Webhook route:** No JWT; `X-Razorpay-Signature` required; reject missing/invalid with 400/401.
- **Payment order amount:** Always from server `invoice.balance_minor`; client-supplied amounts ignored.
- **PDF URL:** Short-lived signed URL; regenerate on each GET if expired.
- **Reviews:** Only when `customer_progress` in (`COMPLETED`, `PAID`) and visit completed; optional admin moderation flag stored but no UI.
- **Notifications:** Phase 08 implements read model; creating notifications via outbox/dev seed only.

---

## 7. Repository Changes

### 7.1 New files (minimum)

```text
backend/app/modules/invoices/
  __init__.py
  models.py
  schemas.py
  repository.py
  service.py
  router.py
  pdf_renderer.py
  tasks.py
backend/app/modules/payments/
  __init__.py
  models.py
  schemas.py
  repository.py
  service.py
  router.py
  webhook.py
  razorpay_client.py
backend/app/modules/reviews/
  __init__.py
  models.py
  schemas.py
  repository.py
  service.py
  router.py
backend/app/modules/notifications/
  __init__.py
  models.py
  schemas.py
  repository.py
  service.py
  router.py
backend/app/modules/bookings/progress_composer.py
backend/tests/integration/test_phase08_payments.py
backend/tests/integration/test_phase08_webhook_idempotency.py
backend/tests/unit/test_progress_composer.py
packages/contracts/src/invoice.ts
packages/contracts/src/payment.ts
packages/contracts/src/review.ts
packages/contracts/src/notification.ts
packages/contracts/src/customer-progress.ts
apps/customer/app/booking/[id].tsx
apps/customer/app/invoice/[invoiceId].tsx
apps/customer/app/review/[bookingId].tsx
apps/customer/app/notifications.tsx
apps/customer/src/features/payments/RazorpayCheckout.tsx
```

### 7.2 Modified files

```text
backend/app/main.py                          # Include routers
backend/app/config.py                        # Razorpay settings
backend/.env.example                         # Razorpay keys
apps/customer/.env.example                   # EXPO_PUBLIC_RAZORPAY_KEY_ID
apps/customer/app/(tabs)/orders.tsx            # Wire API + navigation
apps/customer/app/(tabs)/profile.tsx           # Link notifications
apps/customer/package.json                   # react-native-razorpay or expo compatible SDK
packages/contracts/src/index.ts              # Re-exports
packages/api-client/src/index.ts             # New resource clients
backend/app/modules/bookings/router.py       # Enriched detail + list
backend/app/modules/bookings/service.py      # Progress attachment
backend/app/modules/visits/service.py        # Hook invoice issue on complete (where policy allows)
.github/workflows/ci.yml                     # Razorpay webhook test job (mock)
docs/implementation/README.md                # Link Phase 08 (if not already)
```

### 7.3 Environment variables

| Variable | Where | Phase 08 usage |
|----------|-------|----------------|
| `RAZORPAY_KEY_ID` | backend + customer public | Order create + Checkout |
| `RAZORPAY_KEY_SECRET` | backend only | API auth |
| `RAZORPAY_WEBHOOK_SECRET` | backend only | Signature verify |
| `RAZORPAY_MODE` | backend | `test` or `live` |
| `INVOICE_PDF_BUCKET` | backend | Supabase storage bucket name |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | customer | Checkout UI |

---

## 8. Detailed Implementation Sequence (Task 8.X)

Execute in order unless noted **parallel OK**. Verify each task before marking complete.

### Block A — Database & domain models (Days 1–3)

#### Task 8.1 — Alembic migration: invoices

Create `20260829_0008_phase08_money_closure.py` (part 1):

**`invoices` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| booking_id | UUID FK → bookings | UNIQUE where not VOID |
| invoice_number | TEXT UNIQUE | Human `INV-2026-000042` |
| status | ENUM | DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID |
| currency | CHAR(3) | Default INR |
| subtotal_minor | BIGINT | |
| tax_minor | BIGINT | |
| total_minor | BIGINT | |
| paid_minor | BIGINT | Default 0 |
| balance_minor | BIGINT | Generated or maintained |
| issued_at | TIMESTAMPTZ | |
| pdf_storage_path | TEXT nullable | |
| version | INT | Optimistic lock |
| created_at, updated_at | TIMESTAMPTZ | |

**`invoice_line_items` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK | |
| sort_order | INT | |
| kind | ENUM | SERVICE, PART, LABOUR, FEE, DISCOUNT, TAX |
| label | TEXT | Snapshot label |
| quantity | NUMERIC(10,2) | |
| unit_price_minor | BIGINT | |
| amount_minor | BIGINT | |
| metadata | JSONB | SKU refs, visit_id |

**Verify:** `\d invoices`; cannot insert duplicate invoice_number.

#### Task 8.2 — Alembic migration: payments

**`payments` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK | |
| purpose | ENUM | FULL, PARTS_ADVANCE, BALANCE |
| status | ENUM | PENDING, AUTHORIZED, CAPTURED, FAILED, CANCELLED |
| amount_minor | BIGINT | |
| currency | CHAR(3) | |
| provider | ENUM | RAZORPAY |
| provider_order_id | TEXT UNIQUE nullable | |
| provider_payment_id | TEXT UNIQUE nullable | |
| idempotency_key | TEXT UNIQUE | From client header |
| expires_at | TIMESTAMPTZ nullable | Order expiry |
| captured_at | TIMESTAMPTZ nullable | |
| failure_reason | TEXT nullable | Safe customer message |

**`payment_events` table (append-only webhook log):**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_id | UUID FK nullable | Linked after match |
| provider_event_id | TEXT UNIQUE | Idempotency key |
| event_type | TEXT | e.g. `payment.captured` |
| payload | JSONB | Raw webhook body |
| signature_valid | BOOL | |
| processed_at | TIMESTAMPTZ | |
| processing_result | TEXT | success, duplicate, ignored |

**`refunds` table (stub for Phase 09):**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_id | UUID FK | |
| amount_minor | BIGINT | |
| status | ENUM | REQUESTED, COMPLETED, FAILED |
| provider_refund_id | TEXT UNIQUE nullable | |

**Verify:** Unique indexes on provider ids; FK cascade restrict.

#### Task 8.3 — Alembic migration: reviews + notifications

**`reviews` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| booking_id | UUID FK UNIQUE | One per booking |
| profile_id | UUID FK | |
| rating | SMALLINT | 1–5 CHECK |
| comment | TEXT nullable | Max 2000 chars |
| submitted_at | TIMESTAMPTZ | |

**`notifications` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| profile_id | UUID FK | |
| kind | ENUM | BOOKING, ESTIMATE, ADVISOR, PAYMENT, VISIT, REVIEW_PROMPT |
| title | TEXT | |
| body | TEXT | No PII beyond first name |
| deep_link | TEXT | `caratom://booking/{id}` etc. |
| resource_type | TEXT nullable | booking, invoice, payment |
| resource_id | UUID nullable | |
| read_at | TIMESTAMPTZ nullable | |
| created_at | TIMESTAMPTZ | |

Index: `(profile_id, created_at DESC)` for cursor pagination.

**Verify:** Cannot insert second review for same booking_id.

#### Task 8.4 — SQLAlchemy models + repositories

Implement ORM + repositories for all new tables. Repository methods:

- `InvoiceRepository.get_by_booking`, `issue`, `apply_payment_allocation`
- `PaymentRepository.create_order`, `mark_captured`, `get_by_provider_order_id`
- `PaymentEventRepository.insert_idempotent`
- `ReviewRepository.upsert_for_booking`
- `NotificationRepository.list_for_profile`, `mark_read`

**Verify:** `pytest backend/tests/unit/test_phase08_models_import.py`

### Block B — Backend services (Days 3–8)

#### Task 8.5 — InvoiceService.issue

Trigger: visit completion handler OR dev command `POST /v1/dev/simulate/issue-invoice`.

Logic per §5.4. Demo fixture totals:

- JC-1042 (General + repairs): subtotal ₹8,450 + GST → total ₹9,971 (example)
- JC-0991 (One-man): total ₹1,499

Returns Invoice DTO with `allowed_actions: [VIEW_PDF, PAY_BALANCE]` when balance > 0.

**Verify:** pytest `test_invoice_derived_from_fitted_parts_not_estimate_only`.

#### Task 8.6 — PDF renderer + ARQ task

`pdf_renderer.py` using ReportLab or WeasyPrint (choose one; document in ADR if new dep):

- Header: CARATOM logo text, invoice number, date
- Bill-to: snapshot customer name, phone masked, address
- Vehicle: registration, make/model
- Line items table
- Tax breakdown
- Footer: warranty placeholder, support contact

`tasks.generate_invoice_pdf(invoice_id)` uploads to Supabase Storage; updates `pdf_storage_path`.

**Verify:** Worker run produces PDF; GET invoice returns `pdf_download_url` signed 15 min.

#### Task 8.7 — Razorpay client + PaymentService.create_order

```python
# razorpay_client.py
def create_order(*, amount_minor: int, currency: str, receipt: str, notes: dict) -> RazorpayOrder:
    ...
```

`PaymentService.create_payment_order(invoice_id, purpose, idempotency_key, profile_id)`:

1. Load invoice; verify profile owns booking
2. Compute payable amount for purpose (balance or advance)
3. Reject if `PAYMENT_ALREADY_SETTLED`
4. Reuse existing PENDING order if not expired (idempotent)
5. Call Razorpay; insert Payment PENDING
6. Return `{ payment_id, razorpay_order_id, amount_minor, key_id, expires_at }`

**Verify:** pytest with mocked Razorpay client; amount always from server.

#### Task 8.8 — Webhook handler

`POST /v1/payments/webhook/razorpay`:

1. Read raw body bytes (required for signature)
2. Verify `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`
3. Parse event; insert `payment_events` with `provider_event_id` — on conflict return 200 duplicate
4. Handle `payment.captured`, `payment.failed`, `order.paid` (map to internal transitions)
5. On capture: Payment → CAPTURED; allocate `paid_minor` on invoice; transition invoice status
6. Enqueue notification outbox: `payment_verified`
7. Return 200 quickly; heavy work OK in same request for MVP if < 2s

**Verify:** Integration test fires same event twice → single allocation.

#### Task 8.9 — progress_composer

`compose_customer_progress(booking, visits, invoice, payments, review) -> CustomerProgress`

Include:

- `progress_key` enum
- `headline` string (customer safe)
- `subheadline` optional
- `steps[]` with `{ key, label, status: pending|active|done }`
- `primary_action` matching `allowed_actions[0]` when present

**Verify:** Unit tests for GS complete unpaid, IR parts advance, paid + review pending.

#### Task 8.10 — Booking routes enrichment

`GET /v1/bookings?cursor=&limit=` — summary DTO:

```json
{
  "id": "...",
  "public_ref": "JC-1042",
  "title": "General servicing + repairs",
  "status_chip": "Scheduled",
  "subtitle": "Wed 11:00 · Honda City",
  "customer_progress": "BOOKING_CONFIRMED",
  "next_action_hint": "View details"
}
```

`GET /v1/bookings/{id}` — full detail + progress stepper payload.

**Verify:** Customer A cannot GET customer B booking (403).

#### Task 8.11 — Review + Notification routes

`POST /v1/reviews`:

```json
{
  "booking_id": "...",
  "rating": 5,
  "comment": "Technician was on time and explained everything."
}
```

Idempotency-Key supported; duplicate returns 200 same review.

`GET /v1/me/notifications?cursor=` — cursor paginated.

`PATCH /v1/me/notifications/{id}/read` — sets `read_at=now()`.

Optional: `POST /v1/me/notifications/mark-all-read`.

**Verify:** Review before visit complete → 409 `BOOKING_NOT_REVIEWABLE`.

### Block C — Contracts & API client (Days 7–9)

#### Task 8.12 — TypeScript contracts

Add Zod schemas:

- `InvoiceSchema`, `InvoiceLineItemSchema`
- `PaymentSchema`, `PaymentOrderCreateResponseSchema`
- `ReviewSchema`, `ReviewCreateRequestSchema`
- `NotificationSchema`, `NotificationListSchema`
- `CustomerProgressSchema`, `BookingDetailSchema`

Export from `@caratom/contracts`.

**Verify:** `pnpm --filter @caratom/contracts typecheck`

#### Task 8.13 — API client methods

```typescript
getBooking(id: string): Promise<BookingDetail>
listBookings(cursor?: string): Promise<PaginatedBookings>
getBookingInvoice(bookingId: string): Promise<Invoice>
createPaymentOrder(invoiceId: string, purpose: PaymentPurpose, idempotencyKey: string): Promise<PaymentOrderResponse>
getPayment(id: string): Promise<Payment>
submitReview(body: ReviewCreateRequest, idempotencyKey: string): Promise<Review>
listNotifications(cursor?: string): Promise<NotificationList>
markNotificationRead(id: string): Promise<Notification>
```

**Verify:** Manual fetch against local API.

### Block D — Customer mobile UI (Days 8–14)

#### Task 8.14 — Orders tab (enhance Phase 05 stub)

Wire `GET /v1/bookings`; render walkthrough card pattern (§14.1). Pull-to-refresh. Empty state: browse services CTA.

**Verify:** Visual match §14.1; tap navigates to booking detail.

#### Task 8.15 — Booking detail screen

Implement §14.2–§14.4 progress variants. Poll every 30s when `VISIT_IN_PROGRESS` (or use focus refetch).

**Verify:** Progress stepper has textual state for screen readers.

#### Task 8.16 — Invoice & payment screen

Implement §14.3. Integrate RazorpayCheckout:

1. Tap Pay → POST payment-order
2. Open Razorpay with returned order id
3. On success callback → show Verification pending banner; poll GET payment every 2s max 30s
4. On CAPTURED → show Paid; enable review CTA
5. On FAILED → retry with new order (server confirms prior failed)

**Verify:** Airplane mode after callback shows pending, not paid.

#### Task 8.17 — Review screen

Implement §14.4. Star row with accessibilityLabel "3 stars". Skip → back to booking detail.

**Verify:** Submit twice with same idempotency key → one review.

#### Task 8.18 — Notifications screen

Implement §14.5. Unread dot on profile row badge count optional.

**Verify:** Mark read persists on reload.

### Block E — Tests, docs, audits (Days 14–16)

#### Task 8.19 — Integration test suite

Files:

- `test_phase08_webhook_idempotency.py`
- `test_phase08_payment_e2e.py` (mock Razorpay)
- `test_phase08_invoice_derivation.py`
- `test_phase08_review_idempotency.py`

**Verify:** `uv run pytest backend/tests -q` green.

#### Task 8.20 — Dev fixtures + simulate commands

Extend dev seed:

- Booking JC-1042 COMPLETED with unpaid invoice
- Booking JC-0991 COMPLETED paid (for review-only path)
- 3 notifications (1 unread payment, 1 unread review prompt, 1 read)

`POST /v1/dev/simulate/razorpay-webhook` for local webhook without ngrok (test env only).

**Verify:** Fresh db seed → customer login sees orders.

#### Task 8.21 — §17–§23 audits

Run verification procedure, fill audit tables, register debt.

**Verify:** §24 exit gate checkboxes complete.

---

## 9. Mobile Implementation (customer post-booking surfaces)

### 9.1 Route map

| Screen | Expo Router path | Params |
|--------|------------------|--------|
| Orders list | `app/(tabs)/orders.tsx` | — |
| Booking detail | `app/booking/[id].tsx` | `id` = booking UUID |
| Invoice & payment | `app/invoice/[invoiceId].tsx` | `invoiceId`; optional `?bookingId=` back stack |
| Review | `app/review/[bookingId].tsx` | `bookingId` |
| Notifications | `app/notifications.tsx` | modal or stack from profile |

Deep links (Phase 11 prep; register in app.json now):

```text
caratom://booking/{id}
caratom://invoice/{invoiceId}
caratom://review/{bookingId}
caratom://notifications
```

### 9.2 State management

- TanStack Query for all GETs; staleTime 30s on booking detail
- Payment poll: `refetchInterval` 2000 while `verification_status === PENDING`
- No Zustand for payment state — server DTO is source of truth
- Optimistic UI **only** for notification mark-read (rollback on error)

### 9.3 RazorpayCheckout component

```typescript
// apps/customer/src/features/payments/RazorpayCheckout.tsx
export function RazorpayCheckout(props: {
  order: PaymentOrderResponse;
  onVerificationPending: (paymentId: string) => void;
  onCheckoutDismissed: () => void;
}) {
  // Uses react-native-razorpay or Expo config plugin compatible package
  // NEVER calls any "mark paid" API
}
```

Expo SDK 52 compatibility: verify chosen package against `npx expo-doctor`; pin version in ADR if needed.

### 9.4 Accessibility

- Invoice total: `accessibilityLabel="Total amount 9,971 rupees"`
- Progress stepper: each step has `accessibilityState={{ selected: isActive }}`
- Stars: `accessibilityRole="button"` + numeric label
- Payment pending banner: `accessibilityLiveRegion="polite"`

### 9.5 Error recovery UI ([`13-error-recovery.md`](../architecture/13-error-recovery.md))

| Code | UI |
|------|-----|
| `PAYMENT_FAILED` | Red banner + "Try again" (creates new order) |
| `PAYMENT_VERIFICATION_PENDING` | Amber banner + spinner + auto poll |
| `PAYMENT_ALREADY_SETTLED` | Navigate to paid receipt state |
| Invoice load fail | Retry + support link |

---

## 10. Backend Implementation (FastAPI modules)

### 10.1 Module layout

```text
invoices/
  router.py       # GET invoice, admin stub void deferred
  service.py      # issue, allocate, pdf URL
  pdf_renderer.py
  tasks.py        # ARQ enqueue
payments/
  router.py       # payment-order, get payment
  webhook.py      # razorpay webhook
  service.py
  razorpay_client.py
reviews/
  router.py
  service.py
notifications/
  router.py
  service.py
bookings/
  progress_composer.py
```

### 10.2 Router registration

```python
# main.py
app.include_router(invoices_router, prefix="/v1")
app.include_router(payments_router, prefix="/v1")
app.include_router(reviews_router, prefix="/v1")
app.include_router(notifications_router, prefix="/v1")
# webhook at /v1/payments/webhook/razorpay — no JWT dependency
```

### 10.3 Auth dependencies

| Route | Auth |
|-------|------|
| Customer invoice/payment/review/notifications | `require_customer` |
| Webhook | Signature only |
| Dev simulate | `require_dev_env` |

### 10.4 Transaction boundaries

`webhook.process_event` wraps in DB transaction:

1. Insert payment_event (unique provider_event_id)
2. Update payment row
3. Update invoice allocation
4. Insert outbox notification row

Commit once; rollback on any error except duplicate event (return 200).

### 10.5 Invoice issue hook

In `visits/service.py` `complete_visit`:

```python
if booking.all_visits_complete() and policy.should_auto_issue_invoice(booking):
    invoice_service.issue_for_booking(booking.id)
```

Policy: auto-issue for GS, One-man, IR visit 2 complete; not after inspection-only visit.

---

## 11. Database Implementation

### 11.1 Enum types (PostgreSQL)

```sql
CREATE TYPE invoice_status AS ENUM ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','VOID');
CREATE TYPE invoice_line_kind AS ENUM ('SERVICE','PART','LABOUR','FEE','DISCOUNT','TAX');
CREATE TYPE payment_status AS ENUM ('PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED');
CREATE TYPE payment_purpose AS ENUM ('FULL','PARTS_ADVANCE','BALANCE');
CREATE TYPE payment_provider AS ENUM ('RAZORPAY');
CREATE TYPE notification_kind AS ENUM ('BOOKING','ESTIMATE','ADVISOR','PAYMENT','VISIT','REVIEW_PROMPT');
```

### 11.2 Constraints

```sql
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE invoices ADD CONSTRAINT invoices_balance_non_negative CHECK (balance_minor >= 0);
CREATE UNIQUE INDEX payments_one_pending_per_invoice_purpose
  ON payments (invoice_id, purpose)
  WHERE status IN ('PENDING','AUTHORIZED');
```

### 11.3 Invoice number sequence

```sql
CREATE SEQUENCE invoice_number_seq START 42;
-- Format INV-2026-000042 via application helper
```

Never reuse voided invoice numbers.

### 11.4 Indexes

```sql
CREATE INDEX invoices_booking_id_idx ON invoices(booking_id);
CREATE INDEX payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX payments_provider_order_id_idx ON payments(provider_order_id);
CREATE INDEX notifications_profile_created_idx ON notifications(profile_id, created_at DESC);
```

### 11.5 Seed data (dev)

After migration, seed script adds:

- Invoice for booking JC-1042: ISSUED, balance = total
- Invoice for JC-0991: PAID
- Payment CAPTURED for JC-0991
- Notifications as Task 8.20

---

## 12. API Contracts

### 12.1 GET /v1/bookings

**Query:** `cursor`, `limit` (default 20, max 50)

**Response 200:**

```json
{
  "data": [
    {
      "id": "b1f2...",
      "public_ref": "JC-1042",
      "title": "General servicing + repairs",
      "status_chip": "Scheduled",
      "status_tone": "warn",
      "subtitle": "General + repairs · Wed 11:00",
      "vehicle_summary": "Honda City 2019",
      "customer_progress": "BOOKING_CONFIRMED",
      "next_action_hint": "View details",
      "scheduled_at": "2026-08-19T05:30:00Z"
    }
  ],
  "meta": { "next_cursor": null, "has_more": false }
}
```

### 12.2 GET /v1/bookings/{id}

**Response 200:** includes snapshots, visits[], invoice_summary, review_submitted, customer_progress object, allowed_actions[].

```json
{
  "id": "b1f2...",
  "public_ref": "JC-1042",
  "customer_progress": {
    "key": "PAYMENT_DUE",
    "headline": "Service complete",
    "subheadline": "Pay your invoice to download receipt",
    "steps": [
      { "key": "booked", "label": "Booked", "status": "done" },
      { "key": "visit", "label": "Visit", "status": "done" },
      { "key": "invoice", "label": "Invoice", "status": "active" },
      { "key": "review", "label": "Review", "status": "pending" }
    ]
  },
  "allowed_actions": ["VIEW_INVOICE", "PAY_BALANCE", "CONTACT_SUPPORT"],
  "visits": [...],
  "invoice": { "id": "inv...", "status": "ISSUED", "balance_minor": 997100 }
}
```

### 12.3 GET /v1/bookings/{id}/invoice

**Response 200:**

```json
{
  "id": "inv...",
  "invoice_number": "INV-2026-000042",
  "status": "ISSUED",
  "currency": "INR",
  "subtotal_minor": 845000,
  "tax_minor": 152100,
  "total_minor": 997100,
  "paid_minor": 0,
  "balance_minor": 997100,
  "line_items": [
    { "kind": "SERVICE", "label": "General servicing + health report", "amount_minor": 299900 },
    { "kind": "PART", "label": "Brake pads (pair)", "quantity": 1, "amount_minor": 320000 }
  ],
  "pdf_download_url": "https://...signed...",
  "allowed_actions": ["PAY_BALANCE", "DOWNLOAD_PDF"]
}
```

### 12.4 POST /v1/invoices/{id}/payment-order

**Headers:** `Idempotency-Key`, `Authorization`

**Body:**

```json
{ "purpose": "BALANCE" }
```

**Response 201:**

```json
{
  "payment_id": "pay...",
  "razorpay_order_id": "order_...",
  "razorpay_key_id": "rzp_test_...",
  "amount_minor": 997100,
  "currency": "INR",
  "purpose": "BALANCE",
  "status": "PENDING",
  "verification_status": "NOT_STARTED",
  "expires_at": "2026-08-29T16:45:00Z",
  "prefill": { "name": "Rajesh Kumar", "contact": "+919876543210" }
}
```

### 12.5 GET /v1/payments/{id}

**Response 200:**

```json
{
  "id": "pay...",
  "invoice_id": "inv...",
  "status": "CAPTURED",
  "amount_minor": 997100,
  "purpose": "BALANCE",
  "verification_status": "VERIFIED",
  "captured_at": "2026-08-29T16:40:12Z",
  "invoice_status": "PAID"
}
```

When webhook pending:

```json
{
  "status": "PENDING",
  "verification_status": "PENDING",
  "message": "Confirming your payment. This usually takes a few seconds."
}
```

### 12.6 POST /v1/payments/webhook/razorpay

**Headers:** `X-Razorpay-Signature`

**Body:** Razorpay event JSON (raw bytes for signature)

**Response:** 200 `{ "received": true }` even on duplicate (after first process)

### 12.7 POST /v1/reviews

**Body:**

```json
{
  "booking_id": "b1f2...",
  "rating": 5,
  "comment": "Great service"
}
```

**Response 201:** Review object

**Errors:** 409 `REVIEW_ALREADY_SUBMITTED`, 409 `BOOKING_NOT_REVIEWABLE`

### 12.8 GET /v1/me/notifications

**Response 200:**

```json
{
  "data": [
    {
      "id": "ntf...",
      "kind": "PAYMENT",
      "title": "Payment received",
      "body": "Your payment for JC-1042 was confirmed.",
      "deep_link": "caratom://booking/b1f2...",
      "read_at": null,
      "created_at": "2026-08-29T16:41:00Z"
    }
  ],
  "meta": { "next_cursor": "...", "unread_count": 2 }
}
```

### 12.9 PATCH /v1/me/notifications/{id}/read

**Response 200:** Updated notification with `read_at` set

### 12.10 Error codes (money-specific)

| Code | HTTP | retryable | Customer message |
|------|------|-----------|------------------|
| `PAYMENT_FAILED` | 402 | true | Payment could not be completed. Try again. |
| `PAYMENT_VERIFICATION_PENDING` | 202 | true | Confirming your payment… |
| `PAYMENT_ALREADY_SETTLED` | 409 | false | This invoice is already paid. |
| `INVOICE_NOT_PAYABLE` | 409 | false | Invoice is not ready for payment. |
| `INVALID_PAYMENT_PURPOSE` | 422 | false | — |

All errors include `request_id`.

---

## 13. Complete Data Flow

### 13.1 Happy path: balance payment after service

```text
1. Technician completes visit → Visit COMPLETED
2. VisitService → InvoiceService.issue → Invoice ISSUED
3. ARQ → PDF upload → pdf_storage_path set
4. Outbox → notification PAYMENT kind "Invoice ready" (in-app row)
5. Customer opens Orders → GET /bookings
6. Tap JC-1042 → GET /bookings/{id} → customer_progress PAYMENT_DUE
7. Tap Pay → navigate invoice screen → GET /bookings/{id}/invoice
8. Tap Pay ₹9,971 → POST /invoices/{id}/payment-order
9. Razorpay Checkout → customer pays test card
10. Client callback → show VERIFICATION_PENDING → GET /payments/{id} poll
11. Razorpay webhook → payment.captured → Payment CAPTURED, Invoice PAID
12. Poll returns VERIFIED → UI success + review CTA
13. POST /v1/reviews → thank you
14. PATCH notification read
```

### 13.2 Duplicate webhook flow

```text
Webhook event evt_123 arrives twice
  → payment_events insert first: OK, processes capture
  → payment_events insert second: UNIQUE violation → return 200, no double allocation
  → invoice paid_minor remains equal to total_minor
```

### 13.3 Failed payment flow

```text
Webhook payment.failed
  → Payment FAILED with failure_reason safe text
  → Invoice remains ISSUED (not PAID)
  → Client may POST new payment-order with new Idempotency-Key
```

### 13.4 Parts advance flow (Inspection + Repair)

```text
1. Inspection visit complete → estimate approved
2. customer_progress PARTS_PAYMENT_REQUIRED
3. POST payment-order purpose PARTS_ADVANCE
4. Webhook capture → Invoice PARTIALLY_PAID
5. customer_progress REPAIR_BOOKING_REQUIRED (Phase 07 booking visit 2)
6. After visit 2 complete → new balance invoice lines or same invoice updated per policy
7. BALANCE payment closes invoice
```

### 13.5 App resume during payment

```text
App backgrounded during Razorpay
  → On resume: GET /payments/{id} if payment_id in navigation state
  → If PENDING verification → continue poll
  → Never assume checkout callback success alone
```

---

## 13A. Appendices (reference material)

### 13A.1 Razorpay webhook payload examples

**`payment.captured` (store raw in payment_events.payload):**

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_KkL2M3N4O5P6Q7",
        "entity": "payment",
        "amount": 997100,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_KkL2M3N4O5P6",
        "method": "card",
        "captured": true,
        "email": "rajesh@example.com",
        "contact": "+919876543210",
        "created_at": 1693329612
      }
    }
  },
  "created_at": 1693329612
}
```

**Processing rules:**

| Field | Internal use |
|-------|--------------|
| `payload.payment.entity.id` | `payments.provider_payment_id` |
| `payload.payment.entity.order_id` | Lookup Payment row |
| `payload.payment.entity.amount` | Must match `payments.amount_minor` or flag exception |
| Event id header / body id | `payment_events.provider_event_id` |

**`payment.failed`:**

```json
{
  "event": "payment.failed",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_FAIL123",
        "order_id": "order_KkL2M3N4O5P6",
        "status": "failed",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment was unsuccessful"
      }
    }
  }
}
```

Map to `Payment.FAILED` with customer-safe `failure_reason`: "Payment could not be completed. Try again."

### 13A.2 Signature verification algorithm

```python
import hmac
import hashlib

def verify_razorpay_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

FastAPI route MUST read `await request.body()` before JSON parse for verification.

### 13A.3 Demo invoice fixture — JC-1042 (General + repairs)

After visit complete, `InvoiceService` produces:

| Line | kind | label | amount_minor |
|------|------|-------|--------------|
| 1 | SERVICE | General servicing + health report | 299900 |
| 2 | PART | AC gas refill | 180000 |
| 3 | PART | Brake pads (pair) | 320000 |
| 4 | LABOUR | Brake fluid flush | 45000 |
| 5 | FEE | Doorstep service fee | 0 |
| | | **Subtotal** | **844900** |
| 6 | TAX | GST (18%) | 152082 |
| | | **Total** | **996982** |

Round display total to ₹9,970 (`997000` minor) per policy fixture — document rounding rule in `PricingPolicy.round_tax`.

**Prior parts advance (Inspection + Repair path only):** If `paid_minor=200000` from PARTS_ADVANCE, `balance_minor=797000`.

### 13A.4 Demo invoice fixture — JC-0991 (One-man)

| Line | kind | label | amount_minor |
|------|------|-------|--------------|
| 1 | SERVICE | Headlight bulb replacement | 149900 |
| 2 | TAX | GST (18%) | 26982 |
| | | **Total** | **176882** |

Display ₹1,769 rounded — seed as PAID for review-only E2E path.

### 13A.5 customer_progress decision matrix

| Booking state | Visit state | Invoice state | Payment | Review | progress_key |
|---------------|-------------|---------------|---------|--------|--------------|
| CONFIRMED | SCHEDULED | none | — | — | BOOKING_CONFIRMED |
| CONFIRMED | EN_ROUTE/CHECKED_IN | none | — | — | VISIT_IN_PROGRESS |
| ACTIVE | INSPECTION_DONE | estimate pending approval | — | — | ESTIMATE_APPROVAL_REQUIRED |
| ACTIVE | AWAITING_PARTS | ISSUED advance | unpaid advance | — | PARTS_PAYMENT_REQUIRED |
| ACTIVE | PARTS_PAID | PARTIALLY_PAID | advance captured | — | REPAIR_BOOKING_REQUIRED |
| COMPLETED | all COMPLETED | ISSUED | balance unpaid | — | PAYMENT_DUE |
| COMPLETED | all COMPLETED | ISSUED | PENDING verify | — | PAYMENT_VERIFICATION_PENDING |
| COMPLETED | all COMPLETED | PAID | captured | none | COMPLETED |
| COMPLETED | all COMPLETED | PAID | captured | submitted | COMPLETED (no review CTA) |

Composer implementation MUST be table-driven from this matrix; add unit test per row.

### 13A.6 allowed_actions derivation

| Condition | allowed_actions |
|-----------|-----------------|
| Invoice ISSUED, balance > 0, no PENDING payment | `VIEW_INVOICE`, `PAY_BALANCE` |
| Payment PENDING verification | `VIEW_INVOICE`, `PAYMENT_PENDING` |
| Invoice PAID, no review | `VIEW_INVOICE`, `DOWNLOAD_PDF`, `SUBMIT_REVIEW` |
| Invoice PAID, review exists | `VIEW_INVOICE`, `DOWNLOAD_PDF` |
| Parts advance due | `PAY_PARTS_ADVANCE`, `VIEW_INVOICE` |
| Visit in progress | `CONTACT_SUPPORT` |
| IR needs visit 2 | `BOOK_REPAIR_VISIT`, `CONTACT_SUPPORT` |

Mobile coordinator reads first primary-eligible action for CTA label.

### 13A.7 PDF layout specification

**Page size:** A4 portrait, 24mm margins.

**Header block:**

```text
CARATOM
Tax Invoice
Invoice #: INV-2026-000042
Date: 29 Aug 2026 (IST)
Booking ref: JC-1042
```

**Bill-to block:**

```text
Rajesh Kumar
+91 98765 ••••10
12, 5th Cross, Koramangala 5th Block
Bengaluru, Karnataka 560034
```

**Vehicle block:**

```text
Vehicle: Honda City 2019 · Petrol · Manual
Registration: KA-01-XX-4421
```

**Line table columns:** Description | Qty | Rate | Amount

**Footer block:**

```text
Thank you for choosing CARATOM doorstep service.
Support: support@caratom.in | GSTIN: [TBD Phase 12]
Warranty terms apply as per service policy.
This is a computer-generated invoice.
```

**Storage path:** `invoices/{invoice_id}/v{version}/invoice.pdf`

### 13A.8 In-app notification template catalog (Phase 08 seed)

| kind | title template | body template | deep_link |
|------|----------------|---------------|-----------|
| BOOKING | Booking confirmed | Your visit for {public_ref} is scheduled for {date_ist}. | `caratom://booking/{id}` |
| VISIT | Technician on the way | Your CARATOM technician is en route for {public_ref}. | `caratom://booking/{id}` |
| PAYMENT | Invoice ready | Your invoice for {public_ref} is ready. Balance due: {amount_display}. | `caratom://invoice/{invoice_id}` |
| PAYMENT | Payment received | Your payment for {public_ref} was confirmed. | `caratom://booking/{id}` |
| REVIEW_PROMPT | Rate your service | Tell us how {public_ref} went. | `caratom://review/{booking_id}` |
| ADVISOR | Advisor update | There is an update on your {public_ref} estimate. | `caratom://booking/{id}` |

Templates stored in worker/outbox; Phase 08 seeds 3 rows directly for Rajesh profile.

### 13A.9 Outbox events emitted in Phase 08

| Event type | Trigger | Worker action (Phase 08) |
|------------|---------|--------------------------|
| `invoice.issued` | Invoice ISSUED | Generate PDF; insert notification |
| `payment.captured` | Webhook success | Insert notification |
| `review.prompt` | Invoice PAID + 1h delay optional | Insert REVIEW_PROMPT notification |

Push delivery deferred Phase 11; in-app row created synchronously or via ARQ in same phase.

### 13A.10 Webhook integration test fixture

File: `backend/tests/fixtures/razorpay_payment_captured.json`

Test steps:

1. Create invoice + payment order via API
2. Load fixture; set `order_id` to match test payment
3. Compute valid signature with test secret
4. POST webhook twice
5. Assert `invoice.paid_minor == invoice.total_minor`
6. Assert `payment_events` count == 1 for provider_event_id

### 13A.11 TypeScript contract sketches

```typescript
// packages/contracts/src/customer-progress.ts
export const CustomerProgressKeySchema = z.enum([
  "BUILDING", "ESTIMATE_READY", "ACTION_REQUIRED", "ADVISOR_CONTACTING",
  "READY_TO_BOOK", "BOOKING_CONFIRMED", "VISIT_IN_PROGRESS",
  "ESTIMATE_APPROVAL_REQUIRED", "PARTS_PAYMENT_REQUIRED", "REPAIR_BOOKING_REQUIRED",
  "COMPLETED", "PAYMENT_DUE", "PAYMENT_VERIFICATION_PENDING", "PAID", "SUPPORT_REQUIRED",
]);

export const ProgressStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["pending", "active", "done"]),
});

export const CustomerProgressSchema = z.object({
  key: CustomerProgressKeySchema,
  headline: z.string(),
  subheadline: z.string().optional(),
  steps: z.array(ProgressStepSchema),
});
```

```typescript
// packages/contracts/src/payment.ts
export const PaymentVerificationStatusSchema = z.enum([
  "NOT_STARTED", "PENDING", "VERIFIED", "FAILED",
]);
```

### 13A.12 Coordinator hook (customer app)

```typescript
// apps/customer/src/features/booking/bookingCoordinator.ts
export function resolvePrimaryRoute(detail: BookingDetail): Href | null {
  const action = detail.allowed_actions[0];
  switch (action) {
    case "PAY_BALANCE":
    case "PAY_PARTS_ADVANCE":
    case "VIEW_INVOICE":
      return `/invoice/${detail.invoice.id}`;
    case "SUBMIT_REVIEW":
      return `/review/${detail.id}`;
    case "BOOK_REPAIR_VISIT":
      return `/booking/${detail.id}/repair-slot`; // Phase 07 route
    default:
      return null;
  }
}
```

Never route to payment based on local Razorpay callback alone — always re-fetch detail after poll.

---

## 14. UI/UX Conformance (embed post-booking screens from architecture 11-screen-specifications inline)

**Normative reference:** [`docs/architecture/11-screen-specifications.md`](../architecture/11-screen-specifications.md) — Customer mobile post-booking block.  
**Visual reference:** [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — Orders tab cards, global tokens from Phase 02.

**Global tokens (unchanged from Phase 02):**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#176B9E` | Primary CTAs, active progress step |
| `--brand-soft` | `#EAF6FC` | Success banners, paid state background |
| `--bg` | `#F6F4F1` | Screen canvas |
| `--card` | `#FFFFFF` | Cards |
| `--border` | `#E6E2DC` | Dividers |
| `--ok` | `#2E7D4F` | Completed chip, paid badge |
| `--warn` | `#B8860B` | Scheduled / pending payment chip |
| `--err` | `#C62828` | Failed payment |

**Architecture screen → Phase 08 route mapping:**

| Architecture screen (11-screen-specifications) | Walkthrough ID | Route |
|--------------------------------------------------|----------------|-------|
| Booking/order list | `orders` | `app/(tabs)/orders.tsx` |
| Booking detail / progress | *(architecture only)* | `app/booking/[id].tsx` |
| Invoice and payment | *(architecture only)* | `app/invoice/[invoiceId].tsx` |
| Review/rating | *(architecture only)* | `app/review/[bookingId].tsx` |
| Notifications | *(architecture only)* | `app/notifications.tsx` |

---

### 14.1 Screen — Booking/order list

**Architecture spec (embedded):**

> **Purpose:** show active and historical jobs. **Entry:** bottom Orders/profile. **Exit:** booking detail, invoice/payment, support. **Data:** paginated booking summaries and progress. **Loading/empty/error:** useful explanation and browse-services action. **Analytics:** `orders_viewed`, `booking_opened`. **Accessibility:** status and next action in row label.

**Walkthrough ID:** `orders`  
**Route:** `app/(tabs)/orders.tsx`  
**Tab:** Orders (bottom nav)

#### Navigation

| Action | Target |
|--------|--------|
| Booking card tap | `/booking/{id}` |
| Empty CTA "Browse services" | `/(tabs)/home` |
| Pull to refresh | Reload `GET /v1/bookings` |

#### Copy (walkthrough-aligned + architecture hints)

| Element | Text |
|---------|------|
| Nav title | Orders |
| Card 1 ref | JC-1042 |
| Card 1 chip | Scheduled (warn) — or API-driven `status_chip` |
| Card 1 subtitle | General + repairs · Wed 11:00 |
| Card 2 ref | JC-0991 |
| Card 2 chip | Completed (ok) |
| Card 2 subtitle | One-man · lighting |
| Empty title | No orders yet |
| Empty body | When you book a service, it will show up here. |
| Empty CTA | Browse services |

#### Layout

1. FlatList of cards — walkthrough `card row-ph` pattern: car photo placeholder left, ref + chip row, muted subtitle
2. Optional `next_action_hint` right chevron when `PAYMENT_DUE` → "Pay invoice"

#### API binding

- `GET /v1/bookings?limit=20`
- Map `status_tone` → chip color: ok/warn/err/neutral

#### States

| State | Behavior |
|-------|----------|
| Loading | 2 skeleton cards |
| Empty | Illustration + copy above |
| Error | Banner + retry |
| Pagination | Infinite scroll on `next_cursor` |

#### Analytics

- `orders_viewed` on mount
- `booking_opened` with `booking_id`, `customer_progress`

#### Accessibility

- Row label: `"JC-1042, General servicing, Scheduled, next action view details"`

---

### 14.2 Screen — Booking detail / progress

**Architecture spec (embedded):**

> **Purpose:** show operational truth and next customer action. **Entry:** order list/deep link/notification. **Data:** composed customer progress, visits, technician/ETA when safe, estimate/invoice/payment actions, evidence. **UI:** progress step, service/vehicle/address summary, next action, contact/support. **Loading:** refresh. **Error:** last-known status with retry. **Analytics:** `booking_detail_viewed`, `booking_action_started`. **Accessibility:** progress has textual state.

**Route:** `app/booking/[id].tsx`  
**Nav title:** `{public_ref}` e.g. JC-1042

#### Navigation

| Action | Target |
|--------|--------|
| Back | Orders tab |
| Primary CTA (dynamic) | See §14.2.6 action table |
| Support | `/support?bookingId=` |
| Notification deep link | Same route with `id` param |

#### Copy — header summary

| Element | Source |
|---------|--------|
| Title line | Offering title from booking snapshot |
| Status chip | Derived from `customer_progress.key` |
| Vehicle row | `{make} {model} {year} · {fuel}` |
| Address row | Snapshot line1, locality |
| Schedule row | IST formatted window |

#### Layout (top to bottom)

1. **Progress stepper** — horizontal 4–5 steps from `customer_progress.steps[]`
   - Done: brand-soft fill + checkmark
   - Active: brand border + bold label
   - Pending: muted border
2. **Headline** — `customer_progress.headline` (e.g. "Service complete")
3. **Subheadline** — optional muted
4. **Summary card** — vehicle, address, schedule
5. **Visit cards** — each visit: type label (SERVICE not "Inspection" for GS+repair — AUDIT I8), date, status
6. **Evidence strip** — thumbnail placeholders if media URLs present (read-only)
7. **Primary CTA** — full width brand button
8. **Secondary** — Contact support (ghost)

#### Primary CTA mapping (`allowed_actions`)

| allowed_action | CTA label | Navigation |
|----------------|-----------|------------|
| `VIEW_INVOICE` | View invoice | `/invoice/{invoiceId}` |
| `PAY_BALANCE` | Pay ₹{balance} | `/invoice/{invoiceId}` |
| `PAY_PARTS_ADVANCE` | Pay parts advance | `/invoice/{invoiceId}?purpose=PARTS_ADVANCE` |
| `SUBMIT_REVIEW` | Rate this service | `/review/{bookingId}` |
| `BOOK_REPAIR_VISIT` | Book repair visit | Phase 07 route |
| `CONTACT_SUPPORT` | Get help | support sheet |

#### Progress variants (demo fixtures)

**Variant A — BOOKING_CONFIRMED:**

- Headline: "Booking confirmed"
- Subheadline: "We will assign a van before your slot"
- Steps: Booked ✓ · Visit · Invoice · Review
- Primary: hidden or "View details" disabled

**Variant B — VISIT_IN_PROGRESS:**

- Headline: "Technician on the way"
- Subheadline: ETA only if API provides safe window
- Primary: Contact support

**Variant C — PAYMENT_DUE:**

- Headline: "Service complete"
- Subheadline: "Pay your invoice to download receipt"
- Primary: Pay ₹9,971

**Variant D — PAYMENT_VERIFICATION_PENDING:**

- Amber banner: "Confirming your payment…"
- Primary disabled; poll active

**Variant E — COMPLETED + review pending:**

- Headline: "All done"
- Primary: Rate this service

#### API binding

- `GET /v1/bookings/{id}` on focus
- Refetch interval 30s when `VISIT_IN_PROGRESS`

#### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton stepper + card |
| Error | Last cached + retry |
| 403 | "Order not found" |

#### Analytics

- `booking_detail_viewed`
- `booking_action_started` on primary tap with `action` key

#### Accessibility

- Stepper: `"Step 2 of 4, Visit, in progress"`

---

### 14.3 Screen — Invoice and payment

**Architecture spec (embedded):**

> **Purpose:** review final invoice and settle due amount. **Entry:** booking detail/notification. **Data:** Invoice, payment allocations, Razorpay order or offline note. **UI:** line items, tax, paid/balance, download/share, pay CTA. **Loading:** order creation/verification pending. **Error:** failed payment with retry/new order; **never mark paid locally.** **Success:** verified receipt/status. **Analytics:** `invoice_viewed`, `payment_started`, `payment_verified`, `payment_failed`. **Accessibility:** currency and total spoken clearly.

**Route:** `app/invoice/[invoiceId].tsx`  
**Nav title:** Invoice

#### Navigation

| Action | Target |
|--------|--------|
| Back | Booking detail |
| Download PDF | Open `pdf_download_url` in browser/WebView |
| Share | Native share sheet with PDF URL |
| Pay CTA | Razorpay flow (§9.3) |

#### Copy

| Element | Text |
|---------|------|
| Invoice number | Invoice #INV-2026-000042 |
| Status badge | Due / Paid / Verifying… |
| Section title | Summary |
| Line items | From API `line_items[].label` |
| Subtotal row | Subtotal |
| Tax row | GST (18%) |
| Total row | Total |
| Paid row | Paid (when partial) |
| Balance row | Balance due |
| Pay CTA | Pay ₹{balance} |
| Verify banner | Confirming your payment. This usually takes a few seconds. |
| Success title | Payment received |
| Success body | Thank you. Your receipt is ready to download. |
| Offline note | Paid at service (cash) — shown when DTO indicates offline allocation |

#### Layout

1. Status badge top-right
2. Line items list — label left, amount right aligned tabular
3. Divider
4. Subtotal, tax, total (total bold brand color)
5. Paid/balance rows when applicable
6. Download + Share row (icon buttons)
7. Sticky bottom Pay CTA (hidden when PAID or balance 0)
8. Verification pending banner overlays bottom when active

#### Payment state machine (client display only)

```text
IDLE → CREATING_ORDER → CHECKOUT_OPEN → VERIFICATION_PENDING → VERIFIED | FAILED
```

Client display states map from `GET /v1/payments/{id}.verification_status` — **never** local PAID without VERIFIED.

#### API sequence

1. `GET /v1/bookings/{bookingId}/invoice` or direct invoice id
2. Pay tap → `POST /v1/invoices/{id}/payment-order`
3. Razorpay checkout
4. Poll `GET /v1/payments/{paymentId}`

#### States

| State | UI |
|-------|-----|
| Loading invoice | Skeleton lines |
| ISSUED balance > 0 | Pay CTA enabled |
| PARTIALLY_PAID | Show paid row + balance |
| PAID | Green success card; hide Pay |
| VERIFICATION_PENDING | Amber banner; disable Pay |
| PAYMENT_FAILED | Error + Try again |

#### Analytics

- `invoice_viewed`
- `payment_started` with `amount_minor`, `purpose`
- `payment_verified` / `payment_failed`

#### Accessibility

- Total: `"Total amount, 9,971 rupees"`
- Pay button: `"Pay balance 9,971 rupees"`

---

### 14.4 Screen — Review/rating

**Architecture spec (embedded):**

> **Purpose:** capture service feedback after completion. **Entry:** completed booking prompt/order detail. **Exit:** submit, skip, support. **Data:** completed visits, existing review. **Validation:** rating required; comment optional. **Loading:** submit. **Error:** retry without duplicate. **Success:** thank-you and history. **Analytics:** `review_started`, `review_submitted`. **Accessibility:** star controls have numeric labels.

**Route:** `app/review/[bookingId].tsx`  
**Nav title:** Rate your service

#### Navigation

| Action | Target |
|--------|--------|
| Back | Booking detail |
| Skip (header) | Booking detail without submit |
| Submit | POST review → thank-you state → booking detail |
| Support link | Support sheet |

#### Copy

| Element | Text |
|---------|------|
| Title | How was your service? |
| Subtitle | Your feedback helps us improve doorstep service. |
| Stars | 5-star control, default none selected |
| Comment placeholder | Anything else you'd like to share? (optional) |
| Submit CTA | Submit rating |
| Thank you title | Thank you |
| Thank you body | We appreciate your feedback. |
| Already submitted | You rated this service {n} stars |

#### Layout

1. Hero illustration optional (van icon)
2. Title + subtitle centered
3. Star row — 44pt touch targets, gap 8
4. Multiline comment — max 2000 chars counter muted
5. Submit CTA full width
6. Thank-you replaces form on success

#### Validation

- Submit disabled until rating 1–5 selected
- If review exists → read-only thank-you state

#### API

- `POST /v1/reviews` with Idempotency-Key header

#### Analytics

- `review_started` on mount
- `review_submitted` with `rating` only (not comment text in analytics)

#### Accessibility

- Each star: `accessibilityLabel="4 stars"`, `accessibilityRole="button"`

---

### 14.5 Screen — Notifications

**Architecture spec (embedded):**

> **Purpose:** show important booking, estimate, advisor, payment, and visit updates. **Entry:** Home/profile/deep link. **Exit:** open linked resource or back. **Data:** cursor-paginated notification intents and read state. **Empty:** concise explanation. **Error:** retry. **Analytics:** `notifications_viewed`, `notification_opened`.

**Route:** `app/notifications.tsx`  
**Entry:** Profile → Notifications row

#### Navigation

| Action | Target |
|--------|--------|
| Row tap | Parse `deep_link` → booking/invoice/review |
| Back | Profile |
| Mark all read | Optional toolbar action |

#### Copy

| Element | Text |
|---------|------|
| Nav title | Notifications |
| Empty | No notifications yet |
| Empty sub | Updates about your bookings and payments will appear here. |
| Sample payment | Payment received — Your payment for JC-1042 was confirmed. |
| Sample review | Rate your service — Tell us how JC-0991 went. |
| Sample visit | Technician assigned — Your visit is scheduled for Wed 11:00. |

#### Layout

1. List rows — unread: bold title + brand dot; read: muted
2. Timestamp relative (e.g. "2h ago")
3. Cursor infinite scroll

#### Deep link handling

```text
caratom://booking/{id}     → /booking/[id]
caratom://invoice/{id}     → /invoice/[invoiceId]
caratom://review/{id}      → /review/[bookingId]
```

On open: `PATCH .../read` then navigate.

#### API

- `GET /v1/me/notifications`
- `PATCH /v1/me/notifications/{id}/read`

#### Analytics

- `notifications_viewed`
- `notification_opened` with `kind`, `resource_type`

---

### 14.6 Cross-screen architecture conformance checklist

| 11-screen-spec requirement | Implementation |
|----------------------------|----------------|
| Never mark paid locally | §14.3 payment SM |
| Download/share invoice PDF | Signed URL |
| Progress textual state | §14.2 a11y |
| Rating required | §14.4 validation |
| Notification read state | `read_at` |
| Error retry without duplicate review | Idempotency-Key |
| Payment failed retry new order | Server confirms FAILED first |

---

## 15. Security

### 15.1 Server-authoritative money (non-negotiable)

Per [`01-product-constitution.md`](../architecture/01-product-constitution.md) and [`14-security.md`](../architecture/14-security.md):

- No customer API endpoint sets `Payment.status=CAPTURED` or `Invoice.status=PAID`
- Razorpay webhook verifies HMAC-SHA256 signature before processing
- `payment_events.provider_event_id` UNIQUE prevents replay allocation
- Payment order amount computed server-side from `invoice.balance_minor`
- Client-provided payment success payloads ignored except for UX cue to poll

### 15.2 Webhook hardening

- Constant-time signature compare
- Reject if `RAZORPAY_WEBHOOK_SECRET` unset in production
- Rate limit webhook route by IP (Redis sliding window — basic in Phase 08)
- Log signature failures with request_id; alert threshold in Phase 12

### 15.3 Authorization

- Invoice/payment/review: booking must belong to authenticated `profile_id`
- Notifications: row-level `profile_id` match
- PDF signed URLs: short TTL; optional booking ownership check on invoice GET before issuing URL

### 15.4 PII in notifications

- No full phone, registration, or address in notification body
- Use public_ref (JC-####) and first name only

### 15.5 Secrets

| Secret | Location |
|--------|----------|
| `RAZORPAY_KEY_SECRET` | Backend env only |
| `RAZORPAY_WEBHOOK_SECRET` | Backend env only |
| `RAZORPAY_KEY_ID` | Backend + `EXPO_PUBLIC_*` (public) |

Never commit `.env` files.

---

## 16. Testing Strategy

### 16.1 Unit tests

| Module | Cases |
|--------|-------|
| `progress_composer` | All progress keys; edge partial pay |
| `InvoiceService` | Derivation from parts/labour; tax rounding |
| `PaymentService` | Idempotent order create; amount from balance |
| `webhook signature` | Valid, invalid, tampered body |

### 16.2 Integration tests

| Test | Assert |
|------|--------|
| `test_payment_happy_path` | Webhook capture → invoice PAID |
| `test_webhook_duplicate` | Same event twice → single paid_minor |
| `test_payment_failed_retry` | New order after FAILED |
| `test_review_idempotency` | Duplicate POST → 200 same id |
| `test_review_before_complete` | 409 |
| `test_customer_isolation` | 403 cross-profile booking |

### 16.3 E2E manual checklist

1. Login as Rajesh → Orders shows JC-1042 + JC-0991
2. JC-1042 detail → Pay → Razorpay test card → verification pending → paid
3. PDF download opens
4. Submit 5-star review
5. Notifications mark read
6. JC-0991 shows review already submitted state

### 16.4 Razorpay test mode

Use official test cards; document in §17. Webhook via dev simulate or ngrok tunnel documented for local dev.

### 16.5 Analytics validation

Ensure events fire per §16 architecture without payment IDs or raw amounts in client events (bucket allowed).

---

## 17. Verification Procedure (concrete commands)

### 17.1 Database migration

```powershell
cd c:\Users
anda\OneDrive\Desktop\CarAtom-main\backend
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed_phase08
```

### 17.2 Backend tests

```powershell
uv run pytest tests/integration/test_phase08_webhook_idempotency.py -v
uv run pytest tests/integration/test_phase08_payments.py -v
uv run pytest tests/unit/test_progress_composer.py -v
uv run pytest tests/ -q
```

### 17.3 API smoke (PowerShell)

```powershell
$TOKEN = "<supabase-jwt>"
$BASE = "http://localhost:8000"

# List bookings
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/v1/bookings" | jq .

# Booking detail
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/v1/bookings/<booking-id>" | jq .customer_progress

# Invoice
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/v1/bookings/<booking-id>/invoice" | jq .

# Create payment order
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: test-1" `
  -H "Content-Type: application/json" `
  -d '{"purpose":"BALANCE"}' `
  "$BASE/v1/invoices/<invoice-id>/payment-order" | jq .

# Simulate webhook (dev only)
curl -s -X POST -H "Content-Type: application/json" `
  -d '@tests/fixtures/razorpay_payment_captured.json' `
  "$BASE/v1/dev/simulate/razorpay-webhook"

# Poll payment
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/v1/payments/<payment-id>" | jq .

# Submit review
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: review-1" `
  -H "Content-Type: application/json" `
  -d '{"booking_id":"<id>","rating":5}' `
  "$BASE/v1/reviews" | jq .

# Notifications
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/v1/me/notifications" | jq .
```

### 17.4 Mobile

```powershell
cd c:\Users
anda\OneDrive\Desktop\CarAtom-main
pnpm install
pnpm --filter @caratom/customer exec npx expo start
```

Verify flows §16.3 on device/emulator with `EXPO_PUBLIC_API_URL` pointing to local API.

### 17.5 Contracts typecheck

```powershell
pnpm --filter @caratom/contracts typecheck
pnpm --filter @caratom/api-client typecheck
pnpm --filter @caratom/customer typecheck
```

### 17.6 CI

```powershell
# Full monorepo CI locally if act unavailable
pnpm lint
pnpm typecheck
cd backend && uv run ruff check . && uv run pytest -q
```

### 17.7 Security spot checks

- Grep customer app for `CAPTURED` or `PAID` assignments — must be read-only comparisons only
- Confirm no `RAZORPAY_KEY_SECRET` in `apps/customer`
- Webhook rejects missing signature header

---

## 18. Full Codebase Audit checklist

| Item | Pass criteria |
|------|---------------|
| Invoice derived from field truth | Fitted parts in line items |
| Webhook idempotent | Duplicate test green |
| No client paid transition | Code review + grep |
| PDF generated for ISSUED invoice | Storage object exists |
| Orders list matches walkthrough cards | Visual |
| Booking detail shows progress | Stepper from API |
| Payment pending UX | Manual test backgrounding |
| Review once per booking | DB unique + API |
| Notifications read persists | PATCH verified |
| Migrations reversible | alembic downgrade head-1 |
| OpenAPI includes new routes | /openapi.json |
| Contracts match API | Zod parse integration responses |
| Phase 03–07 regressions | §22 |

Mark each ☐ → ☑ during Phase 08 exit.

---

## 19. Vibe Coding Principles Audit (table format)

| Control / principle | Phase 08 applicability | Pass method |
|--------------------|------------------------|-------------|
| AI code unverified until tests pass | Required | §17 pytest green |
| No secrets in repo | Required | gitleaks / manual |
| Server owns money | Required | §15 architecture review |
| Idempotency on retryable writes | Required | payment-order + review |
| Minimal scope | Required | No admin money UI |
| Match existing conventions | Required | Module layout like bookings |
| CONSTITUTION.md | Referenced | **Missing** — use product constitution |
| CONTROLS-CATALOG-2.md | Referenced | **Missing** — Part 1 only |

**Phase 08 Vibe exit:** All applicable rows Pass.

---

## 20. Architecture Conformance Audit

| Architecture rule | Phase 08 conformance | Evidence |
|-------------------|----------------------|----------|
| Server-authoritative money | Required | Webhook-only capture |
| Separate Invoice/Payment state machines | Required | §11 enums |
| Invoice not estimate copy | Required | Derivation test |
| Razorpay webhook signature | Required | §15.2 |
| customer_progress composed server-side | Required | progress_composer |
| INR minor units | Required | All DTOs |
| Problem Details errors | Required | §12.10 |
| Booking snapshots immutable | Required | No mutation |
| Clients use API not PostgREST | Required | api-client |
| Notification intents durable | Partial | DB rows; push Phase 11 |
| Outbox for side effects | Required | PDF + notification enqueue |
| UTC storage, IST display | Required | Invoice dates |
| Technician cannot set prices | N/A | No change |
| Offline payment customer distinction | Required | DTO note when offline |

**Allowed non-conformance:** Refund execution deferred Phase 09; GST legal review Phase 12.

---

## 21. Walkthrough Conformance Audit

| Screen | Walkthrough element | Architecture fallback | Verify |
|--------|---------------------|----------------------|--------|
| orders | JC-1042 Scheduled card | API-driven chips | Visual §14.1 |
| orders | JC-0991 Completed card | API-driven | Visual |
| orders | Bottom nav Orders tab | — | Tab bar |
| profile | Your orders row | Links orders | Phase 05 |
| booking detail | *(absent)* | §14.2 full spec | Manual |
| invoice | *(absent)* | §14.3 full spec | Manual |
| payment | *(absent)* | §14.3 Razorpay | Test card |
| review | *(absent)* | §14.4 full spec | Manual |
| notifications | *(absent)* | §14.5 full spec | Manual |

**AUDIT I5 resolution:** Architecture screens implemented with walkthrough visual language (tokens, cards, chips).

**Fail criteria:** Orders tab deviates from walkthrough card pattern; money marked paid without server VERIFIED.

---

## 22. Regression Audit

| Prior phase capability | Regression check | Pass |
|------------------------|------------------|------|
| Phase 03 GS book flow | New booking still works | ☐ |
| Phase 04 advisor + repairs | Booking detail shows repair lines | ☐ |
| Phase 05 orders tab entry | Still navigable | ☐ |
| Phase 05 profile | Notifications link added, no break | ☐ |
| Phase 06 visit complete | Still triggers invoice issue | ☐ |
| Phase 07 IR parts advance | PARTS_PAYMENT_REQUIRED UI | ☐ |
| Phase 02 home/catalog | Unaffected | ☐ |
| CI lint/typecheck | Green | ☐ |

---

## 23. Technical Debt Review

| Debt item | Severity | Accept for Phase 08? | Follow-up |
|-----------|----------|----------------------|-----------|
| GST/legal invoice format | Medium | Yes | Phase 12 legal |
| ngrok webhook local dev friction | Low | Yes | Dev simulate endpoint |
| Push notification delivery | Medium | Yes | Phase 11 |
| Admin offline payment | Medium | Yes | Phase 09 |
| Refund API | Medium | Yes | Phase 09 |
| Realtime booking progress | Low | Yes | Poll acceptable MVP |
| Warranty terms on PDF footer | Low | Yes | Copy from ops |
| Exact tax policy per city | Medium | Yes | Fixture 18% demo |

**Debt registration:** Record accepted items in PR description.

---

## 24. Phase Exit Gate (checkbox list)

All boxes MUST be checked before starting Phase 11.

### Backend / money

- [ ] Migrations applied: invoices, payments, reviews, notifications
- [ ] InvoiceService issues from completed visit data
- [ ] PDF generated and downloadable via signed URL
- [ ] Razorpay order create returns valid test order
- [ ] Webhook signature verified; invalid rejected
- [ ] Duplicate webhook does not double-allocate
- [ ] GET /payments/{id} reflects CAPTURED after webhook
- [ ] No API endpoint lets client mark invoice PAID
- [ ] progress_composer unit tests pass

### API

- [ ] GET /v1/bookings paginated
- [ ] GET /v1/bookings/{id} includes customer_progress + allowed_actions
- [ ] GET /v1/bookings/{id}/invoice complete DTO
- [ ] POST /v1/invoices/{id}/payment-order idempotent
- [ ] POST /v1/reviews idempotent; unique per booking
- [ ] GET /v1/me/notifications + PATCH read

### Customer mobile

- [ ] Orders tab matches walkthrough card pattern
- [ ] Booking detail progress stepper driven by API
- [ ] Invoice screen line items + tax + total
- [ ] Razorpay checkout opens in test mode
- [ ] Verification pending shown until server VERIFIED
- [ ] Paid state only after poll confirms
- [ ] Review submit + thank you
- [ ] Notifications list + mark read + deep link

### Quality

- [ ] pytest integration tests green
- [ ] Contracts + api-client typecheck
- [ ] §18 audit items PASS
- [ ] §19 Vibe audit PASS
- [ ] §20 Architecture audit PASS
- [ ] §22 regression PASS

---

## 25. Outputs Passed to Next Phase

Phase 11 ([`PHASE-11-notifications-integrations-hardening.md`](./PHASE-11-notifications-integrations-hardening.md)) receives:

| Output | Location | Phase 11 usage |
|--------|----------|----------------|
| Notification read model | `notifications` table + GET/PATCH | Push delivery + badge counts |
| Payment verified outbox events | outbox | Push templates for payment |
| Deep link routes | app.json | Universal links |
| Invoice PDF URLs | invoice DTO | Email/share integrations |
| Review records | `reviews` | Quality metrics |
| Money reconciliation tests | backend/tests | Hardening regression |
| customer_progress keys | progress_composer | Push copy mapping |

**Handoff command bundle for Phase 11 agent:**

```powershell
pnpm install
docker compose up -d
cd backend && uv sync && uv run alembic upgrade head && uv run python -m scripts.seed_phase08 && cd ..
pnpm dev:api
# Verify §17.3 payment smoke, then begin Phase 11 notification delivery
```

---

## 26. Cursor Execution Instructions

### 26.1 Agent preamble

When executing Phase 08 in Cursor:

1. Read this entire document before writing code.
2. Read [`04-state-machines.md`](../architecture/04-state-machines.md) Invoice + Payment sections.
3. Read [`11-screen-specifications.md`](../architecture/11-screen-specifications.md) post-booking block.
4. **Never** implement client-side invoice paid transitions.
5. Execute §8 tasks sequentially; verify each before proceeding.
6. Run §17 before claiming exit gate.
7. Embed §14 screen specs — do not invent alternate post-booking UX.

### 26.2 Recommended Cursor workflow

```text
Step 1: Tasks 8.1–8.4  (migrations + models)
Step 2: Tasks 8.5–8.11 (invoice, payment, webhook, composer, routes)
Step 3: Tasks 8.12–8.13 (contracts + api-client) — parallel OK after Step 2 APIs stable
Step 4: Tasks 8.14–8.18 (customer UI per §14)
Step 5: Tasks 8.19–8.21 (tests + seed + audits)
Step 6: §17 full verification
Step 7: §18–§22 audits
Step 8: §24 exit gate checkboxes
```

### 26.3 Scope discipline rules

- If a task is not in §6.1, do not implement it.
- Do not build admin payments desk (Phase 09).
- Do not send Expo push (Phase 11).
- Do not copy estimate lines to invoice without fitted parts merge.
- Do not skip webhook idempotency tests.
- Razorpay keys stay in env — never commit.

### 26.4 File creation order

1. Alembic migration + models
2. Invoice + Payment services (no UI yet)
3. Webhook route + tests with fixtures
4. Contracts + api-client
5. Customer screens §14 order: orders → detail → invoice → review → notifications
6. Seed script + dev simulate webhook

### 26.5 Razorpay dashboard setup (test mode)

Before Task 8.7, configure Razorpay test dashboard:

1. Create Razorpay test account at dashboard.razorpay.com
2. Copy **Key ID** → `RAZORPAY_KEY_ID` and `EXPO_PUBLIC_RAZORPAY_KEY_ID`
3. Copy **Key Secret** → `RAZORPAY_KEY_SECRET` (backend only)
4. Webhooks → Add endpoint `https://<api-host>/v1/payments/webhook/razorpay`
5. Select events: `payment.captured`, `payment.failed`, `order.paid`
6. Copy **Webhook Secret** → `RAZORPAY_WEBHOOK_SECRET`
7. Local dev: use `POST /v1/dev/simulate/razorpay-webhook` OR ngrok tunnel to localhost:8000

**Test cards (official Razorpay docs):**

| Scenario | Card number | CVV | Expiry |
|----------|-------------|-----|--------|
| Success | 4111 1111 1111 1111 | Any | Any future |
| Failure | 4000 0000 0000 0002 | Any | Any future |

Never use live keys in development fixtures.

### 26.6 Common failure modes

| Failure | Fix |
|---------|-----|
| Webhook signature mismatch | Use raw body bytes; check secret |
| Duplicate payment allocation | Verify payment_events unique |
| Client shows paid too early | Poll until VERIFIED |
| Razorpay Expo incompatibility | expo-doctor; config plugin |
| PDF worker silent fail | Check storage bucket ACL |
| Review 409 loop | Show existing review UI |
| progress wrong for IR | Unit test fixture visits |

### 26.7 Commit guidance

Suggested messages (only when user requests commit):

```text
feat(phase-08): add invoice and payment migrations
feat(phase-08): razorpay webhook and reconciliation
feat(phase-08): customer post-booking screens
test(phase-08): webhook idempotency and payment e2e
```

### 26.8 Completion report template

```markdown
## Phase 08 Complete

- Exit gate: X/X checkboxes
- Verification: §17 commands [pass/fail]
- Line count: [N]
- Money authority: webhook-only capture confirmed
- Known debt: §23 items
- Ready for Phase 11: [yes/no]
```

### 26.9 Stop condition

**Stop after §24 exit gate passes.** Do not implement push delivery, admin offline payments, or production Razorpay live mode — Phase 09/11/12.

---

*End of PHASE-08-payments-invoicing-closure.md*