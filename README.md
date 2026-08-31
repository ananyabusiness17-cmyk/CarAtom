# CARATOM

Doorstep automotive-service operating system. This repository is a pnpm + uv monorepo.

Phase 01 delivers a **runnable empty platform**: four client shells, FastAPI health + stub identity, local Docker Postgres/Redis, and CI. Product features start in Phase 02.

Canonical architecture lives in [`docs/architecture`](docs/architecture/00-overview.md). Implementation phases: [`docs/implementation/README.md`](docs/implementation/README.md).

**Phase 2+ frontend enforcement** (Cursor/agents): always-on rules in [`.cursor/rules/`](.cursor/rules/) and skills in [`.cursor/skills/`](.cursor/skills/). See [`AGENTS.md`](AGENTS.md). Do not add Tamagui, NativeWind, or React Native Reusables as app dependencies.

## Prerequisites

- Node.js 20.18.0+ (`.nvmrc`: `20`)
- pnpm 9.15.0+ (`packageManager` field)
- Python 3.12.8 (`.python-version`) and [uv](https://docs.astral.sh/uv/)
- Docker Desktop (recommended for local Postgres + Redis). Start Docker Desktop before `docker compose up -d`.

## Local quickstart

```powershell
git clone <repo-url> CarAtom-main
cd CarAtom-main
pnpm install
cd backend
uv sync
copy .env.example .env
cd ..
docker compose up -d
cd backend
uv run alembic upgrade head
cd ..
pnpm dev:api
```

In other terminals:

```powershell
pnpm dev:customer      # Expo Go, port 8081
pnpm dev:technician    # Expo Go, port 8082
pnpm dev:admin-mobile  # Expo Go, port 8083
pnpm dev:admin         # http://localhost:3000
```

Worker (needs Redis):

```powershell
cd backend
uv run arq app.worker.main.WorkerSettings
```

## API smoke

```powershell
curl -s http://localhost:8000/health
curl -s -o NUL -w "%{http_code}" http://localhost:8000/v1/me
curl -s -H "Authorization: Bearer stub" http://localhost:8000/v1/me
```

Expected: health JSON with `"status":"ok"`; `/v1/me` is 401 without a token and 200 with `Bearer stub` when `ENV=development`.

OpenAPI: http://localhost:8000/docs

## Tests and CI locally

```powershell
pnpm ci
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest -v --tb=short
```

## Environment

Copy each `.env.example` to a gitignored `.env` / `.env.local`. Never commit secrets.

- Clients: `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` only. No `SUPABASE_SERVICE_ROLE_KEY`.
- Backend: [`backend/.env.example`](backend/.env.example) — database, Redis, Supabase, Razorpay stubs, SOS stub seconds and ops phone.
- Customer: `EXPO_PUBLIC_MAP_STYLE_URL` for the Expo Go SOS map (demo tiles).

`Authorization: Bearer stub` works **only** in development. Production always returns 401 until Phase 02.

## Workspace packages

| Package | Role |
|---------|------|
| `@caratom/customer` | Customer Expo shell |
| `@caratom/technician` | Technician Expo shell |
| `@caratom/admin-mobile` | Admin mobile Expo shell |
| `@caratom/admin` | Admin Next.js shell |
| `@caratom/contracts` | Zod/TS transport types |
| `@caratom/api-client` | Typed fetch wrapper |

## Production and release

Phase 12 in-repo runbooks, env inventory, and store checklists: [`docs/release/README.md`](docs/release/README.md). Create Railway / Supabase / Razorpay live projects **after** this phase using those runbooks. Never commit production secrets.

```powershell
node scripts/release/prod-smoke.mjs
node scripts/release/pre-store-build-check.mjs
```

## Operations notes

Enable branch protection on `main` when the GitHub remote exists (GREENFIELD Checklist 3).
