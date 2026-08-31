# 04 — State machines

Each lifecycle has explicit legal transitions. The API rejects illegal transitions with a machine-readable problem response. A transition records actor, reason (when required), source, idempotency key, and timestamp.

## Job Card

```text
LOCAL_DRAFT -> PRICING
PRICING -> EDITABLE | PRICING_FAILED
EDITABLE -> PRICING | ABANDONED | CANCELLED
PRICING -> ESTIMATE_READY
ESTIMATE_READY -> ESTIMATE_ACCEPTED | EDITABLE
ESTIMATE_ACCEPTED -> ADVISOR_REQUIRED | READY_FOR_FINALIZATION
ADVISOR_REQUIRED -> ADVISOR_IN_PROGRESS | ABANDONED | CANCELLED
ADVISOR_IN_PROGRESS -> SCOPE_CONFIRMED | CHANGES_PROPOSED | UNREACHABLE | CANCELLED
CHANGES_PROPOSED -> ESTIMATE_READY
SCOPE_CONFIRMED -> READY_FOR_FINALIZATION
READY_FOR_FINALIZATION -> FINALIZATION_IN_PROGRESS | ABANDONED
FINALIZATION_IN_PROGRESS -> READY_TO_BOOK | ESTIMATE_REPRICE_REQUIRED | INELIGIBLE
READY_TO_BOOK -> BOOKING_CREATED | ABANDONED
BOOKING_CREATED -> IN_SERVICE | COMPLETED | CANCELLED
IN_SERVICE -> COMPLETED | SUPPORT_REQUIRED
```

`LOCAL_DRAFT` is not persisted until a rate-limited preview or authenticated save. `ABANDONED` is recoverable for a configured retention period. `CANCELLED` is terminal for that request but does not delete history.

For `ONE_MAN` and fixed-scope `DIRECT_SPECIAL`, the Job Card may move from `ESTIMATE_ACCEPTED` directly to `READY_FOR_FINALIZATION`. If the technician discovers unpriced parts or a scope exception, the backend creates an exception/revised Estimate path rather than changing the selling price from the field. For `INSPECTION_REPAIR`, the Job Card can enter `INSPECTION_BOOKED`, `INSPECTION_IN_PROGRESS`, `ESTIMATE_PENDING`, `REPAIR_APPROVAL_DUE`, `PARTS_ADVANCE_DUE`, `PARTS_PENDING`, `REPAIR_BOOKED`, and `REPAIR_IN_PROGRESS` through the linked Booking/Visit workflows.

## Estimate

```text
DRAFT -> READY | CALCULATION_FAILED
READY -> ACCEPTED | REJECTED | EXPIRED | SUPERSEDED
REJECTED -> SUPERSEDED
ACCEPTED -> SUPERSEDED (only if a material authorized change is proposed)
CALCULATION_FAILED -> DRAFT (retry)
```

Only the current `READY` version can be accepted. Acceptance is conditional on a non-expired version hash and expected total. A changed job-card input always creates a new version.

## Advisor Case

```text
NOT_REQUIRED (terminal)
OPEN -> CONTACTING | CANCELLED
CONTACTING -> CUSTOMER_REACHED | UNREACHABLE | OPEN
CUSTOMER_REACHED -> CONFIRMED | CHANGES_PROPOSED | DECLINED
CHANGES_PROPOSED -> CUSTOMER_CONFIRMATION_DUE | CANCELLED
CUSTOMER_CONFIRMATION_DUE -> CONFIRMED | DECLINED | OPEN
UNREACHABLE -> OPEN | CANCELLED
DECLINED -> OPEN | CANCELLED
CONFIRMED (terminal for that scope)
```

An admin may override a state only with an audited reason. An override never erases call attempts or notes.

## Booking

```text
DRAFT -> HOLDING
HOLDING -> CONFIRMED | HOLD_EXPIRED | CANCELLED
CONFIRMED -> RESCHEDULE_REQUESTED | CANCEL_REQUESTED | IN_PROGRESS | COMPLETED
RESCHEDULE_REQUESTED -> HOLDING | CONFIRMED | CANCELLED
CANCEL_REQUESTED -> CANCELLED | CONFIRMED
IN_PROGRESS -> COMPLETED | SUPPORT_REQUIRED
```

`HOLDING` is time-limited. Confirmation transactionally checks hold ownership, expiry, serviceability, and capacity. The database must prevent overlapping visits for the same technician/capacity unit.

## Visit

```text
SCHEDULED -> ASSIGNED | CANCELLED
ASSIGNED -> EN_ROUTE | UNASSIGNED | CANCELLED
EN_ROUTE -> ON_SITE | LATE | CANCELLED
LATE -> ON_SITE | CANCELLED | SUPPORT_REQUIRED
ON_SITE -> INSPECTION_IN_PROGRESS | SERVICE_IN_PROGRESS
INSPECTION_IN_PROGRESS -> INSPECTION_SUBMITTED | SUPPORT_REQUIRED
SERVICE_IN_PROGRESS -> QC_PENDING | SUPPORT_REQUIRED
INSPECTION_SUBMITTED -> COMPLETED
QC_PENDING -> COMPLETED | QC_FAILED
QC_FAILED -> SERVICE_IN_PROGRESS | FOLLOW_UP_REQUIRED | COMPLETED (admin override)
FOLLOW_UP_REQUIRED -> SCHEDULED
```

Technician actions are limited by visit type and assignment. Admin can complete/override from desk with reason.

## Invoice

```text
DRAFT -> ISSUED | VOID
ISSUED -> PARTIALLY_PAID | PAID | VOID
PARTIALLY_PAID -> PAID | REFUND_PENDING
PAID -> REFUND_PENDING (credit/refund path only)
REFUND_PENDING -> REFUNDED | PARTIALLY_PAID | PAID
```

Final invoice lines are derived from approved scope, actual fitted parts/labour, configured fees, and tax policy. It is not simply a copy of the estimate.

## Payment

```text
PENDING -> AUTHORIZED | FAILED | CANCELLED
AUTHORIZED -> CAPTURED | FAILED
CAPTURED -> REFUND_PENDING | REFUNDED | PARTIALLY_REFUNDED
REFUND_PENDING -> REFUNDED | PARTIALLY_REFUNDED
FAILED -> PENDING (new payment attempt with new provider order)
```

Razorpay webhook processing is idempotent by provider event/order/payment id. A client callback can mark the UI “verification pending” but cannot transition Payment to `CAPTURED`.

## Derived customer progress

The API composes a read-only `customer_progress` from linked lifecycles:

```text
BUILDING
ESTIMATE_READY
ACTION_REQUIRED
ADVISOR_CONTACTING
READY_TO_BOOK
BOOKING_CONFIRMED
VISIT_IN_PROGRESS
ESTIMATE_APPROVAL_REQUIRED
PARTS_PAYMENT_REQUIRED
REPAIR_BOOKING_REQUIRED
COMPLETED
PAYMENT_DUE
SUPPORT_REQUIRED
```

This keeps the customer experience simple without sacrificing operational state detail.

## App exit and retries

- Local draft changes are persisted after debounced edits.
- A failed pricing request keeps the editable draft and last valid estimate snapshot, visibly marked stale.
- A failed transition is retriable with the same idempotency key where safe.
- Returning after expiry rehydrates from the server and prompts the next legal action rather than replaying stale navigation.
- Backgrounding during OTP, payment, or slot confirmation never assumes success. On resume, query server truth.
