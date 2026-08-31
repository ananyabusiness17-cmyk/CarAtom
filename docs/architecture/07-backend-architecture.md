# 07 — Backend architecture

## Layering

```text
routers/controllers      HTTP, auth dependency, DTO mapping
application services     commands/queries and transaction boundary
domain                   aggregates, value objects, policies, transitions
repositories             persistence ports and SQLAlchemy implementations
integrations              Supabase, Razorpay, messaging, maps, storage
workers                  outbox delivery, reminders, post-processing
```

Keep layers practical: a module may colocate small files, but HTTP handlers must not calculate totals or mutate multiple aggregates directly.

## Core application commands

Customer:

- create/update draft
- price Job Card
- add/remove/update concern or repair request
- accept/reject estimate
- create advisor case
- provide customer/vehicle/address details
- list slots
- hold slot
- confirm booking
- cancel/reschedule booking
- view progress/invoice/payment
- submit review/support ticket

Technician:

- list assigned visits
- acknowledge/accept assignment
- update en-route/check-in/status
- start inspection/service
- add findings/photos
- add recommended/fitted parts and labour
- complete QC/visit
- send location ping

Admin:

- advisor inbox and call attempts
- revise scope/estimate
- confirm/reject advisor case
- assign/reassign technician
- manage slots and bookings
- override transitions with reason
- create on-behalf booking
- manage catalog/policy/content
- manage people
- manage inventory and consumption
- issue/void invoices, record offline payments/refunds
- moderate reviews and inspect audit history

## Pricing and estimate engine

`PricingService` accepts a `PricingInput` containing service offering/version, vehicle, requested JobCardItems, service area, customer context, and policy version. It returns a deterministic `PricingResult` with line breakdown, eligibility decisions, totals in minor INR units, advisor requirement, expiry, and input fingerprint.

The engine:

1. resolves active catalog versions;
2. validates offering and vehicle compatibility;
3. expands included items;
4. resolves repair pricing/parts/labour templates;
5. applies eligible discounts and fees;
6. calculates tax and rounding using policy;
7. calculates parts advance where applicable;
8. records reasons/disclosures for non-fixed pricing; and
9. persists an Estimate version.

It may expose a safe preview before authentication, but preview and final pricing call the same domain service. Client arithmetic is presentation-only.

## Advisor service

`AdvisorPolicy` evaluates `flow_policy`, selected repair lines, uncertainty flags, requested phone contact, and inspection outcome. `AdvisorService` creates cases, assigns admins, records attempts/notes, publishes revised estimate versions, and resolves cases. It does not directly book slots.

## Slot service

`SlotService` composes service-area hours, holidays, offering duration, visit type, skills, technician availability, travel buffer, existing visits, and temporary holds. It returns availability reasons and alternatives. `confirm_booking` rechecks all constraints transactionally.

## Inspection/repair service

Inspection submission creates structured findings and recommended JobPart/JobLabour records. Admin or pricing service publishes an inspection-sourced Estimate. Approval and parts advance unlock parts workflow; only parts readiness plus a valid slot can create visit 2.

## Invoice/payment service

Invoice service derives final lines from accepted scope and actual completion records, with explicit adjustments. Payment service creates Razorpay orders, maps purposes, verifies signatures/webhooks, and updates allocations. It exposes verification-pending until provider truth is known.

## Outbox and workers

Write domain state and outbox rows in one transaction. ARQ workers claim rows, call providers with idempotency, record attempts, retry with backoff, and dead-letter after a bounded policy. Reminder jobs query persisted states; they never assume a previous notification succeeded.

## API response shape

Resource responses include `id`, `type`, `attributes`, `relationships` or flattened stable fields, `version`, `updated_at`, `allowed_actions`, and relevant `flow_decision`. List responses include cursor metadata. Sensitive admin-only fields are separate DTOs.

