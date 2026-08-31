# 00 — Architecture overview

## Status and authority

This directory is the implementation constitution for CARATOM. It is based on:

- the former root architecture specification;
- the historical stack draft;
- the interactive phone walkthrough;
- all six customer-home inspiration screenshots;
- the product direction established in conversation; and
- the architecture master prompt that introduced the canonical General Service branching rule.

When documents disagree, the order of authority is:

1. `01-product-constitution.md`;
2. the explicit flow and state documents in this directory;
3. the remaining documents in this directory;
4. `docs/CARATOM-client-walkthrough.html` for screen intent only;
5. the inspiration screenshots for aesthetic and interaction references; and
6. `POSSIBLE ARCHITECTURE.MD` as historical context only.

## Repository findings

The repository currently contains no application implementation.

Confirmed present:

- two architecture Markdown files;
- one static, interactive HTML walkthrough;
- six screenshot references and their README;
- a `.codex` directory with no application source; and
- no Git metadata at the workspace root.

Confirmed absent:

- `package.json`, lockfiles, Expo configuration, Next.js configuration, Python packaging, and dependency manifests;
- customer, technician, admin, or backend source directories;
- routes, components, state stores, API clients, authentication code, database models, migrations, tests, CI, Dockerfiles, and deployment configuration;
- application assets other than the reference screenshots; and
- Git history that could reveal previous implementation decisions.

Therefore, there is no code to preserve, refactor, or delete. Existing product and stack decisions are preserved where compatible, and contradictions are resolved explicitly below rather than inferred from nonexistent code.

## Product definition

CARATOM is an operating system for a real doorstep car-care company. Customers discover services, describe work, receive an estimate where appropriate, complete advisor clarification only when policy requires it, book a doorstep slot, follow service execution, pay, and retain a trustworthy vehicle-service record.

The product is not a workshop ERP, an open mechanic marketplace, a generic appointment application, or a single mobile UI. It has three operational surfaces sharing one domain:

- Customer mobile: service discovery, job-card construction, scope acceptance, booking, status, payment, history, and support.
- Technician mobile: assigned visits, navigation, inspection, evidence, fitted parts, labour, QC, and offline recovery.
- Admin web: advisor queue, pricing, dispatch, scheduling, customers, technicians, inventory, money, overrides, content, and audit.

## Canonical service model

Every sellable `ServiceOffering` declares a server-owned `flow_policy`. The first release supports four named offerings/policies: General Service, One-man Job, Direct Special Service, and Inspection + Repair. One-man Job is a direct-bookable offering, but it remains explicitly named because its commercial intent and operational constraints are different from other special services.

### `GENERAL_SERVICE`

A structured base service with included items, concerns, and optional add-on repairs. It always produces a server-authoritative estimated invoice before booking finalization.

- No add-ons: advisor is not required.
- One or more add-ons: advisor confirmation is required.
- If the advisor changes scope or price, the estimate is revised and the customer must accept the new version.

### `ONE_MAN`

A small, usually one-visit job such as lights, a sensor, a panel, a minor electrical fix, or another focused fit. The catalog supplies the starting price, expected duration, required skill, and whether parts may be needed.

- Default customer path is service detail -> details -> vehicle -> address -> slot -> confirmation.
- No General Service job-card/add-on funnel is required.
- No advisor call is required for a configured fixed-scope One-man Job.
- If the customer request is ambiguous, the selected work is incompatible, or parts/scope cannot be credibly confirmed, the backend may route the request to an advisor or to Inspection + Repair.
- If parts are discovered on site, the technician records them and admin publishes/adjusts the commercial estimate; the technician never sets the selling price.

### `DIRECT_SPECIAL`

A simple, individually bookable special service. It does not inherit General Service steps. The default path is details, vehicle, slot, confirmation. A fixed or starting price is shown in the booking summary, with policy-driven disclosures.

Examples include a fixed-scope One-man Job, tyre service, battery assistance, glass replacement, or another operationally simple offering. The catalog, not UI branching, determines which are active and direct-bookable. `ONE_MAN` is the named core offering; `DIRECT_SPECIAL` is the extensible policy for additional offerings with the same reduced workflow.

### `INSPECTION_REPAIR`

A deliberately separate, complex offering for uncertain repair work. It uses an inspection visit followed by findings, an estimate, approval, parts advance when required, parts readiness, and a second repair visit.

This policy preserves the earlier two-visit CARATOM differentiator. It is not the same as adding a known, catalogued repair to General Service.

## Resolved contradictions

### Advisor after every job versus advisor only for add-ons

The former specification sent every customer submission to `pending_advisor`. That rule is superseded.

Canonical rule: General Service without add-ons bypasses the advisor. General Service with add-ons requires the advisor. A fixed-scope One-man Job bypasses the advisor by default. Other Direct Special Services bypass the advisor unless the offering is explicitly configured with another policy. Inspection-and-repair follows its own inspection/advisor/approval lifecycle.

### Customer and vehicle details early versus late

The former walkthrough selected a vehicle on the home screen. The new product direction intentionally collects fulfillment details late.

Canonical interpretation:

- vehicle selection on Home is optional context used to personalize compatibility and imagery;
- it is not a persisted customer vehicle until finalization;
- browsing, job-card composition, and a preliminary server estimate can occur without a saved customer profile;
- authentication is required when identity is operationally needed: requesting an advisor call, saving progress remotely, or beginning booking finalization;
- customer name/address and the definitive vehicle record are collected after scope acceptance or advisor confirmation.

If definitive vehicle details change price or compatibility, the estimate is invalidated and reissued before slot confirmation.

### Doorstep scheduling versus workshop scheduling

The master prompt mentions service centers/workshops as a possibility. Existing CARATOM decisions are doorstep-first. The scheduling architecture therefore models `ServiceArea`, technician skills, duration, van/equipment capacity, and travel buffers. A physical workshop can be added later as another fulfillment location without changing customer flow contracts.

### One overloaded job status versus coordinated lifecycles

The former architecture put advisor, inspection, repair, invoice, and payment phases in one `job_cards.status` column. That is too ambiguous for the new branching rules.

Canonical architecture uses separate state machines for Job Card, Estimate, Advisor Case, Booking, Visit, Invoice, and Payment. A read model produces a single customer-facing progress state.

## Technology direction retained

- Expo React Native and TypeScript for separate customer and technician apps.
- Next.js App Router and TypeScript for admin web.
- FastAPI, Pydantic, SQLAlchemy, and Alembic as a modular monolith.
- Supabase PostgreSQL, Auth, private Storage, and narrowly used Realtime.
- Redis plus ARQ for reminders, delivery retries, and asynchronous processing.
- Razorpay for Indian payments with webhook authority.
- Railway for API, worker, Redis, and admin deployment.
- MapLibre and OpenStreetMap where map quality is adequate.
- No direct client writes to financial or job data through PostgREST.

Exact frontend package versions do not exist yet and must not be invented in architecture. Phase 1 must select currently supported stable versions, pin them in manifests and lockfiles, and record them in an ADR. Python 3.12 remains the backend baseline unless a verified dependency incompatibility is found during scaffolding.

## Architectural shape

```text
Customer Expo app        Technician Expo app        Admin Next.js app
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                       FastAPI modular monolith
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
 Supabase PostgreSQL       Supabase Storage          Redis / ARQ
 Auth and domain data      private media/PDFs        jobs, locks, retries
                                  |
                         External integrations
                 Razorpay, Expo Push, SMS/WhatsApp, maps
```

## Aggregate and authority boundaries

`JobCard` is the commercial-scope aggregate root. It owns selected service, concerns, requested repairs, estimate references, and readiness for booking.

`Booking` owns scheduled fulfillment and visits. It references a scope-confirmed Job Card and cannot silently mutate its accepted commercial scope.

`Invoice` owns the final amount due. Estimates are informative commercial proposals; invoices reflect actual approved and completed work.

The backend is authoritative for:

- flow policy and advisor requirement;
- service and add-on eligibility;
- estimates, taxes, discounts, and totals;
- legal lifecycle transitions;
- slot capacity, holds, and confirmation;
- payment state;
- invoice totals; and
- admin overrides and audit.

Clients own only presentation state, form state, safe local drafts, and offline queues.

## Quality objectives

The architecture is optimized for:

- explicit product rules rather than screen conditionals;
- a low-friction customer journey;
- operational recovery by admin staff;
- trustworthy money and scheduling behavior;
- a credible Indian automotive experience;
- offline-tolerant technician work;
- accessibility and legibility;
- incremental vertical-slice delivery; and
- a small team maintaining one modular backend rather than microservices.

## MVP boundary

MVP includes the three service policies, customer booking, advisor cases, technician visit execution, inspection evidence, estimates, invoices, Razorpay, manual dispatch, basic inventory consumption, profile/history, notifications, and audited admin recovery.

MVP excludes automatic dispatch, full procurement ERP, turn-by-turn live tracking, AI inspection, multi-tenant SaaS, Temporal, a full CMS, and arbitrary workflow builders.

## Decision register

### Three separate clients

- Decision: separate customer Expo, technician Expo, and admin Next.js clients behind one API.
- Why: their devices, permissions, offline needs, and primary tasks differ materially.
- Alternatives rejected: one role-switched mobile app (unsafe field/admin coupling); technician screens inside admin (poor camera/GPS/offline ergonomics).
- Consequence: shared contracts and tokens are important, but screen code is intentionally not duplicated into one universal app.
- Migration: a shared design/contract package can grow without merging runtimes.

### FastAPI modular monolith

- Decision: one modular FastAPI backend with explicit application/domain services.
- Why: one team needs transactionally consistent pricing, scheduling, jobs, and money without distributed-system overhead.
- Alternatives rejected: microservices (premature operational complexity); direct Supabase/PostgREST writes (business rules and financial authority become bypassable).
- Consequence: module boundaries and database ownership must remain disciplined.
- Migration: extract a module only after measured load/team/ownership evidence, preserving API contracts and event boundaries.

### Policy-based customer flows

- Decision: every ServiceOffering declares a server-owned `flow_policy`; General Service branches on add-ons, Special Services can be direct, Inspection-and-repair is separate.
- Why: the user must not experience unnecessary steps, and advisor need is a business rule rather than a screen convention.
- Alternatives rejected: one universal funnel; frontend conditionals based on service names.
- Consequence: the API returns FlowDecision and clients need explicit flow coordinators.
- Migration: add a new policy only with its own state/flow/test/specification set.

### Separate lifecycle machines

- Decision: Job Card, Estimate, Advisor Case, Booking, Visit, Invoice, and Payment each have independent states plus a composed customer progress read model.
- Why: advisor changes, inspection, capacity, money, and field execution can progress or fail independently.
- Alternatives rejected: one overloaded Job Card status column; an external workflow engine in MVP.
- Consequence: more explicit data and read-model composition, but safer recovery and audit.
- Migration: a workflow engine can consume persisted transitions later; it must not replace domain truth without a migration plan.

### Server-authoritative money and capacity

- Decision: pricing, tax, discounts, estimate versions, slot holds, booking confirmation, and payment state are decided server-side.
- Why: client arithmetic and availability are untrusted and race-prone.
- Alternatives rejected: client-calculated totals; Redis-only slot locks; client payment-success callbacks.
- Consequence: every irreversible client action is a command with version/idempotency checks.
- Migration: payment or scheduling providers can change behind adapters without changing domain invariants.

### Late definitive details

- Decision: allow browsing and scope construction before requiring customer, vehicle, and address finalization; retain optional local vehicle context.
- Why: the product explicitly avoids collecting fulfillment information before the user understands the service.
- Alternatives rejected: mandatory onboarding/vehicle registration on first open; silently treating a browse context as a saved vehicle.
- Consequence: finalization can trigger compatibility/repricing and must handle that loop honestly.
- Migration: remote guest drafts or cross-device continuity can be added without changing the finalization contract.

### Mostly neutral visual language with restrained light blue

- Decision: white/near-white surfaces, dark text, real automotive imagery, and selective light-blue interaction accents.
- Why: it preserves the supplied references’ consumer density and warmth without making the app a monochrome blue SaaS skin.
- Alternatives rejected: full yellow palette from one reference; full blue wash; generic gradients/glassmorphism.
- Consequence: asset quality, hierarchy, and semantic color usage matter more than decorative styling.
- Migration: brand colors can be retuned through tokens without changing component semantics.

### One vehicle per Job Card; BookingGroup for multi-car

- Decision: a Job Card has one primary vehicle; multiple concurrent cars coordinate through BookingGroup.
- Why: each car can have independent scope, estimate, advisor need, duration, slot, technician, and invoice.
- Alternatives rejected: many vehicles hidden inside one aggregate (ambiguous ownership and state); a second checkout product.
- Consequence: multi-car discount/coordination is a later slice with explicit grouping.
- Migration: add shared checkout and adjacent-slot optimization around existing Job Cards.
