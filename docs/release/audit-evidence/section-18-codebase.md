# §18 Full codebase audit (code evidence)

Live infrastructure rows are BLOCKED until operator projects exist. Filled from repository review on 2026-08-31.

## Platform

| # | Result | Evidence |
|---|--------|----------|
| P1 CI green | PASS locally this pass; tag CI BLOCKED until a `v*` tag is pushed | `pnpm lint`, `pnpm typecheck`, `pnpm test:backend` (167), app unit tests, `pnpm test:e2e:admin` (6 passed); `.github/workflows/ci.yml` + `.github/workflows/release.yml` (tag gate, no prod deploy) |
| P2 Lockfiles | PASS | `pnpm-lock.yaml`, `backend/uv.lock` |
| P3 No `.env` in git | PASS intent | `.gitignore` (`!.env.production.example`); gitleaks OK in `pnpm security` (2026-08-31) |
| P4 Env inventory | PASS | `docs/release/PRODUCTION-env-inventory.md` + root/app `.env.production.example` (names only) |

## Backend

| # | Result | Evidence |
|---|--------|----------|
| B1 Routers mounted | PASS | `backend/app/main.py`; OpenAPI off when `ENV=production` |
| B2 Alembic prod head | BLOCKED | needs prod DB (`RUNBOOK-deploy.md`) |
| B3 Webhook idempotency | PASS | `backend/tests/integration/test_phase08_webhook_idempotency.py`; URL `POST /v1/payments/webhook/razorpay` |
| B4 Admin 403 | PASS | `backend/tests/test_admin_role_enforcement.py` |
| B5 Override reason | PASS | `backend/tests/test_admin_override_audit.py` |
| B6 Stock conservation | PASS | `backend/tests/test_stock_conservation.py` |
| B7 Outbox worker | PASS (unit/integration) | `backend/tests/integration/test_outbox_dispatch.py`; live push BLOCKED |
| B8 PII in logs | PASS review | structured logs; invoice PDF uses masked phone; no raw GSTIN fake in git |
| Health freeze | PASS | `/health` returns `environment`, `redis`, `version` `1.0.0` — `backend/app/modules/health/` |
| Rate limits | PASS | catalog GET 120/min, admin 300/min, webhook 1000/min, `Retry-After` — `backend/app/core/rate_limit.py` |
| CORS production | PASS | `https://admin.caratom.in` when `ENV=production` — `backend/app/config.py` |
| Invoice GST | PASS code | `INVOICE_GSTIN` / `INVOICE_LEGAL_NAME` / `INVOICE_SAC` env; empty GSTIN → `pending registration` |
| Retention | PASS | `backend/app/worker/jobs/retention_purge.py` (90d pings, 180d notifications, 30d succeeded outbox) |

## Mobile

| # | Result | Evidence |
|---|--------|----------|
| M1 Prod API URL | PASS config | customer EAS production env `EXPO_PUBLIC_API_BASE_URL=https://api.caratom.in` |
| M2 No service role in apps | PASS intent | `scripts/release/pre-store-build-check.mjs` |
| M3–M6 device/store | BLOCKED | needs EAS + devices + store accounts |
| Customer vs private split | PASS config | customer `distribution: store`; technician + admin-mobile internal only, no `submit` |

## Admin web

| # | Result | Evidence |
|---|--------|----------|
| A1–A4 prod login/ledger | BLOCKED | needs prod |
| Inventory/override/audit E2E | PASS mocked | `e2e/admin/` + `e2e/walkthrough/admin-web-ops.spec.ts` |
| Legal public pages | PASS | `/legal/privacy`, `/legal/terms`, `/legal/grievance` |
| Staging banner | PASS | orange `STAGING` when `NEXT_PUBLIC_ENV !== production`; footer “Production” only in prod |

## Infrastructure

| # | Result | Evidence |
|---|--------|----------|
| I1–I5 TLS, backups, health, redis, restore drill | BLOCKED — operator | `infra/railway-production-notes.md`, `RUNBOOK-backup-restore.md` |
| Dockerfiles | PASS in-repo | `backend/Dockerfile`, `apps/admin/Dockerfile` |
