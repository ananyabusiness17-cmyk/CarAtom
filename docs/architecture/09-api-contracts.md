# 09 — API contracts

The API is versioned under `/v1`. OpenAPI generated from FastAPI is authoritative once implementation begins. The examples below define the required semantic shape, not a reason to duplicate every nested object in this document.

## Common conventions

Headers: `Authorization: Bearer <supabase-jwt>`, `X-Request-Id`, `Idempotency-Key` for retryable writes, `X-App-Version`.

Money: `{ "amount_minor": 299900, "currency": "INR" }`.

Errors: `{ "code": "SLOT_UNAVAILABLE", "message": "That time was just taken.", "retryable": true, "current_state": "HOLD_EXPIRED", "allowed_actions": ["LIST_SLOTS"], "field_errors": [], "request_id": "..." }`.

## Auth/profile

```text
GET  /v1/me
PATCH /v1/me
GET  /v1/me/vehicles
POST /v1/me/vehicles
PATCH /v1/me/vehicles/{vehicle_id}
GET  /v1/me/addresses
POST /v1/me/addresses
PATCH /v1/me/addresses/{address_id}
GET  /v1/me/notifications
```

Supabase Auth handles OTP/session issuance. FastAPI exposes profile completion and role-aware account data, not a second password/OTP system.

## Catalog

```text
GET /v1/catalog/home
GET /v1/services?flow_policy=...
GET /v1/services/{slug}
GET /v1/repair-categories
GET /v1/repair-offerings?query=&category_id=&vehicle_id=
GET /v1/one-man-jobs
GET /v1/special-services
```

Catalog responses include media, display price, duration, disclosures, `flow_policy`, and capability flags. Internal cost is never returned to customers.

## Job Cards and pricing

```text
POST /v1/job-cards/preview
POST /v1/job-cards
GET  /v1/job-cards/{id}
PATCH /v1/job-cards/{id}
POST /v1/job-cards/{id}/concerns
DELETE /v1/job-cards/{id}/concerns/{concern_id}
POST /v1/job-cards/{id}/items
PATCH /v1/job-cards/{id}/items/{item_id}
DELETE /v1/job-cards/{id}/items/{item_id}
POST /v1/job-cards/{id}/price
GET  /v1/job-cards/{id}/estimates
POST /v1/job-cards/{id}/estimates/{estimate_id}/accept
POST /v1/job-cards/{id}/estimates/{estimate_id}/reject
```

`POST /price` returns the Estimate plus `FlowDecision`. `accept/reject` requires expected estimate version/hash and is idempotent.

## Advisor

```text
POST /v1/job-cards/{id}/advisor-case
GET  /v1/job-cards/{id}/advisor-case
POST /v1/advisor-cases/{id}/reschedule-call
POST /v1/advisor-cases/{id}/notes        # admin
POST /v1/advisor-cases/{id}/resolve      # admin
```

Admin resolution commands can confirm unchanged scope, publish a revised estimate, mark unreachable, or cancel with reason. Customers see safe status and next action, not internal notes.

## Checkout and slots

```text
POST /v1/job-cards/{id}/finalization
GET  /v1/job-cards/{id}/slots?from=&to=&visit_type=
POST /v1/job-cards/{id}/slot-holds
POST /v1/job-cards/{id}/book
POST /v1/bookings/{id}/cancel
POST /v1/bookings/{id}/reschedule
GET  /v1/bookings/{id}
```

Finalization validates customer, vehicle, address, compatibility, estimate freshness, and advisor scope. `book` consumes a valid hold and is idempotent.

## Technician

```text
GET  /v1/technician/visits?date=
GET  /v1/technician/visits/{id}
POST /v1/technician/visits/{id}/en-route
POST /v1/technician/visits/{id}/check-in
POST /v1/technician/visits/{id}/start-inspection
POST /v1/technician/visits/{id}/start-service
POST /v1/technician/visits/{id}/inspection-findings
POST /v1/technician/visits/{id}/parts
POST /v1/technician/visits/{id}/labour
POST /v1/technician/visits/{id}/qc
POST /v1/technician/visits/{id}/complete
POST /v1/technician/location-pings
POST /v1/media/signed-upload
```

Technician response DTOs omit selling price edit authority. The API accepts fitted lines but maps price from approved/admin data.

## Customer money and closure

```text
GET  /v1/bookings/{id}/invoice
POST /v1/invoices/{id}/payment-order
GET  /v1/payments/{id}
POST /v1/reviews
POST /v1/support-tickets
```

`POST /v1/payments/webhook/razorpay` is unauthenticated at the JWT layer but protected by provider signature and replay/idempotency checks.

## Admin

Admin routes are namespaced under `/v1/admin` and require `admin` role:

```text
GET/POST/PATCH /v1/admin/advisor-cases
GET/PATCH       /v1/admin/job-cards/{id}
POST            /v1/admin/job-cards/{id}/override
POST            /v1/admin/job-cards/{id}/estimate
POST            /v1/admin/jobs/{id}/assign
GET             /v1/admin/dispatch
GET/POST/PATCH  /v1/admin/catalog/...
GET/POST        /v1/admin/inventory/...
GET/POST        /v1/admin/payments/...
GET             /v1/admin/technicians/{id}/dossier
GET             /v1/admin/audit-logs
```

Every command response returns the updated resource/read model and audit reference when applicable.
