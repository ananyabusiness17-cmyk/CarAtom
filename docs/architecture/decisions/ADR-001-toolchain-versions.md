# ADR-001 — Toolchain versions

- **Status:** Accepted
- **Date:** 2026-08-29
- **Phase:** 01 — Monorepo platform foundation

## Decision

Pin the CARATOM toolchain at the versions below for all later phases. Upgrades require a new ADR.

## Context

Phase 01 must freeze versions so Expo, Next.js, FastAPI, and CI stay reproducible. Expo SDK 52 requires Node 20 LTS and React 18.3. Python 3.12 is the backend/worker runtime.

## Versions

| Tool | Pinned | Notes |
|------|--------|-------|
| Node.js | 20.18.0 LTS (`.nvmrc`: `20`) | Required for Expo SDK 52 |
| pnpm | 9.15.0 | Workspace protocol |
| TypeScript | 5.7.x | Strict mode in all TS packages |
| Expo SDK | 52.x | Expo Router 4.x |
| React Native | 0.76.x | Bundled with Expo 52 |
| React | 18.3.x | Shared across Expo and Next.js |
| Next.js | 15.1.x | App Router, standalone output |
| Tailwind CSS | 3.4.x | Admin web only |
| Python | 3.12.8 | Backend + worker |
| FastAPI | 0.115.x | OpenAPI 3.1 |
| Uvicorn | 0.34.x | ASGI server |
| SQLAlchemy | 2.0.x | Sync engine in Phase 01 |
| Alembic | 1.14.x | Migration runner |
| Pydantic | 2.10.x | v2 settings |
| ARQ | 0.26.x | Redis worker |
| Redis | 7.4.x (Docker image `redis:7-alpine`) | Local + Railway |
| PostgreSQL | 15.x | Docker local; Supabase in shared/prod |
| Ruff | 0.8.x | Python lint + format |
| pytest | 8.3.x | Backend tests |
| ESLint | 9.x | Flat config |
| Prettier | 3.4.x | TS/JSON formatting |

## Consequences

- Later phases MUST NOT bump these versions without a new ADR.
- Next.js 15.1 peer-depends on React 19 in some releases; this repo pins React 18.3.1 via pnpm overrides so Expo SDK 52 and admin web share one React.
- Lockfiles (`pnpm-lock.yaml`, `backend/uv.lock`) are committed.

## Alternatives considered

- Expo SDK 53 / React 19: deferred until an explicit mobile upgrade ADR.
- Poetry/pip-tools instead of uv: uv is faster and matches the Phase 01 spec.
- Turborepo: optional; root pnpm scripts are enough for Phase 01.
