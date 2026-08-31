# 03 — Domain model

## Modeling rules

The domain model describes business meaning and invariants. SQLAlchemy models describe persistence. Pydantic/TypeScript DTOs describe transport. Zustand/React state describes an in-progress user interaction. These are related representations, not interchangeable classes.

Domain services are the only place where cross-aggregate policy is applied. A screen may collect fields, but it cannot decide whether an advisor is required, whether an estimate is acceptable, or whether a slot is bookable.

## Identity and customer records

### Profile

Purpose: the authenticated person record linked to Supabase Auth.

Key fields: `id`, `role` (`customer`, `technician`, `admin`), `name`, `phone_e164`, `phone_verified_at`, `status`, `created_at`, `updated_at`.

Owner: account identity. A customer owns vehicles, addresses, bookings, reviews, and support requests. A technician profile is linked to a Technician record.

Rules: phone is normalized to E.164; only backend/admin can change role; disabling a profile blocks new authenticated mutations while preserving historical records.

### Customer snapshot

Purpose: preserve the name and phone used at booking time even if the profile later changes.

Persistence: `booking_customer_snapshot` fields on Booking or a dedicated snapshot value object. It is not a second user account.

### Address

Purpose: a customer-managed service location.

Fields: label, contact name, phone, address lines, locality, city, state, postal code, landmark, latitude, longitude, geocode accuracy, service-area status.

Rules: one customer owns many addresses; a booking stores a snapshot; the snapshot does not change when the saved address changes.

### Vehicle

Purpose: a saved car that can be reused in future jobs.

Fields: owner, make, model, variant, year, fuel (`petrol`, `diesel`, `cng`, `ev`, `hybrid`, `other`), transmission (`manual`, `automatic`, `amt`, `cvt`, `dct`, `unknown`), registration number, odometer, nickname, photo, active flag.

Rules: registration number is optional at first; normalize but do not assume a single state format; vehicle compatibility is evaluated by backend catalog rules. The vehicle context used during browsing is a draft value, not a saved Vehicle.

## Catalog and commercial scope

### ServiceCategory

Purpose: browse/navigation grouping such as General Service, AC, brakes, glass, or electrical.

Fields: `id`, slug, display name, description, image asset, sort order, active, parent category.

### ServiceOffering

Purpose: a sellable customer-facing service or package.

Fields: slug, name, short description, long description, category, `flow_policy`, price presentation (`fixed`, `starting_from`, `quote_after_inspection`), base price in minor INR units, estimated duration, visit count, tax code, eligibility rules, included-item definitions, media, active dates, active flag.

`flow_policy` is one of `GENERAL_SERVICE`, `ONE_MAN`, `DIRECT_SPECIAL`, `INSPECTION_REPAIR`, or a future explicit policy. A service is not classified by frontend placement. `ONE_MAN` is a named offering policy; `DIRECT_SPECIAL` is the extensible reduced-flow policy for other fixed-scope services.

### IncludedServiceItem

Purpose: immutable-at-estimate snapshot of work included by a service offering.

Fields: name, description, quantity/unit, price treatment, operational duration, display order.

The catalog item is copied into EstimateLineItems when priced so catalog edits do not rewrite historical estimates.

### RepairOffering (add-on catalog)

Purpose: a known repair that can be requested inside General Service or offered through a specialty category.

Fields: category, name, description, symptoms/keywords, compatible makes/models/fuel rules, pricing mode, starting price, default labour minutes, required skills, part templates, advisor requirement (`always`, `never`, `policy`), active flag.

Customers can search and select multiple RepairOfferings. Free-text concerns remain separate and never become billable lines without an explicit catalog line or admin-created estimate item.

### PricingPolicy

Purpose: versioned server rules for taxes, discounts, second-vehicle eligibility, parts advance percentage, rounding, service-area fees, and expiry.

MVP can store this as admin-managed settings plus effective-dated rows. Every estimate stores the policy version used.

## Job Card aggregate

### JobCard

Purpose: the commercial request and scope aggregate for one vehicle and one service policy.

Fields: `id`, public reference, customer id (nullable until authentication), service offering id, flow policy snapshot, lifecycle state, concerns, source (`customer_app`, `admin_on_behalf`, `support`), current estimate id, advisor case id, booking id (nullable), vehicle draft/snapshot, timestamps, abandonment timestamp, version/etag.

Ownership: Customer owns their job card; Admin can operate any job; Technician receives a restricted read model and writes visit evidence only.

Rules: one Job Card has one primary vehicle. Multi-car coordination uses a BookingGroup, not multiple vehicles hidden inside this aggregate.

### JobCardConcern

Purpose: structured record of what the customer says is wrong or desired.

Fields: free text, optional category, urgency, attachment references, source (`customer`, `advisor`, `technician`, `admin`), created/updated timestamps.

Concerns are never silently deleted when an estimate is rejected; edits create a history trail.

### JobCardItem

Purpose: requested commercial scope line before it becomes an estimate.

Kinds: base service, repair add-on, customer-provided part request, service fee, note-only line.

Fields: catalog reference, label snapshot, requested quantity, vehicle id, customer note, requested status, eligibility status, sort order.

The customer may add/remove requested items while the Job Card is editable. An EstimateLineItem is a priced snapshot, not the same object.

## Estimate and advisor

### Estimate

Purpose: a versioned proposal of expected cost and scope.

Fields: Job Card, version number, status, currency (`INR`), subtotal, discount, tax, parts subtotal, labour subtotal, total, parts-advance amount, pricing-policy version, source (`system`, `advisor`, `admin`, `inspection`), valid-until, created-by, accepted/rejected timestamps, superseded-by.

Statuses: `DRAFT`, `READY`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`, `EXPIRED`.

Invariant: only one current non-superseded estimate per Job Card. Acceptance points to a specific version and total.

### EstimateLineItem

Purpose: immutable-priced line inside an Estimate.

Fields: type (`base`, `included`, `repair`, `part`, `labour`, `fee`, `discount`, `tax`), description, source reference, vehicle, quantity, unit, unit price, discount, tax, line total, cost metadata restricted from customer response, optional approval requirement.

Money uses integer paise/minor units. No floating-point totals.

### AdvisorCase

Purpose: an operational case for human clarification and scope confirmation.

Fields: Job Card, status, assigned admin/advisor profile, verified contact number, attempt count, next attempt at, last contact, notes, customer response, confirmed estimate version, resolution reason, timestamps.

Statuses: `NOT_REQUIRED`, `OPEN`, `CONTACTING`, `CUSTOMER_REACHED`, `CHANGES_PROPOSED`, `CUSTOMER_CONFIRMATION_DUE`, `CONFIRMED`, `UNREACHABLE`, `DECLINED`, `CANCELLED`.

One AdvisorCase may produce many call attempts and notes but only one confirmed outcome for a given commercial scope.

### AdvisorCallAttempt

Purpose: auditable communication attempt.

Fields: channel (`phone`, `WhatsApp`, `SMS`), started/ended timestamps, outcome, notes, actor, callback requested, recording reference if legally permitted (not MVP).

Do not store call audio by default.

## Booking and fulfillment

### BookingGroup

Purpose: optional coordination container for multiple Job Cards booked together.

MVP supports one Job Card per booking. The model exists so second-car discount and adjacent visits do not require corrupting Job Card ownership.

### Booking

Purpose: confirmed fulfillment request for one Job Card.

Fields: Job Card, customer snapshot, address snapshot, vehicle snapshot/reference, status, confirmation token, booking idempotency id, cancellation/reschedule policy snapshot, timezone, confirmed-at, cancelled-at, reason.

Statuses: `DRAFT`, `HOLDING`, `CONFIRMED`, `RESCHEDULE_REQUIRED`, `CANCEL_REQUESTED`, `CANCELLED`, `COMPLETED`.

### ServiceArea

Purpose: operational boundary for doorstep work.

Fields: city/locality, polygon or postal coverage, active hours, surcharge policy, enabled offerings.

MVP may use postal-code/locality rules before PostGIS polygons, but the API must return a clear serviceability decision.

### ServiceSlot

Purpose: an operationally generated availability option.

Fields: start/end UTC, local display timezone, service area, capacity/resource requirements, skill requirements, status, hold expiration.

Slots may be generated dynamically rather than persisted forever. Holds and confirmed visits are persisted.

### SlotHold

Purpose: short-lived reservation while the customer reviews booking.

Fields: slot, Job Card, owner/session, expires-at, idempotency key, status.

Only one active hold can block the same capacity unit for a time range. Expired holds are reclaimable.

### Visit

Purpose: one physical doorstep attendance.

Types: `SERVICE`, `INSPECTION`, `REPAIR`, `FOLLOW_UP`, `QC_REVISIT`.

Fields: Booking, type, scheduled slot, status, assigned technician, address/vehicle snapshots, check-in/out, ETA, notes, evidence completion.

## Field execution

### Technician

Purpose: field operator dossier linked to a technician Profile.

Fields: skills, active/on-duty status, van, service areas, phone, availability, last location, ratings summary.

### Inspection

Purpose: structured findings from an inspection visit.

Fields: Visit, checklist version, status, summary, submitted-by, submitted-at.

### InspectionFinding

Purpose: a finding with severity, evidence, recommendation, and customer-visible explanation.

### MediaAsset

Purpose: private Storage object metadata for photos/PDFs.

Fields: storage path, checksum, MIME type, size, captured-at, uploader, visibility, entity reference. The database stores metadata and paths, never binary blobs.

### JobPart / JobLabour

Purpose: planned, recommended, approved, and fitted operational lines.

JobPart fields include SKU, quantity planned/fitted, status, vehicle, source estimate line, fitted-by. JobLabour captures work performed and minutes, not customer selling price authority.

### InventoryMovement

Purpose: stock ledger event.

Types: receive, consume, adjust, transfer-to-van, transfer-from-van, reverse-consume.

Every consume event requires Job Card, customer, vehicle, technician, SKU, quantity, and reason/note.

### QCCheck

Purpose: completion checklist for a Visit.

Fields: checklist key/version, result, note, actor, completed-at, exception flag.

## Money and closure

### Invoice

Purpose: final amount due for completed/approved work.

Fields: Job Card, invoice number, status, currency, subtotal, discount, tax, total, amount paid, balance, issued-at, due-at, PDF asset, finalized-by.

Statuses: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `VOID`, `REFUND_PENDING`, `REFUNDED`.

An invoice is not edited in place after payment without a credit-note/refund audit path.

### Payment

Purpose: business-level obligation/payment allocation.

Purposes: `PARTS_ADVANCE`, `INVOICE`, `REFUND`.

Methods: Razorpay, cash, direct UPI, card terminal, other offline.

Statuses: `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.

### PaymentEvent

Purpose: immutable Razorpay webhook/idempotency audit payload metadata. Raw provider payload is access-restricted and redacted from normal logs.

### Review

Purpose: customer feedback associated with a completed Job Card/Visit.

Fields: rating, comment, visibility/moderation status, submitted-at, response.

## Supporting entities

- `Notification`: intent, channel, template, recipient, delivery status, retry count, entity reference.
- `SupportTicket`: customer/admin help request with priority and status.
- `AuditLog`: actor, role, action, entity, before/after summary, reason, request id, timestamp.
- `CmsBlock`: optional admin-managed home/promotional content with activation dates.
- `FeatureSetting`: small server-side configuration values with audit history.

## Domain/API/UI separation

### Domain model

Rich invariants, enums, value objects (`Money`, `PhoneNumber`, `TimeRange`), and use-case commands/results.

### Database model

Normalized SQLAlchemy entities, foreign keys, unique constraints, indexes, optimistic version columns, and immutable history tables.

### API DTO

Stable Pydantic schemas designed for clients: explicit nullable fields, pagination cursors, `allowed_actions`, `flow_decision`, `version`, and problem details. Never leak internal cost or authorization metadata.

### UI state

Local draft fields, query cache, screen step, optimistic display state, modal state, and offline queue. UI state may be stale and must be reconciled with the server before irreversible actions.
