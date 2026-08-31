# 15 — Testing strategy

## Unit tests

Python domain tests cover:

- flow-policy evaluation for General Service with and without add-ons;
- One-man Job and fixed-scope Direct Special Service bypass;
- Inspection-and-repair policy;
- deterministic estimate calculation, tax, rounding, discount, parts advance;
- estimate versioning and acceptance/rejection;
- advisor requirement and outcome rules;
- vehicle/service compatibility;
- slot eligibility and hold expiry;
- lifecycle transition legality and permission;
- invoice derivation and payment allocation;
- inventory consume/reverse invariants.

TypeScript unit tests cover DTO parsing, selectors, formatting, flow coordinator route decisions, local draft migrations, offline queue reducers, and accessibility-friendly copy/state mapping.

## API integration tests

Run against a disposable PostgreSQL/Supabase-compatible environment with migrations:

- JWT role/ownership authorization;
- create/price/edit Job Card;
- accept/reject and supersede Estimate;
- advisor case and revised estimate;
- serviceability and slot hold/confirm race;
- idempotent booking retry/duplicate request;
- technician assignment and restricted views;
- inspection evidence metadata and signed upload authorization;
- invoice/payment/webhook reconciliation;
- admin override/audit and offline payment;
- outbox retry and notification idempotency.

## Mobile UI tests

React Native Testing Library covers:

- General Service without add-ons: no advisor screen, direct finalization;
- General Service with add-ons: estimate -> advisor -> revised estimate path;
- add-on add/remove/search and edit loop;
- One-man Job with no unnecessary General Service/add-on/advisor screens;
- Direct Special Service with no unnecessary estimate/advisor screens;
- vehicle/address/slot validation;
- stale slot/estimate and offline recovery;
- technician inspection/service/QC and queued writes;
- payment verification-pending rendering.

## Admin UI tests

Playwright covers advisor inbox, estimate revision, dispatch, override reason dialog, inventory usage, technician dossier, offline payment distinction, and audit visibility.

## End-to-end critical paths

Use seeded catalog/test users and provider fakes:

1. Guest browses -> General Service no add-ons -> OTP -> details/vehicle/address -> slot -> booking.
2. General Service with two add-ons -> estimate -> accept -> advisor changes one line -> new acceptance -> booking.
3. One-man Job -> details -> slot -> booking, with an escalation fixture for ambiguous scope.
4. Direct Special Service -> details -> slot -> booking.
5. Inspection-and-repair -> inspection slot -> technician findings -> estimate approval -> parts advance -> repair slot -> QC -> invoice/payment.
6. Slot race: two clients compete; exactly one booking succeeds.
7. Payment webhook delayed/duplicated; invoice settles exactly once.
8. Technician offline photo/status queue drains without duplicate events.
9. Admin recovery skips/reverses a state with required audit reason.

## Contract and migration tests

Validate OpenAPI/DTO compatibility, database migration up/down where supported, seeded catalog invariants, and snapshot/public-reference stability. Run accessibility checks on representative screens.

## Quality gates

Every phase must pass lint/typecheck, unit tests, affected integration/UI tests, and a manual acceptance checklist. No phase is “done” with only a screenshot or happy-path render.
