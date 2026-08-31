# 05 — Technical architecture

## System shape

Use a TypeScript/Python monorepo and a modular FastAPI monolith. Keep domain modules cohesive and communicate through application services and typed contracts.

```text
apps/customer       Expo Router mobile client
apps/technician     Expo Router field client
apps/admin          Next.js App Router operations client
packages/api-client generated/manual typed HTTP client
packages/contracts  shared JSON-schema/Zod-compatible transport types
packages/ui         thin cross-mobile primitives only where reuse is real
backend             FastAPI, SQLAlchemy, Alembic, workers
```

## Runtime services

- API: FastAPI behind HTTPS on Railway.
- Worker: ARQ process on Railway using Redis for jobs, locks, retries, and notification fan-out.
- Admin: Next.js standalone deployment on Railway.
- Database/Auth/Storage: Supabase.
- Payment: Razorpay adapter and verified webhook endpoint.
- Messaging: provider adapter for SMS/WhatsApp; Expo Push for mobile notifications.
- Maps: MapLibre/OpenStreetMap adapter; no Google Maps dependency in MVP.

## Request lifecycle

1. Client sends Supabase JWT, app version, request id, and idempotency key for retryable writes.
2. API verifies JWT through cached Supabase JWKS and loads Profile/role.
3. Router validates transport schema and delegates to an application command/query.
4. Domain service loads required aggregates in one transaction, enforces policy, and emits domain events/outbox records.
5. Repository commits state and audit/history atomically.
6. Worker publishes notifications/integration calls from durable outbox records.
7. Response includes resource version, allowed actions, and relevant flow decision.

## Module boundaries

Backend modules:

`auth`, `profiles`, `vehicles`, `addresses`, `catalog`, `job_cards`, `pricing`, `advisor`, `bookings`, `slots`, `visits`, `technicians`, `inspections`, `parts`, `inventory`, `estimates`, `invoices`, `payments`, `notifications`, `reviews`, `support`, `admin`, `audit`.

Each module may contain `router.py`, `schemas.py`, `service.py`, `policy.py`, `models.py`, and tests. A module may call another module’s application service, not its SQL tables directly, when a cross-boundary invariant exists.

## API style

- REST under `/v1` for customer, technician, and admin clients.
- Resource-oriented endpoints plus explicit command endpoints for transitions (`accept`, `reject`, `hold`, `confirm`, `start`, `complete`).
- Cursor pagination for job boards, catalog search, notifications, and history.
- ISO 8601 timestamps with UTC `Z`; INR minor-unit integers for money.
- Problem Details-style errors: `code`, `message`, `field_errors`, `retryable`, `current_state`, `allowed_actions`, `request_id`.
- OpenAPI generated from FastAPI is the contract source; client types are generated or checked against it.

## Data and migrations

PostgreSQL is the source of truth. SQLAlchemy models are explicit; Alembic migrations are committed. Use foreign keys, check constraints, unique indexes, partial indexes for active versions/holds, and optimistic version columns.

Use an outbox table for notifications and provider effects. Redis is not business truth.

## Authentication and authorization

Supabase Auth issues JWTs. FastAPI verifies JWT signature/claims through JWKS and loads role from `profiles`. Do not create a second auth system.

Authorization is checked in application services against resource ownership, assignment, and role:

- Customer: own profile, vehicles, addresses, Job Cards, bookings, estimates, invoices, payments, reviews.
- Technician: assigned Visits, restricted Job Card read model, own evidence/parts/labour/location.
- Admin: all resources and commands, with audited override requirements.

## Storage and media

FastAPI creates signed upload/download URLs for private Supabase Storage. Technician photo upload uses a staged asset record, checksum, MIME/size validation, and resumable retry metadata where practical. Images are resized/compressed on-device and optionally post-processed by worker. The API stores paths and metadata, not binary blobs.

## Time and scheduling

Persist UTC instants. Interpret service hours and slot displays in `Asia/Kolkata` initially. The slot service receives a service area, offering, vehicle, address, and date range; it returns generated availability with operational reasons for exclusions.

Hold/confirm is a transaction with row/advisory locks and a unique overlap strategy. Do not use Redis-only locks for final capacity correctness.

## Notifications

Business events enqueue durable notification intents: estimate ready, advisor call requested, slot confirmed, technician assigned/ETA, parts advance due, payment verified, visit complete, invoice due, and job complete. Templates are versioned and channel-specific. Delivery is eventually consistent and visible in admin.

## Observability

Every request has a request id and structured log context. Record state transitions, integration attempts, latency, and failure codes. Redact sensitive fields. Railway logs are the MVP baseline; GlitchTip is optional later. Do not add Sentry Cloud to the critical path.

## Configuration

Environment variables hold secrets and deployment settings. Catalog, policy, service areas, hours, discounts, and parts-advance percentage are database/admin settings with effective dates and audit. Never commit secrets or provider credentials.

## Decision records

When changing a frozen choice, add a short ADR under `docs/architecture/decisions/` with decision, context, alternatives, consequences, and migration path. This is the mechanism for future evolution rather than silent drift.

