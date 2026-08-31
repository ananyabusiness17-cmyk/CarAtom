# 18 — Implementation roadmap

Each phase leaves a coherent, testable repository. Do not start the next phase while the previous phase lacks its acceptance criteria.

## Phase 0 — Foundation and decisions

Objective: create the monorepo, pin supported versions, and make local development reproducible.

Work: workspace package manager, Expo customer/technician shells, Next.js admin shell, FastAPI shell, shared contracts, lint/typecheck/test tooling, env examples, Docker/dev services, ADR for exact versions, CI skeleton.

Acceptance: all four runtimes start locally; health endpoint responds; no secrets committed; CI runs checks.

## Phase 1 — Identity, catalog, and design foundation

Work: Supabase Auth integration, profile/role loading, token storage, API client, catalog tables/migrations/seed, service-area baseline, design tokens/assets pipeline, Home/service detail read-only customer screens, admin catalog read-only.

Tests: auth/role, catalog seed, DTOs, Home loading/empty/error, contrast/accessibility baseline.

Definition of done: a guest can browse the reference-inspired home and service detail; authenticated session is recognized by API; catalog is server data.

## Phase 2 — General Service no-add-on vertical slice

Work: Job Card aggregate, concerns, server pricing/Estimate v1, acceptance, customer details, definitive vehicle, address, serviceability, slot generation/hold/booking, customer order/confirmation, admin job read model.

Tests: no-add-on advisor bypass, estimate version, slot race/idempotency, full E2E booking.

Definition of done: a customer can complete General Service without add-ons and never sees advisor steps; admin can inspect the resulting record.

## Phase 3 — General Service add-ons and advisor

Work: repair catalog/search/categories, multiple add-ons, compatibility, pricing lines, AdvisorCase/call attempts/notes, admin inbox, revised estimates, acceptance/edit loop, notifications.

Tests: advisor required only with add-ons, unchanged/revised/rejected/unreachable outcomes, no lost draft, server totals.

Definition of done: add-on booking cannot finalize before advisor confirmation and current estimate acceptance; no-add-on path remains unchanged.

## Phase 4 — One-man Job and Direct Special Services

Work: explicit One-man Job catalog and policy, direct service detail/book flow, fixed/starting price disclosure, policy-driven duration/slot behavior, escalation to advisor/Inspection + Repair when scope is unclear, admin configuration, then the additional Direct Special Service catalog entries.

Tests: One-man path skips General Service/add-on/advisor screens when fixed-scope; ambiguous One-man escalation; direct path skips unnecessary screens; inactive/ineligible service handling; booking money/slot truth.

Definition of done: a customer can book a fixed-scope One-man Job in the minimum necessary steps, and the system safely escalates a job that cannot be priced or matched.

## Phase 5 — Technician field execution

Work: technician provisioning/role, assigned visits, navigation/check-in, service visit, inspection visit, photos/signed uploads, fitted parts/labour, QC, offline queue, admin dispatch.

Tests: role boundaries, visit transitions, upload ownership, offline replay idempotency, QC failure/rework.

Definition of done: an assigned technician can execute a service visit and an inspection visit with evidence; customer/admin see status updates.

## Phase 6 — Inspection-and-repair commercial loop

Work: inspection findings, estimate from inspection, approval/rejection, parts advance policy, parts readiness, visit 2 booking, repair execution, final invoice.

Tests: two visits remain distinct, approval and parts payment gates, estimate changes, payment failures, final invoice derivation.

Definition of done: the full complex workflow works without being confused with General Service add-ons.

## Phase 7 — Money, closure, and history

Work: Razorpay order/webhook adapter, payment reconciliation, invoice PDF/storage, balance payment, reviews, vehicle service history, customer notifications.

Tests: duplicate/delayed webhooks, payment verification pending, refund/void rules, invoice totals, review idempotency.

Definition of done: paid/completed jobs produce trustworthy invoice, payment, rating, and history records.

## Phase 8 — Admin control plane and inventory

Work: omnipotent admin job editor/override, audited transitions, on-behalf booking, offline payments/refunds, inventory stock/movements/job usage/customer usage, technician dossiers, reports/settings.

Tests: audit reason enforcement, admin recovery, stock conservation, parts traceability, restricted technician/customer views.

Definition of done: operations can recover a stuck job and answer what part was used on which vehicle by whom.

## Phase 9 — Hardening and release readiness

Work: performance budgets, accessibility pass, device matrix, deep links, notification delivery, rate limits, retention/privacy, crash/logging, backup/restore drills, store builds, Railway deployment, runbooks.

Definition of done: release candidate passes E2E, security, accessibility, performance, migration, and operational acceptance.

## Deliberately later

Automatic dispatch, full PostGIS optimization, live turn-by-turn tracking, supplier procurement ERP, multi-city tenancy, AI inspection, pgvector history search, Temporal, arbitrary workflow builders, and a full CMS.
