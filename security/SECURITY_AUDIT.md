# CARATOM security audit (Phase 1–10)

Dated: 2026-08-31. Full repository through completed Phase 10 Admin Mobile Ops.

Scanners: Semgrep, Gitleaks, OSV-Scanner, optional ZAP (local API). Manual review used Trail of Bits `audit-context-building`, `insecure-defaults`, `sharp-edges`, `variant-analysis` (authz), `fp-check`, `agentic-actions-auditor`.

Never paste live secrets here.

## Findings

### SEC-001 — Service-role returned to clients (CRITICAL) — fixed

- **Where:** `backend/app/modules/media/storage.py` (`SupabaseStorage.create_signed_upload`)
- **Attack:** A signed-upload response included `Authorization: Bearer {service_role}`. Any Expo client could use the service-role key against Supabase Storage (and typically the project).
- **Remediation:** Mint a Storage signed upload URL server-side. Return `Content-Type` only. `MediaService` rejects any `Authorization`/`Bearer` client headers.
- **Verification:** `test_signed_upload_for_assigned_visit` asserts no Bearer headers; `test_supabase_signed_upload_headers_omit_service_role` mocks Storage and asserts the client header map.

### SEC-002 — Ungated payment capture (HIGH) — fixed

- **Where:** `POST /v1/dev/payments/{id}/capture` in `inspection_repair/router.py`
- **Attack:** In a mis-set production environment the capture route could mark parts-advance paid without Razorpay.
- **Remediation:** `require_dev_environment()` — **404 when `ENV=production`**. Ownership via `get_accessible` remains.
- **Verification:** `test_payment_capture_hidden_in_production`.

### SEC-003 — Dev routes minted admin profiles (HIGH) — fixed

- **Where:** `simulate_router.py`, `dispatch/dev_router.py`
- **Attack:** Unauthenticated or customer callers in development received a newly inserted `profiles.role=admin` actor.
- **Remediation:** `require_dev_admin()` — env gate plus existing admin JWT. No guest admin inserts.
- **Verification:** `test_dev_simulate_requires_admin_in_development`, `test_dev_auto_assign_requires_admin`; advisor e2e uses `promote_admin`.

### SEC-004 — Media `visit_id` ownership (HIGH/MEDIUM) — fixed

- **Where:** `backend/app/modules/media/service.py`
- **Attack:** A customer who learned a visit UUID could attach media if checks applied only to technicians.
- **Remediation:** Technicians must be currently assigned; customers must own the job card; admins allowed. Unrelated customer → 403.
- **Verification:** `test_signed_upload_rejects_unassigned`, `test_signed_upload_customer_cannot_use_unrelated_visit`.

### SEC-005 — Unauthenticated geo + no API rate limits (MEDIUM) — fixed

- **Where:** `/v1/geo/*`, media signed-upload, support ticket create, `/v1/dev/*`
- **Attack:** Nominatim hammering; upload/ticket/dev brute force.
- **Remediation:** Optional JWT on geo (maps still work logged out). `RateLimitMiddleware` on those prefixes. Disabled under pytest.
- **Verification:** Geo unit tests still pass; middleware skips `PYTEST_CURRENT_TEST`.

### SEC-006 — WebView `originWhitelist=['*']` (MEDIUM) — fixed

- **Where:** `MapLibreView.tsx`, technician `MapPreview.tsx`, Razorpay checkout WebView
- **Attack:** A compromised or injected navigation could load arbitrary origins inside the WebView.
- **Remediation:** OSM/unpkg/MapLibre hosts from `osmMapHtml.ts`; Razorpay checkout limited to Razorpay hosts plus `about:blank`.
- **Verification:** Code review; maps still use `source={{ html }}` so `about:blank` / `about:srcdoc` remain allowed.

### SEC-007 — Inspection findings / payment IDOR (traced, already gated)

- **Where:** `GET /v1/job-cards/{id}/inspection-findings`, `GET /v1/payments/{id}`
- **Attack:** Another customer guessing UUIDs.
- **Remediation:** Both go through `JobCardService.get_accessible` (404 for other customers). Guest UUID access remains product-required (ACC-GUEST-UUID).
- **Verification:** `test_inspection_findings_not_readable_by_other_customer`, `test_parts_advance_payment_not_readable_by_other_customer`. Visit-2 booking still requires parts-advance + parts-ready (`test_visit2_blocked_until_advance_and_parts`).

### SEC-008 — OpenAPI in production (MEDIUM) — fixed

- **Where:** `backend/app/main.py`
- **Remediation:** `openapi_url` / docs / redoc disabled when `ENV=production`.

### SEC-009 — GitHub Actions permissions (LOW) — fixed

- **Where:** `.github/workflows/ci.yml`
- **Remediation:** Default `permissions: contents: read`. Security job uses full history checkout.

### SEC-010 — Mutable GitHub Action tags (MEDIUM) — fixed

- **Where:** `.github/workflows/ci.yml`
- **Attack:** A moved `v4`/`v5` tag could swap CI for a malicious action (ToB agentic-actions-auditor).
- **Remediation:** Pin `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/setup-python`, and `astral-sh/setup-uv` to full 40-character SHAs. OSV-Scanner is installed from a versioned GitHub release tarball, not an unpinned action.
- **Verification:** Semgrep `github-actions-mutable-action-tag` no longer matches the workflow.

### SEC-011 — Sequence `sqlalchemy.text` (LOW, fp-check) — mitigated

- **Where:** `backend/app/core/refs.py`
- **Attack claimed:** SQL injection via `nextval`.
- **Verdict:** False positive for user input. `seq_name` is allowlisted against `_STARTS`. `SELECT 1` health check no longer uses `sqlalchemy.text`.

## Accepted (see SECURITY_BASELINE.md)

- ACC-GUEST-UUID — guest orphan job-card UUID access
- ACC-NO-RLS — no Postgres RLS
- ACC-OFFLINE-QUEUE — technician AsyncStorage queue
- ACC-GEO-OPTIONAL-AUTH — geo without JWT, rate-limited
- ACC-DEV-CAPTURE — dev capture exists, 404 in production
- ACC-NPM-RELEASE-AGE — pnpm 9 has no `min-release-age`
- ACC-OSV-FREEZE — Expo 52 / FastAPI 0.115 lockfile advisories (see `osv-config.toml`)

## Scanner notes

- Semgrep custom rules fail the suite if service-role upload headers or ungated capture return.
- Gitleaks allowlists `.env.example` placeholders, Trail of Bits skill fixtures, and documentation `Idempotency-Key` header names. Output is `--redact`.
- OSV: do not bump Expo 52 or FastAPI unless exploitable and compatible. Ignored freeze packages live in `osv-config.toml` (includes Next-pinned postcss and Expo-transitive sharp/tar/uuid).
- ZAP: skipped (not a pass) when `/health` is down **or** the Docker daemon is unavailable. Never pointed at production.

## Suite status (2026-08-30)

`pnpm security` passed locally:

- Semgrep: 0 findings (`uvx`)
- Gitleaks: 0 leaks (working tree; this checkout has no `.git`, so `--no-git`)
- OSV-Scanner: 0 remaining issues after freeze `PackageOverrides` in `osv-config.toml`
- ZAP: skipped — local `GET /health` was down (not a pass). Docker DAST is still optional.

CI installs Semgrep, Gitleaks v8.24.3, and OSV-Scanner v2.1.0 (`osv-scanner_linux_amd64`) then runs the same script with a full git history checkout.

- [x] Other customer cannot read findings by job-card UUID (authenticated other user → 404)
- [x] Parts-advance `payment_id` is IDOR-safe
- [x] Photo attach uses signed upload without service-role in client headers
## Phase 9 — Admin web ops plane (2026-08-30)

Desk ops APIs (`/v1/admin/*`) plus Next.js admin web. Scanners: Semgrep, Gitleaks, OSV-Scanner. ZAP skipped (local `/health` down — not a pass). Manual review: `audit-context-building`, `insecure-defaults`, `sharp-edges`, `variant-analysis` (admin UUID/authz), `fp-check`.

### Authz evidence (pytest)

- Customer and technician JWT → `403` on `/v1/admin/*` (`test_admin_role_enforcement.py`)
- Override / refund / adjust / disable without reason → `400 REASON_REQUIRED` (`test_admin_override_audit.py` and related)
- `profiles.is_active=false` cannot use customer routes (`test_disabled_customer_cannot_use_me`)
- Audit logs are INSERT-only; override writes `audit_logs` with `request_id`
- Stock conservation: receive 10, consume 3, adjust −8 fails (`test_stock_conservation.py`)
- Movement and on-behalf POSTs require `Idempotency-Key`

### Product / client

- Admin web calls FastAPI only (no PostgREST). `NEXT_PUBLIC_*` has API base + Supabase anon URL/key placeholders — never service-role or `DATABASE_URL`.
- Playwright desk specs inject `sessionStorage.caratom_e2e_token` and mock `/v1/*`. A fake browser token is not a server bypass; FastAPI still verifies JWT.

### Scanner notes (this run)

`pnpm security` passed:

- Semgrep: 0 findings
- Gitleaks: 0 leaks (working tree; `--no-git` when no `.git`)
- OSV-Scanner: 0 remaining after freeze overrides
- ZAP: skipped — local API down (not a pass)

No new CRITICAL/HIGH. No baseline additions this phase.

## Phase 10 — Admin mobile ops (2026-08-31)

Field-ops lite on `apps/admin-mobile` plus Phase 09 read-model polish (`GET /v1/admin/dispatch`, paginated board, `view=lite`, assign idempotency). Scanners: Semgrep, Gitleaks, OSV-Scanner, ZAP baseline against local `http://127.0.0.1:8000`. Manual review: `audit-context-building`, `insecure-defaults`, `sharp-edges`, `variant-analysis` (job-card UUID / assign / override), `fp-check`.

### Authz evidence (pytest)

- Customer and technician JWT → `403` on `GET /dispatch`, `GET /job-cards`, assign, override, `view=lite` (`test_admin_mobile_dispatch_e2e.py`)
- Assign missing `Idempotency-Key` → `400 IDEMPOTENCY_KEY_REQUIRED`
- Same idempotency key + different body → `409 IDEMPOTENCY_CONFLICT`
- Off-duty technician → `409 TECH_OFF_DUTY` (server, not only hidden UI)
- Override empty/short reason → `400 REASON_REQUIRED` / `OVERRIDE_REASON_REQUIRED` (never skipped in `__DEV__`)
- `GET /job-cards/{id}?view=lite` does not start an advisor case (no `start_contact`)
- `X-Client-Surface` is telemetry: mobile allowed-actions list omits `CANCEL_JOB`, but the command still applies if sent

### Product / client

- One fail-closed `(ops)` layout: missing session → login; `GET /v1/me` failure or non-admin role → blocking banner (no board/dispatch). App-focus refetch of `/v1/me`.
- Query params `jobCardId` / `technicianId` must be UUID or the screen shows an error and does not fetch.
- Deeplinks: `webOpsUrls` allowlist only (`javascript:`, traversal, token query params rejected; `https` required outside `__DEV__`). JWT is never appended. `Linking.openURL` receives only resolved allowlisted URLs.
- Admin-mobile env is API base + Supabase anon URL/key + admin web URL. No `service_role` in the app bundle.
- Analytics stub emits spec event names with refs/ids only (no phone, name, address, or reason text).

### Scanner notes (this run)

`pnpm security` passed:

- Semgrep: 0 findings
- Gitleaks: 0 leaks (working tree; `--no-git` when no `.git`)
- OSV-Scanner: 0 remaining after freeze overrides
- ZAP: baseline exit 0 against local API (not production)

No new CRITICAL/HIGH. No baseline additions this phase.


