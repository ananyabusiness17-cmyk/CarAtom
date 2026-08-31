# 08 — Data model and persistence

## Relational conventions

- UUID primary keys; human references such as `JC-1042` are separate unique public refs.
- `created_at`, `updated_at`, and actor fields on mutable business rows.
- UTC `timestamptz` for instants.
- Integer minor units (`amount_minor`) plus ISO currency.
- Explicit enum/check constraints, not unconstrained status strings.
- Soft disable/archive for catalog, profiles, and media; preserve financial/history rows.
- Optimistic `version` integer on aggregates edited by multiple surfaces.
- JSONB only for evolving metadata/evidence, not core searchable relationships.

## Core tables

### Identity and profile

`profiles`, `addresses`, `vehicles`, `vehicle_media`.

### Catalog

`service_categories`, `service_offerings`, `service_offering_versions`, `included_service_items`, `repair_categories`, `repair_offerings`, `repair_offering_versions`, `pricing_policies`, `service_area_rules`, `feature_settings`, `cms_blocks`.

Version tables allow historical estimates to remain explainable after admin edits.

### Scope and estimates

`job_cards`, `job_card_concerns`, `job_card_items`, `job_card_events`, `estimates`, `estimate_line_items`, `estimate_acceptances`, `advisor_cases`, `advisor_call_attempts`, `advisor_notes`.

### Scheduling

`booking_groups`, `bookings`, `booking_snapshots`, `service_slots` (optional materialized availability), `slot_holds`, `visits`, `technician_assignments`, `technician_availability`, `service_calendars`, `holidays`.

### Field work

`technicians`, `technician_skills`, `technician_location_pings`, `inspections`, `inspection_findings`, `media_assets`, `job_parts`, `job_labour`, `qc_checks`.

### Inventory

`inventory_skus`, `inventory_stock`, `inventory_movements`.

### Money and relationship

`invoices`, `invoice_line_items`, `payments`, `payment_events`, `refunds`, `reviews`, `notifications`, `support_tickets`, `audit_logs`, `outbox_events`.

## Key constraints

- One current estimate per Job Card: partial unique index where status in current states.
- Estimate line quantities and money are non-negative except explicit discount lines.
- Job Card item vehicle must equal Job Card primary vehicle.
- Booking must reference scope-confirmed Job Card and immutable snapshots.
- One active slot hold per capacity collision; hold owner and expiry indexed.
- No overlapping confirmed visits for a technician/resource, enforced with a PostgreSQL exclusion constraint where feasible.
- Consume inventory movement requires Job Card, customer, vehicle, technician, SKU, positive quantity.
- Payment provider identifiers unique; webhook event identifiers idempotent.
- Invoice number unique and never reused.
- Audit reason non-empty for admin override/destructive actions.

## Indexes

Index active catalog by policy/category/sort; repair offering search fields; Job Card by customer/status/updated_at; advisor cases by status/next_attempt_at; booking/visit by slot/time/technician; inventory movements by customer/vehicle/job/sku; payments by status/purpose; outbox by status/available_at.

## Snapshots

Booking stores customer, address, vehicle, service offering, cancellation, tax, and policy snapshots. Estimate line items store label and catalog version snapshots. Invoice lines store human-readable descriptions and final numbers. Historical truth must not change when catalog/profile/address changes.

## Privacy and retention

Use application-level redaction and retention policies for call notes, location pings, media, notifications, and support. Retain financial/audit history according to business/legal policy; exact retention duration is an open question.

