# 19 — Open questions, assumptions, and blockers

## Confirmed facts

- The current workspace is documentation/prototype-only; there is no implementation to preserve.
- CARATOM has separate customer, technician, and admin clients.
- FastAPI modular monolith, Supabase, Railway, Expo, Next.js, Redis/ARQ, Razorpay, and MapLibre/OpenStreetMap remain the intended baseline.
- Job scope, advisor behavior, scheduling, field execution, money, inventory, and audit are central.
- General Service may have optional add-ons.
- General Service without add-ons bypasses advisor.
- General Service with add-ons requires advisor confirmation.
- One-man Job is a named small-job offering and fixed-scope instances may be directly bookable.
- Other Special Services may be directly bookable according to catalog policy.
- Inspection-and-repair is a separate two-visit path.
- Customer visual direction is reference-inspired consumer density with mostly neutral surfaces and tasteful light-blue accents.

## Strong assumptions used to make architecture implementable

- One Job Card represents one primary vehicle; multi-car coordination is a later BookingGroup capability.
- One-man Job and other Direct Special Services have one selected service per booking in MVP.
- Customer may browse and build a local draft before authentication, but advisor contact, remote save, finalization, slot hold, and payment require identity.
- Customer and vehicle details are collected late, but a verified phone is required before creating an advisor case.
- Initial operational timezone is `Asia/Kolkata`; all instants are stored UTC.
- Admin is the only omnipotent role in MVP; a separate restricted advisor role is deferred.
- Service area can begin with postal/locality rules before geographic polygons.
- The initial payment split supports parts advance and invoice balance; exact refund policy is not yet fixed.

## Genuine product decisions still required

1. What are the exact One-man Job sub-services and the other Special Services, their prices, durations, service areas, and advisor/escalation rules?
2. Is the General Service “estimated invoice” a customer acceptance gate even when it has no add-ons? This constitution assumes yes because it makes base scope and price explicit.
3. What exact parts, taxes, fees, rounding, and GST presentation rules apply in the first launch city?
4. What are operating hours, blackout days, cancellation cutoff, reschedule policy, and technician travel buffers?
5. Is an address map pin mandatory, optional, or only used for serviceability support in MVP?
6. What advisor response SLA, call windows, attempt count, and escalation path should be configured?
7. Which repairs are known catalog add-ons versus inspection-only requests?
8. Should customers pay a visit/inspection fee before inspection, and is it refundable/credited?
9. What exact parts-advance percentage and refund treatment apply when a customer cancels after ordering?
10. Which customer/technician notifications use push, SMS, WhatsApp, or phone call, and what provider is approved?
11. What legal/privacy retention and deletion requirements apply to media, location, support notes, and payment records?
12. What vehicle data source/licensing will supply make/model/variant imagery and compatibility?
13. Are customer-facing service-history health reports in scope for MVP or only admin/technician evidence?
14. What warranty terms and claim workflow must be shown on invoice/history?
15. Should roadside/SOS be a real launch capability or remain a support entry until dispatch coverage is operational?

## Implementation blockers

No blocker prevents Phase 0. Phases involving real catalog/pricing, slot capacity, payments, messaging, and launch legal behavior require answers to the relevant questions above before production configuration. Sensible defaults may be used in development fixtures, but must be marked as test data and replaced before launch.

## Contradictions resolved in this constitution

- Former “advisor after every submission” is replaced by policy-based branching.
- Former single overloaded Job Card status is replaced by coordinated lifecycles and a derived customer progress read model.
- Former early vehicle selection is retained only as optional context; definitive vehicle capture is late.
- Former second-car-on-one-booking concept is retained as a future BookingGroup rather than corrupting one Job Card’s vehicle ownership.
