# 16 — Analytics and product learning

Analytics answers operational/product questions; it is not a click counter. Events include a non-sensitive anonymous/session identifier, app version, flow policy, service slug, and safe context. Do not send raw concerns, phone, address, registration, payment IDs, or image URLs.

## Customer events

- `service_detail_viewed`: which offering explanations are consumed before start?
- `service_started`: which policy starts become Job Cards?
- `vehicle_context_completed`: does early vehicle context help discovery or create friction?
- `job_card_started`: where do users enter the commercial flow?
- `concern_added`: do customers understand the concern prompt?
- `addon_search_used`, `addon_added`, `addon_removed`: which repairs are requested and where does discovery fail?
- `estimate_viewed`: are users reaching a comprehensible price?
- `estimate_accepted`, `estimate_rejected`: acceptance and edit-loop health by service/policy.
- `advisor_required`, `advisor_call_rescheduled`, `advisor_confirmed`: human-clarification demand and reachability.
- `customer_details_completed`, `vehicle_finalized`, `address_selected`: finalization drop-off.
- `slot_viewed`, `slot_selected`, `slot_hold_expired`: capacity and scheduling friction.
- `booking_reviewed`, `booking_confirmed`, `booking_failed`, `booking_cancelled`: conversion and failure.
- `invoice_viewed`, `payment_started`, `payment_verified`, `payment_failed`: money funnel reliability.
- `review_submitted`, `support_ticket_created`: quality and unresolved issues.

## Operational events

Track server-side state transitions, time-to-advisor, time-to-assignment, slot fill, technician on-time performance, inspection-to-estimate time, parts advance conversion, payment reconciliation lag, notification delivery, and inventory consumption corrections.

## Analytics rules

Use event schemas with versioning. Prefer server events for truth (booking confirmed, payment verified, transition) and client events for intent/view. Sample verbose technician location/diagnostic data. Provide opt-out/consent behavior where required. Analytics failure must never block a product action.

