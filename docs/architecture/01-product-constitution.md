# 01 — Product constitution

These rules are non-negotiable. A future implementation may change one only through an explicit architecture decision that updates every affected flow, state machine, API contract, test, and screen specification.

## Product identity

1. CARATOM is a real doorstep automotive-service operation translated into a consumer and operations platform.
2. Job scope, field execution, inventory, invoices, and payment must correspond to real operational records.
3. The product must not become a generic marketplace, workshop ERP, generic booking template, or cosmetic automotive skin over unrelated workflows.
4. Customer, technician, and admin are distinct products sharing one API. Technician is not a role switch in the customer app.
5. Admin is the audited operational recovery surface. It can correct or advance work when the normal flow fails, but cannot fabricate a Razorpay capture.

## Customer-flow rules

6. General Service supports zero or more optional add-on repairs.
7. General Service always presents a server-authoritative estimated invoice before booking finalization.
8. General Service without add-ons does not require a service-advisor call.
9. General Service with one or more add-ons requires advisor confirmation before booking finalization.
10. Advisor requirement is determined by backend policy, not by scattered UI checks.
11. If an advisor changes scope, quantities, labour, parts, discount, tax, or price, the accepted estimate becomes superseded and the customer must accept the revised version.
12. Rejecting an estimate returns the customer to an editable job card. It does not delete their concerns or draft.
13. One-man Job is a named, usually one-visit offering for focused work such as lights, sensors, panels, and small fits. It uses the shortest valid direct-booking flow by default.
14. Special Services are distinct catalog offerings and may use a direct booking flow. They must not be dragged through General Service, add-on discovery, estimate acceptance, or advisor steps unless their configured policy genuinely requires those steps.
15. A One-man Job may be escalated to advisor or Inspection + Repair when scope, compatibility, parts, or price cannot be credibly confirmed.
16. Inspection-and-repair is a separate two-visit policy for uncertain work. It must not be collapsed into a single appointment or confused with a known add-on repair.
17. The UX must not force unnecessary steps. Screens exist because the user or operation needs them, not because a generic funnel template expects them.
18. Customer and definitive vehicle details are collected at booking finalization, not unnecessarily before service exploration and scope selection.
19. A lightweight vehicle context may be selected earlier for compatibility and personalization, but it is not automatically a saved garage vehicle.
20. Authentication may be deferred while browsing. It becomes mandatory for remote persistence, advisor contact, booking, payments, and account history.
21. An advisor call needs a verified reachable phone number. “Customer details later” refers to fulfillment profile/address collection, not permission to call an unknown number.

## Commercial rules

20. Financial calculations have server authority. Clients may display cached server snapshots but never originate totals.
21. An estimate is not necessarily the final invoice.
22. Estimates are immutable versions. Editing commercial inputs creates a new version and supersedes the old one.
23. Customer acceptance records the exact estimate version, amount, currency, and timestamp.
24. Any post-acceptance material price change requires renewed consent unless it is an explicitly configured and disclosed reduction.
25. Discounts, tax, parts advances, and eligible second-vehicle discounts are calculated on the server.
26. Razorpay webhooks and server verification, not the client success callback, determine online payment success.
27. Offline cash or direct-UPI payments may be recorded only by admin with method, reference/note, actor, and audit record.
28. Technicians may record recommended or fitted parts and labour but cannot set customer selling prices.

## Scheduling and fulfillment rules

29. A slot is capacity, not merely a date-time label.
30. Slot eligibility considers service area, duration, skill, operating calendar, resource capacity, existing holds/bookings, and operational buffers.
31. Slot selection creates a short-lived server hold. Booking confirmation consumes that hold transactionally.
32. The system prevents double booking with database constraints/locking and idempotent confirmation.
33. All timestamps are stored in UTC; customer and operations presentation defaults to Asia/Kolkata for the initial Indian deployment.
34. Each scheduled doorstep attendance is a `Visit`. Inspection-and-repair has at least an inspection visit and a repair visit.
35. Fitted parts must be traceable to job, vehicle, customer, technician, and inventory movement.

## Architecture rules

36. Business rules live in backend domain/application services. UI consumes flow decisions and allowed actions.
37. Customer and technician clients never write job, estimate, invoice, inventory, or payment truth directly through Supabase PostgREST.
38. Lifecycle transitions are server validated and append history/audit events.
39. Separate lifecycle machines are used for Job Card, Estimate, Advisor Case, Booking, Visit, Invoice, and Payment.
40. A composed read model supplies the simple progress label shown to customers.
41. The backend remains a modular monolith until team or scaling evidence justifies another boundary.
42. External integrations are behind ports/adapters so SMS, WhatsApp, maps, storage, and payment vendors can change without rewriting domain rules.
43. Mutating APIs that can be retried use idempotency keys.
44. Long waits are modeled as persisted state plus timestamps and worker reminders, not in-memory workflows.
45. Admin overrides require reason, actor, before/after values, and an audit event.

## UX and design rules

46. The design must be intentional, credible, practical, premium, human, automotive, trustworthy, and operationally real.
47. The inspiration screenshots define interaction density, vehicle imagery, hierarchy, and merchandising style; they are not instructions to copy brand identity.
48. The customer UI is mostly white and warm/cool neutral. Light blue is a restrained interaction accent, not a full blue wash.
49. Real automotive photography, vehicle cutouts, technicians, vans, tools, parts, and service evidence provide visual energy.
50. No excessive gradients, glassmorphism, blur, floating cards, pills, shadows, decorative widgets, emojis, or giant hero typography.
51. Use rounded containers only when they group meaningful content. Lists and open sections are preferred when cards add no hierarchy.
52. Blue is reserved for primary actions, active navigation, selected states, links, and selected informational emphasis. Green is success/trust; amber is caution; red is urgent/SOS/destructive.
53. Copy is concise, practical, Indian-market appropriate, and specific. Do not use generic “seamless journey” language.
54. Every major customer action must be understandable without automotive expertise.
55. Both iOS and Android are first-class. Mobile is not a squeezed web layout.
56. Accessibility, loading, empty, error, and recovery states are part of initial implementation, not polish.

## Security and privacy rules

57. Never trust client-provided role, price, total, status, slot availability, payment result, or ownership identifier.
58. Auth tokens are stored only in platform-secure storage. Drafts must not contain payment secrets or unnecessary sensitive data.
59. Storage buckets for inspection/customer media are private; access uses short-lived signed URLs.
60. Logs and analytics avoid raw phone numbers, full addresses, registration numbers, free-text concerns, payment identifiers, and photo URLs unless a restricted diagnostic path explicitly requires them.
61. Authorization is enforced per resource and action, not only per screen or app.
62. Destructive admin actions require confirmation, reason, and audit.

## Delivery rules

63. Build vertical slices that leave the repository deployable and testable.
64. Do not begin with a complete design-system library, workflow engine, microservices, AI, automatic dispatch, or full warehouse ERP.
65. Phase 1 must pin exact supported toolchain versions in manifests and lockfiles; architecture documents intentionally do not guess versions that do not yet exist in the repo.
66. Each business rule receives unit tests, API integration tests, and at least one flow-level test before the corresponding phase is complete.
67. Existing decisions are respected unless a documented decision record explains why they changed.
