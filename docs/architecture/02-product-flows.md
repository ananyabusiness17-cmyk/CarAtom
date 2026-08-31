# 02 — Product flows

## Flow-policy evaluation

The backend returns a `FlowDecision` whenever a Job Card is priced or materially changed.

```text
FlowDecision
  policy: GENERAL_SERVICE | ONE_MAN | DIRECT_SPECIAL | INSPECTION_REPAIR
  advisor_requirement: NOT_REQUIRED | REQUIRED_NOW | REQUIRED_AFTER_INSPECTION
  estimate_requirement: PRE_BOOKING | POST_INSPECTION | SUMMARY_ONLY
  required_next_action
  allowed_actions[]
  blocking_reasons[]
  estimate_version_id?
  expires_at?
```

The customer app renders from this result. It must not infer advisor need from route names or selected-array length, even though the current backend policy uses the presence of General Service add-ons.

## General Service without add-ons

### Canonical sequence

```text
Home / General Service
-> Service detail
-> Start Job Card
-> Review included service items
-> Add/edit customer concerns (optional but prompted)
-> Do not add repairs
-> Request estimate
-> Estimated invoice
-> Accept estimate
-> Authenticate if needed
-> Customer details
-> Vehicle details
-> Address/service location
-> Select slot and create hold
-> Review booking
-> Confirm booking
-> Booking confirmation and order tracking
```

### Why each step exists

- Service detail establishes scope and inclusions before a commercial commitment.
- Job Card records the customer's own description without forcing a repair selection.
- Estimate makes base price, inclusions, tax, and discounts explicit.
- Customer, vehicle, and address are delayed until the user accepts the commercial scope.
- Slot search occurs only after definitive vehicle, address, service duration, and eligibility are known.
- Review confirms the exact vehicle, address, slot, accepted estimate, and cancellation policy.

### Explicit bypass

After estimate acceptance, the backend returns `advisor_requirement = NOT_REQUIRED`. The app goes directly to finalization. No advisor status screen, call request, or fake waiting step is shown.

## General Service with add-ons

### Canonical sequence

```text
Home / General Service
-> Service detail
-> Start Job Card
-> Review included items
-> Add/edit concerns
-> Browse/search add-on repair catalog
-> Add one or more repairs
-> Request estimate
-> Estimated invoice
-> Accept estimate
-> Authenticate/verify phone if needed
-> Create advisor case
-> Advisor status / call
-> Advisor discusses concerns and requested repairs
-> Advisor confirms unchanged scope
   OR publishes a revised estimate
-> If revised: customer reviews and accepts/rejects the new version
-> Scope confirmed
-> Customer details
-> Vehicle details
-> Address/service location
-> Select slot and create hold
-> Review booking
-> Confirm booking
-> Booking confirmation and tracking
```

### Advisor outcomes

- Confirm unchanged: the accepted estimate remains current; the Job Card becomes ready for finalization.
- Remove an add-on: publish a new Estimate version; the customer accepts or returns to the Job Card.
- Add or replace an add-on: publish a new version with advisor notes; the customer accepts or declines.
- Price or quantity change: publish a new version and require consent.
- Customer unreachable: keep the Job Card resumable, offer call rescheduling/contact support, and send a reminder.
- Part unavailable: propose an alternative, defer the item, or remove it; each material change creates a new Estimate.
- Customer disagrees: leave the case in changes-proposed/declined and allow return to the Job Card without losing concerns.

### “Final submission” meaning

Advisor confirmation finalizes commercial scope; it does not create the booking. The actual booking is submitted only after customer, vehicle, address, and slot are confirmed.

## One-man Job

One-man Job is the named small-job product. It is a direct booking path when the catalog marks the selected work as fixed-scope and bookable.

```text
Home / One-man Job
-> Select One-man Job or a focused One-man category
-> Service detail: job scope, starting/fixed price, duration, parts disclosure
-> Book this job
-> Authenticate if needed
-> Customer details
-> Vehicle details
-> Address/service location
-> Select slot and create hold
-> Review price and booking policy
-> Confirm booking
-> Booking confirmation
-> Technician service visit
-> If actual parts/scope change: admin/estimate exception path
-> Final invoice -> payment -> rating
```

The customer is not shown the General Service included-item/add-on funnel. A One-man Job that cannot be credibly priced or matched to the vehicle is not force-booked: the API returns an escalation decision to an advisor or Inspection + Repair.

## Direct Special Service

### Canonical sequence

```text
Home / Special Services
-> Select one special service
-> Service detail with price/duration/disclosures
-> Book this service
-> Authenticate if needed
-> Customer details
-> Vehicle details
-> Address/service location
-> Select slot and create hold
-> Review price summary and booking
-> Confirm booking
-> Booking confirmation and tracking
```

The customer is not shown General Service included items, add-on search, a standalone estimated-invoice acceptance screen, or advisor waiting when the offering policy is `DIRECT_SPECIAL` and the selected offering is fixed-scope. One-man Job is the primary named example of this policy.

The confirmation review still displays server-provided pricing. “Direct” means reduced workflow, not client-owned price.

### Catalog behavior

Approximately ten active Special Services may be presented. One-man Job is the core small-work offering; other special services are catalog entries using the same or another explicit policy. Only one direct special service is selected per booking in MVP. If the customer wants unrelated work, the UI offers “Start another booking” or directs them to General Service; it does not silently merge incompatible durations and rules.

## Inspection-and-repair

This is a separate offering for work that cannot be credibly priced before physical inspection.

```text
Select Inspection + Repair
-> Describe symptoms/concerns
-> Optional photo upload
-> Authenticate and provide contact details
-> Advisor clarifies inspection scope if configured
-> Select inspection slot
-> Confirm visit 1
-> Technician inspection and evidence
-> Findings and estimate published
-> Customer accepts/rejects
-> Parts advance due when configured
-> Parts ordered/received
-> Select repair slot (visit 2)
-> Technician repair/service
-> QC
-> Final invoice
-> Pay balance
-> Rating and vehicle history
```

The pre-inspection screen may show an inspection fee or “quote after inspection.” It must not fabricate a full repair estimate.

## Estimate rejection and edit loop

For General Service:

```text
Estimate -> Reject/Edit -> Job Card
-> preserve concerns and selections
-> edit add-ons/quantities
-> request new estimate
-> old version SUPERSEDED
-> new estimate READY
```

The UI uses “Change job card” rather than treating rejection as cancellation. A separate “Discard request” action abandons the draft.

## Definitive vehicle changes

Vehicle information is collected late, but some prices and compatibility depend on it.

When the definitive vehicle is entered:

1. backend validates service and repair compatibility;
2. backend reprices vehicle-dependent lines;
3. if amount or scope is unchanged, finalization continues;
4. if amount or scope changes, the previous Estimate is superseded;
5. the user sees the reason and accepts the revised Estimate;
6. if add-ons remain, advisor confirmation remains required; a second call is needed only when the change cannot be confirmed asynchronously by the assigned advisor.

The UI must not hide this loop merely to preserve a linear funnel.

## Authentication and guest progress

Guest users may browse, select a service, construct a local Job Card, and request a rate-limited server estimate preview.

Authentication is required when the user:

- asks CARATOM to call them;
- wants remote/cross-device draft persistence;
- begins customer/vehicle/address finalization;
- creates a slot hold;
- views private bookings/history;
- pays; or
- contacts support about an existing job.

After successful OTP, the local draft and signed estimate token are imported into a server Job Card idempotently.

## Returning customers

Returning authenticated customers can select saved customer data, vehicles, and addresses during finalization. They can edit any selection before slot search. Existing data is not silently overwritten; edits create or update the selected resource through explicit forms.

## Booking confirmation and execution

After booking confirmation:

```text
Confirmed -> technician assigned -> en route -> arrived
-> service/inspection in progress -> QC -> visit completed
-> invoice issued -> payment settled -> job completed -> rating
```

Assignment may occur after confirmation. Customer-facing status must say “Booking confirmed” even while a technician is not yet assigned, with an honest promise about when assignment details appear.

## Cancellation and rescheduling

- Before confirmation: release the hold and retain the Job Card.
- Confirmed but outside cancellation cutoff: cancel or reschedule according to disclosed policy.
- Inside cutoff or technician en route: show policy consequences and route to support/admin when necessary.
- Inspection-and-repair: visit 2 can be rescheduled without discarding the approved Estimate or completed inspection, subject to estimate/parts validity.
- Paid advances: cancellation creates a refund review; it never silently marks money refunded.

## Multi-car rule

The older specification included a second car at a 10% eligible discount. This remains supported but is not part of the first customer funnel slice.

The correct architecture is multiple Job Cards grouped by a `BookingGroup`, because each vehicle can have different scope, estimate, advisor need, duration, slot, technician, and invoice lines. A shared checkout may coordinate adjacent slots later. The server applies the configured discount to eligible lines only.

Do not attach two vehicles to one undifferentiated Job Card.

## Roadside/SOS

The inspiration references include an SOS map experience. It is a separate future `ROADSIDE_ASSISTANCE` policy, not a bottom-tab shortcut into normal scheduled service. Until dispatch, coverage, and emergency promises are operationally defined, MVP may show a support/call entry rather than pretending to offer live rescue.
