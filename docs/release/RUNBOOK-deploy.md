# RUNBOOK — Deploy (staging → production)

**Do not run production migrate or Railway deploy until Supabase + Railway production projects exist.** Dry-run this procedure on staging first.

## Order

1. CI green on the commit you will ship
2. Backup production database (Supabase dashboard)
3. `alembic upgrade head` on production (maintenance window if the migration locks)
4. Deploy **api** → **worker** → **admin**
5. `node scripts/release/prod-smoke.mjs`
6. Watch Railway logs 15 minutes

Migrations run as a **separate step before** the API accepts traffic. Do not auto-migrate on API boot.

## Pre-flight (local)

```powershell
pnpm install
pnpm typecheck
pnpm lint
cd backend; uv run pytest; cd ..
```

## Staging (required before prod)

```powershell
# After Railway staging deploy:
curl -s https://api-staging.caratom.in/health
$env:E2E_BASE_URL = "https://api-staging.caratom.in"
pnpm test:e2e:walkthrough
```

Expected: health `"status":"ok"`; walkthrough specs pass or skip only for missing `E2E_TOKEN`.

## Production migrate

```powershell
# Operator: confirm backup timestamp T0 in the cutover note.
cd backend
# Direct (non-pooler) DATABASE_URL for Alembic only
uv run alembic upgrade head
uv run alembic current
```

If `alembic current` does not match staging head: **stop**. Do not deploy API.

## Railway deploy

See [`infra/railway-production-notes.md`](../../infra/railway-production-notes.md).

- API start: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Worker start: `uv run arq app.worker.main.WorkerSettings` (no public domain)
- Admin: Next.js standalone
- Healthcheck path: `/health`, timeout 30s, restart `ON_FAILURE`

`ENV=production` on API and worker. `RAZORPAY_MODE=live` only after finance sign-off.

## Post-deploy smoke

```powershell
$env:PROD_API_URL = "https://api.caratom.in"
$env:PROD_ADMIN_ORIGIN = "https://admin.caratom.in"
node scripts/release/prod-smoke.mjs
```

Expected: exit 0; health includes `"environment":"production"`, `"database":"ok"`, `"redis":"ok"`. Body must not contain connection strings or internal hostnames.

## CORS

`CORS_ORIGINS` must include `https://admin.caratom.in` only (no localhost). Confirm admin preflight succeeds.

## Customer binary

Store builds bake `EXPO_PUBLIC_API_BASE_URL=https://api.caratom.in` at EAS production profile. After a native change, `eas build --profile production`. JS-only: `eas update --channel production`.

## Dry-run record

| Date | Environment | Operator | Result |
|------|-------------|----------|--------|
| | staging | | pending — run when staging project exists |
