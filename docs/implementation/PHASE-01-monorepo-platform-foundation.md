# PHASE 01 — Monorepo Platform Foundation

**Document ID:** `PHASE-01-monorepo-platform-foundation.md`  
**Status:** Executable specification  
**Authority:** [`docs/architecture/05-technical-architecture.md`](../architecture/05-technical-architecture.md), [`docs/implementation/README.md`](./README.md)  
**Next phase:** [`PHASE-02-identity-design-catalog.md`](./PHASE-02-identity-design-catalog.md)  
**Estimated effort:** 2–4 engineering days (single developer + Cursor agent)

---

## 0. Phase Summary

### Objective

Establish a **runnable, empty platform** for CARATOM: a pnpm monorepo with four client shells (three Expo apps + one Next.js admin web app), a FastAPI backend skeleton with health and stub identity endpoints, minimal database connectivity, shared contracts package, CI skeleton, and environment wiring for Supabase + Railway + Redis/ARQ — **without implementing any product features**.

### What Phase 01 delivers

| Deliverable | Description |
|-------------|-------------|
| Monorepo tooling | pnpm workspaces, root scripts, pinned toolchain versions, `.nvmrc`, `.python-version` |
| `apps/customer` | Expo Router shell — splash placeholder, navigable index |
| `apps/technician` | Expo Router shell — today placeholder |
| `apps/admin-mobile` | Expo Router shell — inbox placeholder |
| `apps/admin` | Next.js App Router shell — ops dashboard placeholder |
| `packages/contracts` | TypeScript types for health + stub `/v1/me`; Zod schemas; export map |
| `packages/api-client` | Typed fetch wrapper skeleton with request-id header |
| `backend/` | FastAPI app, `/health`, stub `GET /v1/me`, SQLAlchemy engine ping, Alembic init, ARQ worker stub |
| Dev infra | `docker-compose.yml` (Postgres + Redis local), `.env.example` files |
| CI | GitHub Actions: lint, typecheck, backend tests on PR |
| ADR | Toolchain version decisions under `docs/architecture/decisions/` |

### What Phase 01 explicitly does NOT deliver

- Supabase Auth OTP flows (Phase 02)
- Catalog, job cards, pricing, bookings (Phases 03+)
- Design tokens / light-blue accent UI (Phase 02)
- Database tables beyond Alembic baseline (Phase 02+)
- Real JWT verification (stub only; full auth in Phase 02)
- Razorpay integration (stub env vars only)
- EAS builds, store submission, production Railway deploy (Phase 12)

### Pinned toolchain versions (canonical for all later phases)

These versions are **frozen at Phase 01**. Later phases MUST NOT upgrade without an ADR.

| Tool | Minimum / pinned | Notes |
|------|------------------|-------|
| Node.js | **20.18.0 LTS** (`.nvmrc`: `20`) | Required for Expo SDK 52 |
| pnpm | **9.15.0** (`packageManager` field) | Workspace protocol |
| TypeScript | **5.7.x** | Strict mode all TS packages |
| Expo SDK | **52.x** | Expo Router 4.x |
| React Native | **0.76.x** | Bundled with Expo 52 |
| React | **18.3.x** | Shared across Expo + Next |
| Next.js | **15.1.x** | App Router, standalone output |
| Tailwind CSS | **3.4.x** | Admin web only (Phase 01: minimal) |
| Python | **3.12.8** (`.python-version`) | Backend + worker |
| FastAPI | **0.115.x** | OpenAPI 3.1 |
| Uvicorn | **0.34.x** | ASGI server |
| SQLAlchemy | **2.0.x** | Async optional; sync OK for Phase 01 |
| Alembic | **1.14.x** | Migration runner |
| Pydantic | **2.10.x** | v2 settings |
| ARQ | **0.26.x** | Redis worker |
| Redis | **7.4.x** (Docker image) | Local + Railway |
| PostgreSQL | **15.x** (Supabase) | Via `DATABASE_URL` |
| Ruff | **0.8.x** | Python lint + format |
| pytest | **8.3.x** | Backend tests |
| ESLint | **9.x** | Flat config |
| Prettier | **3.4.x** | TS/JSON formatting |

### Success statement

At Phase 01 exit, a developer can clone the repo, run documented commands, start all four client shells and the API locally, receive `200` from `GET /health`, receive a stub `401`/`200` from `GET /v1/me`, and CI passes on a clean checkout — with **zero secrets committed**.

---

## 1. Starting State

Per [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md), the repository at Phase 01 start contains:

```text
CarAtom-main/
├── ARCHITECTURE.md
├── docs/
│   ├── architecture/          # 20 canonical architecture docs
│   ├── implementation/
│   │   └── README.md          # Phase index (this doc is missing)
│   ├── AUDIT-REPORT.md
│   ├── EMERGENT-IMPLEMENTATION-PROMPT.md
│   └── CARATOM-client-walkthrough.html
├── Vibe code principles/      # Security / greenfield playbooks
└── docs/inspiration/
```

**Absent at start:**

- No `package.json`, `pnpm-workspace.yaml`, or `apps/` directory
- No `backend/` Python project
- No `packages/contracts` or `packages/api-client`
- No CI workflows
- No `.env.example` files
- No Docker Compose
- No application code of any kind

**Assumptions:**

- Developer has Node 20+, pnpm 9+, Python 3.12+, Docker Desktop (optional but recommended), and a Supabase project (free tier OK) or local Postgres via Docker.
- Railway account exists for later phases; Phase 01 only documents env var names.
- Git remote may or may not exist; Phase 01 does not require Railway deploy.

---

## 2. Desired End State

After Phase 01 passes the Exit Gate (§24), the repository tree MUST match:

```text
CarAtom-main/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .nvmrc
├── .python-version
├── .gitignore
├── .prettierignore
├── .prettierrc
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                          # optional; root scripts OK without Turbo
├── docker-compose.yml
├── README.md                           # updated: local dev quickstart
├── apps/
│   ├── customer/
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── app.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── README.md
│   ├── technician/
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── app.json
│   │   ├── package.json
│   │   └── README.md
│   ├── admin-mobile/
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── app.json
│   │   ├── package.json
│   │   └── README.md
│   └── admin/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── next.config.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── .env.example
│       └── README.md
├── packages/
│   ├── contracts/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── health.ts
│   │   │   ├── profile.ts
│   │   │   └── errors.ts
│   │   └── README.md
│   └── api-client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   └── client.ts
│       └── README.md
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock                         # or requirements.lock equivalent
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 0001_baseline.py        # empty baseline, no tables
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   └── session.py
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   └── request_id.py
│   │   ├── modules/
│   │   │   ├── __init__.py
│   │   │   ├── health/
│   │   │   │   ├── router.py
│   │   │   │   └── schemas.py
│   │   │   └── auth/
│   │   │       ├── router.py
│   │   │       └── schemas.py
│   │   └── worker/
│   │       ├── __init__.py
│   │       └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   └── test_me_stub.py
│   ├── .env.example
│   └── README.md
└── docs/
    ├── architecture/
    │   └── decisions/
    │       └── ADR-001-toolchain-versions.md
    └── implementation/
        └── PHASE-01-monorepo-platform-foundation.md   # this file
```

### Runtime verification targets

| Runtime | Command | Expected |
|---------|---------|----------|
| API | `curl http://localhost:8000/health` | `200` JSON with `status: "ok"` |
| API | `curl http://localhost:8000/v1/me` | `401` without token |
| API | `curl -H "Authorization: Bearer stub" http://localhost:8000/v1/me` | `200` stub profile (dev mode) |
| Customer Expo | `pnpm --filter @caratom/customer start` | Metro bundler; placeholder screen |
| Technician Expo | `pnpm --filter @caratom/technician start` | Metro on different port |
| Admin mobile Expo | `pnpm --filter @caratom/admin-mobile start` | Metro on different port |
| Admin Next.js | `pnpm --filter @caratom/admin dev` | `http://localhost:3000` placeholder |
| CI | Push to branch | All jobs green |

---

## 3. Why This Phase Exists Here

Phase 01 is the **mandatory first gate** in the 12-phase CARATOM implementation sequence ([`README.md`](./README.md)). Every subsequent phase assumes:

1. **Stable monorepo shape** — apps, packages, and backend paths never move without ADR.
2. **Shared contracts** — TypeScript clients import from `@caratom/contracts`; OpenAPI becomes authoritative in Phase 02+.
3. **Reproducible local dev** — one `docker compose up`, one `pnpm install`, one `uv sync`.
4. **CI from day one** — prevents AI-generated drift and silent regressions before product code exists.
5. **Environment contract** — all phases use the same env var names documented here.

The architecture roadmap ([`18-implementation-roadmap.md`](../architecture/18-implementation-roadmap.md) Phase 0) maps directly to this document. Phase 02 (identity + catalog) cannot begin until four runtimes start and health responds.

**Risk if skipped:** Later phases will invent incompatible folder layouts, duplicate API clients, commit secrets, or build product screens before tooling exists — violating Vibe Coding Principles (§19) and causing expensive rework.

---

## 4. Source Material

| Source | Use in Phase 01 |
|--------|-----------------|
| [`05-technical-architecture.md`](../architecture/05-technical-architecture.md) | Monorepo layout, runtime services, module boundaries |
| [`06-frontend-architecture.md`](../architecture/06-frontend-architecture.md) | Future route trees (shells only now); admin-mobile addition |
| [`07-backend-architecture.md`](../architecture/07-backend-architecture.md) | Layering, future modules (create empty `modules/` only) |
| [`09-api-contracts.md`](../architecture/09-api-contracts.md) | `/v1/me` semantic shape, error conventions |
| [`14-security.md`](../architecture/14-security.md) | No secrets in repo; env separation |
| [`15-testing-strategy.md`](../architecture/15-testing-strategy.md) | CI quality gates baseline |
| [`18-implementation-roadmap.md`](../architecture/18-implementation-roadmap.md) | Phase 0 acceptance criteria |
| [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) | Four-app surface split; admin-mobile requirement |
| [`README.md`](./README.md) | Phase dependency graph |
| [`Vibe code principles/GREENFIELD-PLAYBOOK.md`](../../Vibe%20code%20principles/GREENFIELD-PLAYBOOK.md) | Checklists 3–4 (repo setup, auth foundation placeholder) |
| [`Vibe code principles/VIBE-CODING-ARTICLE.md`](../../Vibe%20code%20principles/VIBE-CODING-ARTICLE.md) | AI code verification rules |

---

## 5. Architectural Context (diagram)

### 5.1 Phase 01 system context

```mermaid
flowchart TB
  subgraph clients [Client Shells - Phase 01 Placeholders]
    C[apps/customer Expo]
    T[apps/technician Expo]
    AM[apps/admin-mobile Expo]
    AW[apps/admin Next.js]
  end

  subgraph shared [Shared Packages]
    CON[packages/contracts]
    AC[packages/api-client]
  end

  subgraph backend [Backend - Railway target]
    API[FastAPI /health /v1/me stub]
    WRK[ARQ worker stub]
  end

  subgraph infra [Infrastructure]
    SB[(Supabase Postgres + Auth)]
    RD[(Redis)]
  end

  C --> AC
  T --> AC
  AM --> AC
  AW --> AC
  AC --> CON
  AC -->|HTTP| API
  API -->|DATABASE_URL ping| SB
  WRK -->|REDIS_URL| RD
  API -.->|Phase 02+| SB
```

### 5.2 Trust boundaries (Phase 01)

```text
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC ZONE — Client devices (Expo Go / Browser)           │
│  - EXPO_PUBLIC_* / NEXT_PUBLIC_* only                       │
│  - Never SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, secrets   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (dev: HTTP localhost)
┌──────────────────────────▼──────────────────────────────────┐
│  API ZONE — FastAPI on Railway                              │
│  - Validates JWT (Phase 02); stub in Phase 01                 │
│  - Owns all domain writes (future phases)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  DATA ZONE — Supabase                                       │
│  - Postgres via DATABASE_URL                                │
│  - Auth via Supabase (Phase 02)                             │
│  - Storage (Phase 06+)                                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Request lifecycle (Phase 01 scope only)

1. Client calls `GET /health` or `GET /v1/me` via `@caratom/api-client`.
2. API middleware assigns `X-Request-Id` (generate if missing).
3. Health router returns static JSON + optional DB ping.
4. `/v1/me` stub returns `401` without `Authorization` header; in `ENV=development` with `Authorization: Bearer stub`, returns fixed stub profile.
5. Response JSON validated against `@caratom/contracts` types on client (manual in Phase 01).

---

## 6. Exact Implementation Scope + Out of Scope

### 6.1 In scope (MUST implement)

| Area | Scope |
|------|-------|
| Monorepo root | `pnpm-workspace.yaml`, root `package.json`, shared ESLint/Prettier |
| Workspace packages | `@caratom/contracts`, `@caratom/api-client` |
| Expo shells ×3 | customer, technician, admin-mobile — Expo Router, TypeScript, placeholder screens |
| Next.js shell | admin web — App Router, TypeScript, Tailwind minimal, placeholder page |
| FastAPI | `main.py`, settings, CORS allowlist for localhost, `/health`, `/v1/me` stub |
| Database | SQLAlchemy engine + `SELECT 1` ping; Alembic initialized with empty baseline migration |
| Worker | ARQ worker file that connects to Redis and logs startup (no jobs) |
| Docker | `docker-compose.yml`: Postgres 15 + Redis 7 for local dev |
| Env examples | Root + per-app `.env.example` with documented var names |
| CI | Lint TS, typecheck TS, ruff + pytest on backend |
| ADR | Toolchain version record |
| README | Root quickstart updated |

### 6.2 Out of scope (MUST NOT implement in Phase 01)

| Item | Deferred to |
|------|-------------|
| Supabase phone OTP login UI | Phase 02 |
| JWT JWKS verification | Phase 02 |
| `profiles` table / migrations with columns | Phase 02 |
| Design tokens, DM Sans, light-blue accent `#5DB7E8` | Phase 02 |
| Home tabs, catalog, job cards | Phases 02–03 |
| TanStack Query, Zustand (install OK but no usage required) | Phase 02+ |
| MapLibre, camera, location permissions | Phase 05–06 |
| OpenAPI codegen pipeline | Phase 02 (manual types OK in Phase 01) |
| Railway production deploy | Phase 12 |
| EAS Build profiles | Phase 11–12 |
| Razorpay webhook route | Phase 08 |
| Domain modules beyond `health` and `auth` stub | Phase 02+ |
| `packages/ui` | When two consumers exist (architecture rule) |

### 6.3 Boundary rules

- Placeholder screens MAY show app name + "Phase 01 shell" text only — no mock product UI.
- Backend MUST NOT expose PostgREST or direct Supabase client writes from mobile apps.
- `SUPABASE_SERVICE_ROLE_KEY` MUST appear only in backend `.env.example` comments, never in client env examples.

---

## 7. Repository Changes

### 7.1 New files (complete list)

All paths relative to repository root.

**Root:**

- `.nvmrc`, `.python-version`, `.gitignore`, `.prettierignore`, `.prettierrc`
- `pnpm-workspace.yaml`, `package.json`
- `docker-compose.yml`
- `README.md` (create or replace stub)

**GitHub Actions:**

- `.github/workflows/ci.yml`

**Apps (×4):** See §2 tree — each app gets `package.json`, tsconfig, README, Expo/Next config.

**Packages (×2):** See §2 tree.

**Backend:** See §2 tree.

**Docs:**

- `docs/architecture/decisions/ADR-001-toolchain-versions.md`

### 7.2 Modified files

- `docs/implementation/README.md` — ensure Phase 01 link resolves (already references this file).

### 7.3 Files that MUST NOT be created

- `.env` (any real secrets) — gitignored
- `apps/*/ios`, `apps/*/android` — use Expo prebuild in later phases if needed; Phase 01 uses Expo Go
- Duplicate architecture docs
- `packages/ui` — premature

### 7.4 `.gitignore` minimum entries

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Python
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/

# Environment
.env
.env.local
.env.*.local

# Build
dist/
.next/
.expo/
*.egg-info/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Expo
expo-env.d.ts
```

---

## 8. Detailed Implementation Sequence

Execute tasks **in order**. Do not parallelize tasks that depend on prior workspace setup.

---

### Task 1.1 — Initialize monorepo root

**Goal:** Create pnpm workspace with root scripts.

**Files:**

- `package.json`
- `pnpm-workspace.yaml`
- `.nvmrc`
- `.gitignore`

**Implementation:**

```json
// package.json (root) — key fields
{
  "name": "caratom",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20.18.0", "pnpm": ">=9.15.0" },
  "scripts": {
    "dev:customer": "pnpm --filter @caratom/customer start",
    "dev:technician": "pnpm --filter @caratom/technician start",
    "dev:admin-mobile": "pnpm --filter @caratom/admin-mobile start",
    "dev:admin": "pnpm --filter @caratom/admin dev",
    "dev:api": "cd backend && uv run uvicorn app.main:app --reload --port 8000",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test:backend": "cd backend && uv run pytest",
    "ci": "pnpm lint && pnpm typecheck && pnpm test:backend"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Verification:**

```powershell
node -v          # v20.18.0 or higher
pnpm -v          # 9.15.0 or higher
pnpm install     # succeeds (may be empty until apps added)
```

---

### Task 1.2 — Shared TypeScript tooling

**Goal:** ESLint + Prettier at root; extend in packages.

**Files:**

- `.prettierrc`, `.prettierignore`
- `packages/contracts/package.json` (placeholder for lint script)

**Verification:**

```powershell
pnpm exec prettier --check .
```

---

### Task 1.3 — Create `@caratom/contracts`

**Goal:** Shared types for health and stub profile responses.

**Files:**

- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/health.ts`
- `packages/contracts/src/profile.ts`
- `packages/contracts/src/errors.ts`

**`packages/contracts/package.json`:**

```json
{
  "name": "@caratom/contracts",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

**Type definitions (implement exactly):**

```typescript
// packages/contracts/src/health.ts
import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  database: z.enum(['ok', 'degraded', 'unavailable']),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// packages/contracts/src/profile.ts
export const UserRoleSchema = z.enum(['customer', 'technician', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  role: UserRoleSchema,
  display_name: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.string().datetime(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// packages/contracts/src/errors.ts
export const ProblemDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  field_errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
  request_id: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
```

**Verification:**

```powershell
pnpm --filter @caratom/contracts typecheck
```

---

### Task 1.4 — Create `@caratom/api-client`

**Goal:** Minimal typed HTTP client used by all apps.

**Files:**

- `packages/api-client/package.json`
- `packages/api-client/src/client.ts`
- `packages/api-client/src/index.ts`

**Client behavior:**

- Constructor accepts `{ baseUrl: string; getAccessToken?: () => Promise<string | null> }`.
- Every request adds `X-Request-Id: crypto.randomUUID()` (or `expo-crypto` in RN — use `globalThis.crypto.randomUUID` with polyfill note in README).
- `getHealth(): Promise<HealthResponse>` — parses with Zod.
- `getMe(): Promise<MeResponse>` — attaches Bearer token if available.
- On non-2xx, parse `ProblemDetails` if JSON, else throw `ApiError`.

**Verification:**

```powershell
pnpm --filter @caratom/api-client typecheck
```

---

### Task 1.5 — Scaffold `apps/customer` (Expo)

**Goal:** Customer Expo Router shell.

**Commands:**

```powershell
cd apps
pnpm create expo-app customer --template tabs
# OR: npx create-expo-app@latest customer -e with-router
```

**Adjust to:**

- Package name: `@caratom/customer`
- Dependency: `@caratom/api-client`, `@caratom/contracts` via `workspace:*`
- Replace tab screens with single placeholder `app/index.tsx`
- Set `app.json` slug: `caratom-customer`, scheme: `caratom-customer`
- Metro port: default 8081

**Placeholder screen content:**

```tsx
// app/index.tsx — minimal
import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CARATOM Customer</Text>
      <Text>Phase 01 shell — product UI in Phase 02+</Text>
    </View>
  );
}
```

**`.env.example`:**

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Verification:**

```powershell
pnpm --filter @caratom/customer start
# Scan QR with Expo Go (SDK 52)
```

---

### Task 1.6 — Scaffold `apps/technician` (Expo)

**Goal:** Technician shell — same pattern as customer, different branding text.

- Package: `@caratom/technician`
- Slug: `caratom-technician`
- Metro port: **8082** (set in `package.json` script: `expo start --port 8082`)
- Placeholder title: "CARATOM Technician"

**Verification:** Expo Go loads technician app on port 8082.

---

### Task 1.7 — Scaffold `apps/admin-mobile` (Expo)

**Goal:** Admin mobile shell (private distribution later).

- Package: `@caratom/admin-mobile`
- Slug: `caratom-admin-mobile`
- Metro port: **8083**
- Placeholder title: "CARATOM Admin Mobile"

**Rationale:** [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) requires four client surfaces; advisor inbox ships Phase 04, dispatch Phase 10.

**Verification:** Expo Go loads on port 8083.

---

### Task 1.8 — Scaffold `apps/admin` (Next.js)

**Goal:** Admin web operations shell.

**Commands:**

```powershell
cd apps
pnpm create next-app admin --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Adjust:**

- Package: `@caratom/admin`
- Add `@caratom/api-client`, `@caratom/contracts`
- `next.config.ts`: `output: 'standalone'` (Railway deploy prep)
- Placeholder `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">CARATOM Admin</h1>
      <p className="mt-2 text-gray-600">Phase 01 shell — ops UI in Phase 09</p>
    </main>
  );
}
```

**`.env.example`:**

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Verification:**

```powershell
pnpm --filter @caratom/admin dev
# Open http://localhost:3000
```

---

### Task 1.9 — Docker Compose for local infra

**Goal:** Local Postgres + Redis when Supabase/Railway unavailable.

**File:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: caratom
      POSTGRES_PASSWORD: caratom_dev
      POSTGRES_DB: caratom
    ports:
      - "5432:5432"
    volumes:
      - caratom_pg:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  caratom_pg:
```

**Verification:**

```powershell
docker compose up -d
docker compose ps   # both healthy
```

---

### Task 1.10 — Backend Python project (uv)

**Goal:** FastAPI project with uv package manager.

**Commands:**

```powershell
cd backend
uv init --app
uv add fastapi uvicorn sqlalchemy alembic pydantic-settings psycopg2-binary httpx
uv add --dev pytest pytest-asyncio ruff
```

**Files:** See §2 backend tree.

**Verification:**

```powershell
cd backend
uv run python -c "import fastapi; print(fastapi.__version__)"
```

---

### Task 1.11 — Backend settings and database session

**Goal:** Pydantic settings loading env vars; SQLAlchemy engine.

**File:** `backend/app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    api_version: str = "0.1.0-phase01"

    database_url: str = "postgresql://caratom:caratom_dev@localhost:5432/caratom"
    redis_url: str = "redis://localhost:6379/0"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Stub — Phase 08
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
    ]

settings = Settings()
```

**File:** `backend/app/db/session.py`

- Create `engine = create_engine(settings.database_url)`
- Function `check_database() -> bool` executes `SELECT 1`

**Verification:**

```powershell
cd backend
uv run python -c "from app.db.session import check_database; print(check_database())"
# True when docker postgres running
```

---

### Task 1.12 — Request ID middleware

**Goal:** Every response includes `X-Request-Id`.

**File:** `backend/app/middleware/request_id.py`

- Read `X-Request-Id` header or generate UUID4
- Store in `request.state.request_id`
- Set response header

**Verification:** `curl -i http://localhost:8000/health` shows `X-Request-Id`.

---

### Task 1.13 — Health endpoint

**Goal:** `GET /health` returns structured status.

**File:** `backend/app/modules/health/router.py`

**Response shape (200 always if process alive):**

```json
{
  "status": "ok",
  "version": "0.1.0-phase01",
  "database": "ok",
  "timestamp": "2026-08-29T12:00:00.000Z"
}
```

- `database`: `"ok"` if `check_database()` true, `"unavailable"` if connection fails (still return 200 with degraded flag — ops choice; document in README).

**Verification:**

```powershell
curl -s http://localhost:8000/health | jq .
```

---

### Task 1.14 — Stub `GET /v1/me`

**Goal:** Identity endpoint placeholder matching [`09-api-contracts.md`](../architecture/09-api-contracts.md) semantics.

**File:** `backend/app/modules/auth/router.py`

**Behavior:**

| Condition | Status | Body |
|-----------|--------|------|
| No `Authorization` header | 401 | Problem Details `UNAUTHORIZED` |
| Invalid Bearer token (non-stub) | 401 | Problem Details `INVALID_TOKEN` |
| `Authorization: Bearer stub` AND `ENV=development` | 200 | Stub `MeResponse` |
| Production mode, any token | 401 | Until Phase 02 JWKS |

**Stub 200 body:**

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "role": "customer",
  "display_name": "Phase 01 Stub User",
  "phone": "+919000000000",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

**Verification:**

```powershell
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/v1/me
# 401

curl -s -H "Authorization: Bearer stub" http://localhost:8000/v1/me
# 200 with stub JSON (development only)
```

---

### Task 1.15 — FastAPI main app assembly

**Goal:** Wire routers, CORS, OpenAPI metadata.

**File:** `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.request_id import RequestIdMiddleware
from app.modules.health.router import router as health_router
from app.modules.auth.router import router as auth_router

app = FastAPI(
    title="CARATOM API",
    version=settings.api_version,
    openapi_url="/openapi.json",
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["health"])
app.include_router(auth_router, prefix="/v1", tags=["auth"])
```

**Verification:** OpenAPI at `http://localhost:8000/docs` lists `/health` and `/v1/me`.

---

### Task 1.16 — Alembic baseline

**Goal:** Migration tooling ready; no product tables.

**Commands:**

```powershell
cd backend
uv run alembic init alembic
# Edit alembic/env.py to import settings.database_url
uv run alembic revision -m "baseline"
```

**Migration `0001_baseline.py`:** Empty `upgrade()` / `downgrade()` — establishes revision chain only.

**Verification:**

```powershell
uv run alembic upgrade head
uv run alembic current
# Shows head revision
```

---

### Task 1.17 — ARQ worker stub

**Goal:** Worker process starts and connects to Redis.

**File:** `backend/app/worker/main.py`

```python
async def startup(ctx):
    print("CARATOM worker started (Phase 01 stub — no jobs registered)")

class WorkerSettings:
    functions = []
    on_startup = startup
    redis_settings = ...  # from REDIS_URL
```

**Run command (document in backend README):**

```powershell
cd backend
uv run arq app.worker.main.WorkerSettings
```

**Verification:** Worker logs startup; no errors connecting to Redis.

---

### Task 1.18 — Backend tests

**Goal:** pytest coverage for health and me stub.

**Files:**

- `backend/tests/conftest.py` — `TestClient` fixture, `ENV=development`
- `backend/tests/test_health.py`
- `backend/tests/test_me_stub.py`

**Minimum tests:**

1. `test_health_returns_ok`
2. `test_health_includes_request_id_header`
3. `test_me_unauthorized_without_token`
4. `test_me_stub_token_in_development`

**Verification:**

```powershell
cd backend
uv run pytest -v
```

---

### Task 1.19 — Environment example files

**Goal:** Document all env var names for Phase 01.

**`backend/.env.example`:**

```env
ENV=development
API_VERSION=0.1.0-phase01

# Database — use Docker local OR Supabase connection string
DATABASE_URL=postgresql://caratom:caratom_dev@localhost:5432/caratom

# Redis — local Docker OR Railway
REDIS_URL=redis://localhost:6379/0

# Supabase (Phase 02+ auth; Phase 01 optional for DB URL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Client-facing API URL (for CORS documentation)
API_BASE_URL=http://localhost:8000

# Razorpay — stub until Phase 08
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

**Canonical env var mapping:**

| Var | Consumer | Phase 01 required? |
|-----|----------|-------------------|
| `SUPABASE_URL` | Backend, clients | Optional (clients: EXPO_PUBLIC_/NEXT_PUBLIC_ prefix) |
| `SUPABASE_ANON_KEY` | Clients | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Optional |
| `DATABASE_URL` | Backend, Alembic | Yes (local Docker OK) |
| `REDIS_URL` | Backend worker | Yes for worker start |
| `RAZORPAY_*` | Backend | No (empty stub) |
| `API_BASE_URL` | Clients via public prefix | Yes for api-client |

---

### Task 1.20 — CI workflow

**Goal:** GitHub Actions on push/PR.

**File:** `.github/workflows/ci.yml`

**Jobs:**

1. **typescript** — `pnpm install`, `pnpm lint`, `pnpm typecheck`
2. **python** — `uv sync`, `ruff check`, `ruff format --check`, `pytest`
3. **secrets** — optional: `gitleaks` or `trufflehog` scan (recommended)

**Services for pytest:** Postgres 15 service container; set `DATABASE_URL` in job env.

**Verification:** Push branch; all jobs green.

---

### Task 1.21 — ADR toolchain record

**Goal:** Document pinned versions for future phases.

**File:** `docs/architecture/decisions/ADR-001-toolchain-versions.md`

Include: decision date, version table from §0, rationale (Expo 52 stability, Python 3.12 EOL policy, pnpm workspace performance), consequences (upgrade requires new ADR).

---

### Task 1.22 — Root README quickstart

**Goal:** Single-page local dev instructions.

**Sections:**

1. Prerequisites (Node, pnpm, Python, uv, Docker)
2. Clone + install
3. Start Docker
4. Copy `.env.example` → `.env`
5. Migrate + run API
6. Run each app
7. Run tests + CI locally (`pnpm ci`)

---

## 9. Mobile Implementation (4 empty Expo shells + Next.js admin shell)

### 9.1 App matrix

| App | Package | Expo slug | Dev port | Placeholder route | Future primary screens |
|-----|---------|-----------|----------|-------------------|------------------------|
| Customer | `@caratom/customer` | `caratom-customer` | 8081 | `app/index.tsx` | Home tabs gs-01+, Phase 02–05 |
| Technician | `@caratom/technician` | `caratom-technician` | 8082 | `app/index.tsx` | today, visits, Phase 06 |
| Admin mobile | `@caratom/admin-mobile` | `caratom-admin-mobile` | 8083 | `app/index.tsx` | adm-01+, Phase 04/10 |
| Admin web | `@caratom/admin` | N/A (Next.js) | 3000 | `app/page.tsx` | inventory, catalog, Phase 09 |

### 9.2 Shared Expo configuration (all three mobile apps)

**`app.json` baseline fields:**

```json
{
  "expo": {
    "name": "CARATOM ...",
    "slug": "caratom-...",
    "version": "0.0.1",
    "orientation": "portrait",
    "scheme": "caratom-...",
    "platforms": ["ios", "android"],
    "sdkVersion": "52.0.0",
    "plugins": ["expo-router"]
  }
}
```

**Dependencies (align versions across apps):**

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "@caratom/api-client": "workspace:*",
    "@caratom/contracts": "workspace:*"
  }
}
```

### 9.3 Expo Router layout (each mobile app)

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'CARATOM' }} />
    </Stack>
  );
}
```

### 9.4 Optional connectivity smoke (recommended)

Add a "Ping API" button on customer shell only that calls `apiClient.getHealth()` and displays result — validates api-client wiring. Technician/admin-mobile MAY omit to keep shells minimal.

### 9.5 Next.js admin shell specifics

- Use App Router (`app/` directory)
- Tailwind: default config only; no design system tokens yet
- No auth middleware in Phase 01
- `output: 'standalone'` in `next.config.ts` for Railway

### 9.6 Distribution notes (documentation only)

| App | Phase 01 | Production (Phase 12) |
|-----|----------|----------------------|
| Customer | Expo Go | App Store + Google Play |
| Technician | Expo Go | Private APK/IPA direct |
| Admin mobile | Expo Go | Private APK/IPA direct |
| Admin web | `next dev` | Railway standalone |

---

## 10. Backend Implementation (FastAPI health, structure)

### 10.1 Module layout (Phase 01 populated vs stub)

| Module | Phase 01 | Notes |
|--------|----------|-------|
| `health` | **Implemented** | `/health` |
| `auth` | **Stub** | `/v1/me` only |
| `profiles` | Empty `__init__.py` | Phase 02 |
| `catalog` | Empty | Phase 02 |
| `job_cards` | Empty | Phase 03 |
| (all others per architecture) | Empty package dirs OR documented in README | Created as empty folders optional |

**Recommendation:** Create `backend/app/modules/` with `health/` and `auth/` only; add `README.md` listing future modules from [`05-technical-architecture.md`](../architecture/05-technical-architecture.md) without empty Python packages (reduces noise).

### 10.2 Layering rules (enforce from Phase 01)

```text
router.py    → HTTP only, no business logic
schemas.py   → Pydantic request/response models
service.py   → (Phase 02+) application commands
```

Phase 01 routers MAY inline stub logic; Phase 02+ MUST extract to services.

### 10.3 OpenAPI

- Auto-generated at `/openapi.json`
- Tag: `health`, `auth`
- Document stub token behavior in route description

### 10.4 Problem Details error helper

**File:** `backend/app/common/errors.py` (create)

```python
def problem(status: int, code: str, message: str, request_id: str | None = None) -> JSONResponse:
    ...
```

Use for all 401/404/422 responses — matches [`09-api-contracts.md`](../architecture/09-api-contracts.md).

### 10.5 CORS

Allow localhost origins listed in §Task 1.11. Phase 12 adds production admin URL.

### 10.6 Logging

Structured log line per request: `request_id`, `method`, `path`, `status`, `duration_ms`. No PII in Phase 01.

---

## 11. Database Implementation (minimal — connection only)

### 11.1 Scope

- SQLAlchemy 2.x engine connected via `DATABASE_URL`
- Health check: `SELECT 1`
- Alembic configured; baseline migration with **zero tables**
- No Supabase Auth tables manipulation from API in Phase 01

### 11.2 Local vs Supabase

| Environment | `DATABASE_URL` source |
|-------------|----------------------|
| Local dev | Docker Compose Postgres |
| Shared dev | Supabase → Settings → Database → Connection string (URI) |
| Production | Supabase pooler URL (Phase 12) |

### 11.3 Connection pool settings (Phase 01 defaults)

```python
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
```

### 11.4 What Phase 02 adds

- `profiles` table linked to `auth.users`
- Initial migration with UUID PK, `role` enum, timestamps

---

## 12. API Contracts (health, stub `/v1/me`)

### 12.1 `GET /health`

**Request:** No auth.

**Response 200:**

```json
{
  "status": "ok",
  "version": "0.1.0-phase01",
  "database": "ok",
  "timestamp": "2026-08-29T15:30:00.000Z"
}
```

| Field | Type | Required |
|-------|------|----------|
| `status` | `"ok"` | yes |
| `version` | string | yes |
| `database` | `"ok" \| "degraded" \| "unavailable"` | yes |
| `timestamp` | ISO 8601 UTC with `Z` | yes |

**Headers:** `X-Request-Id` on response.

---

### 12.2 `GET /v1/me`

**Request headers:**

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Phase 01 dev: optional stub | `Bearer stub` |
| `X-Request-Id` | optional | UUID |

**Response 200 (development stub only):**

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "role": "customer",
  "display_name": "Phase 01 Stub User",
  "phone": "+919000000000",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

**Response 401 (default):**

```json
{
  "code": "UNAUTHORIZED",
  "message": "Valid Supabase JWT required.",
  "retryable": false,
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Phase 02 change:** Replace stub with JWKS verification + `profiles` row load. Stub token MUST return 401 in `ENV=production`.

---

### 12.3 TypeScript contract sync

Manual duplication Phase 01 → `@caratom/contracts` MUST match OpenAPI schemas. Phase 02 introduces OpenAPI → TypeScript codegen script.

**Sync verification command (Phase 02 prep):**

```powershell
curl -s http://localhost:8000/openapi.json | jq '.paths["/health"].get.responses'
```

---

## 13. Complete Data Flow

### 13.1 Health check flow

```text
[Developer / Client]
       │
       │ GET /health
       ▼
[FastAPI RequestIdMiddleware]
       │
       ▼
[health.router]
       │
       ├──► check_database() ──► PostgreSQL SELECT 1
       │
       └──► JSON HealthResponse + X-Request-Id
```

### 13.2 Stub identity flow (development)

```text
[Customer Expo - optional Ping button]
       │
       │ apiClient.getMe() with token "stub"
       ▼
[@caratom/api-client]
       │ adds X-Request-Id, Authorization
       ▼
[FastAPI auth.router GET /v1/me]
       │
       ├── ENV != development ──► 401
       │
       └── ENV == development + Bearer stub ──► 200 MeResponse
       │
       ▼
[Zod parse MeResponseSchema in client]
       │
       └── Display or log result
```

### 13.3 CI data flow

```text
git push
   ▼
GitHub Actions
   ├── pnpm install → lint → typecheck (all TS packages)
   └── uv sync → ruff → pytest (TestClient, Postgres service)
```

### 13.4 Future flow placeholder (not implemented)

Phase 02+ will add Supabase OTP → JWT → JWKS verify → profiles load. Document in README; do not partially implement in Phase 01.

---

## 14. UI/UX Conformance (placeholder screens only)

### 14.1 Phase 01 UI rules

Per [`10-design-system.md`](../architecture/10-design-system.md) and walkthrough audit:

- **No product UI** in Phase 01 — placeholders only
- **No brand tokens** required yet (Phase 02 introduces `#5DB7E8` / `#176B9E`)
- Placeholder screens MUST NOT mimic walkthrough screens (avoids false "done" signal)

### 14.2 Minimum placeholder requirements

| Requirement | Customer | Technician | Admin mobile | Admin web |
|-------------|----------|------------|--------------|-----------|
| App name visible | ✓ | ✓ | ✓ | ✓ |
| "Phase 01 shell" label | ✓ | ✓ | ✓ | ✓ |
| Safe area respected (mobile) | ✓ | ✓ | ✓ | N/A |
| Readable default system font | ✓ | ✓ | ✓ | ✓ |
| No mock prices/catalog | ✓ | ✓ | ✓ | ✓ |

### 14.3 Explicitly deferred UX

- Four home mode tabs (General / Service+repair / One-man / SOS)
- Bottom navigation (Home / Orders / Profile)
- Flow progress rail
- DM Sans typography
- Light-blue accent tokens
- Loading/empty/error state patterns (Phase 02+)

### 14.4 Walkthrough reference

Walkthrough HTML exists at `docs/CARATOM-client-walkthrough.html` for Phase 02+ alignment. Phase 01 agents MUST NOT implement walkthrough screens.

---

## 15. Security

### 15.1 Phase 01 security requirements

| Control | Implementation |
|---------|----------------|
| No secrets in git | `.gitignore` `.env`; CI secret scan recommended |
| Env separation | `.env.example` only; document dev vs prod |
| CORS allowlist | localhost origins only in Phase 01 |
| Service role isolation | `SUPABASE_SERVICE_ROLE_KEY` backend-only |
| Stub token gated | `Bearer stub` works ONLY when `ENV=development` |
| HTTPS | Production Phase 12; local HTTP acceptable |
| Dependency lockfiles | `pnpm-lock.yaml`, `uv.lock` committed |
| No PostgREST exposure | Clients talk to FastAPI only |

### 15.2 MUST NOT do in Phase 01

- Commit real Supabase keys, Railway tokens, or Razorpay secrets
- Embed `SUPABASE_SERVICE_ROLE_KEY` in any client bundle
- Disable CORS entirely (`allow_origins=["*"]` with credentials)
- Implement auth bypass in production config
- Store tokens in AsyncStorage without SecureStore plan (document for Phase 02)

### 15.3 Phase 02 security prep (document only)

- Supabase JWT validation via JWKS cache
- Rate limiting on auth endpoints
- SecureStore for mobile tokens

Reference: [`14-security.md`](../architecture/14-security.md)

---

## 16. Testing Strategy

### 16.1 Phase 01 test pyramid

| Layer | Scope | Tool |
|-------|-------|------|
| Backend unit/integration | `/health`, `/v1/me`, middleware | pytest + TestClient |
| TypeScript types | Contracts compile | `tsc --noEmit` |
| Lint | TS + Python style | ESLint, Ruff |
| E2E | **None** | Deferred Phase 03 |
| Mobile UI | **None** | Deferred Phase 02 |

### 16.2 Required backend tests

```python
# test_health.py
def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_request_id_header(client):
    r = client.get("/health", headers={"X-Request-Id": "test-id"})
    assert r.headers["X-Request-Id"] == "test-id"

# test_me_stub.py
def test_me_requires_auth(client):
    assert client.get("/v1/me").status_code == 401

def test_me_stub_dev_only(client, monkeypatch):
    monkeypatch.setenv("ENV", "development")
    r = client.get("/v1/me", headers={"Authorization": "Bearer stub"})
    assert r.status_code == 200
    assert r.json()["role"] == "customer"
```

### 16.3 CI as quality gate

All tests MUST pass before Phase 01 exit. No skipped tests without documented issue.

### 16.4 Manual smoke checklist

- [ ] All four clients launch without crash
- [ ] API `/docs` loads
- [ ] Docker Postgres + Redis start
- [ ] Worker connects to Redis
- [ ] No secrets in `git diff`

Reference: [`15-testing-strategy.md`](../architecture/15-testing-strategy.md)

---

## 17. Verification Procedure (concrete commands)

Run from repository root unless noted. Commands work on Windows PowerShell; adjust `curl` if needed (`Invoke-WebRequest`).

### 17.1 Prerequisites check

```powershell
node -v                    # >= v20.18.0
pnpm -v                    # >= 9.15.0
python --version           # >= 3.12.0
uv --version               # install: pip install uv
docker --version
docker compose version
```

### 17.2 Fresh clone setup

```powershell
git clone <repo-url> CarAtom-main
cd CarAtom-main
pnpm install
cd backend
uv sync
cd ..
copy backend\.env.example backend\.env
# Edit backend\.env if not using defaults
```

### 17.3 Start infrastructure

```powershell
docker compose up -d
docker compose ps
```

### 17.4 Database migrate

```powershell
cd backend
uv run alembic upgrade head
cd ..
```

### 17.5 Start API

```powershell
pnpm dev:api
# OR: cd backend && uv run uvicorn app.main:app --reload --port 8000
```

### 17.6 API smoke tests

```powershell
curl -s http://localhost:8000/health
curl -s -o NUL -w "%{http_code}" http://localhost:8000/v1/me
curl -s -H "Authorization: Bearer stub" http://localhost:8000/v1/me
curl -s http://localhost:8000/openapi.json | Select-String "health"
```

Expected: health JSON with `"status":"ok"`; me returns 401 then 200 with stub.

### 17.7 Start clients (separate terminals)

```powershell
pnpm dev:customer
pnpm dev:technician
pnpm dev:admin-mobile
pnpm dev:admin
```

### 17.8 Worker smoke

```powershell
cd backend
uv run arq app.worker.main.WorkerSettings
# Expect: startup log, no traceback
```

### 17.9 Run full CI locally

```powershell
pnpm ci
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest -v --tb=short
```

### 17.10 Secret scan (recommended)

```powershell
# If gitleaks installed:
gitleaks detect --source . --verbose
```

### 17.11 Workspace graph check

```powershell
pnpm list -r --depth 0
```

Expected packages: `@caratom/customer`, `@caratom/technician`, `@caratom/admin-mobile`, `@caratom/admin`, `@caratom/contracts`, `@caratom/api-client`.

---

## 18. Full Codebase Audit checklist

Run before Phase 01 exit gate. Mark each item PASS/FAIL/N/A.

### 18.1 Repository structure

- [ ] `apps/customer`, `apps/technician`, `apps/admin-mobile`, `apps/admin` exist
- [ ] `packages/contracts`, `packages/api-client` exist
- [ ] `backend/app/main.py` exists
- [ ] `pnpm-workspace.yaml` includes all apps and packages
- [ ] No product domain code (job cards, catalog, etc.)

### 18.2 Toolchain

- [ ] `.nvmrc` specifies Node 20
- [ ] `.python-version` specifies 3.12
- [ ] `packageManager` field pins pnpm 9.15.0
- [ ] `uv.lock` or equivalent lockfile committed
- [ ] `pnpm-lock.yaml` committed
- [ ] ADR-001 documents versions

### 18.3 Backend

- [ ] `GET /health` returns documented JSON
- [ ] `GET /v1/me` returns 401 without auth
- [ ] Stub token works only in development
- [ ] `X-Request-Id` on responses
- [ ] Alembic baseline applied cleanly
- [ ] pytest suite passes
- [ ] OpenAPI `/docs` accessible

### 18.4 Clients

- [ ] All four apps start without error
- [ ] Workspace dependency on `@caratom/contracts` resolves
- [ ] No hardcoded secrets in client source
- [ ] `.env.example` present per app

### 18.5 Security

- [ ] `.env` gitignored
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in client env examples
- [ ] CORS not wide open for production URLs yet

### 18.6 CI/CD

- [ ] `.github/workflows/ci.yml` exists
- [ ] CI passes on clean checkout
- [ ] Lint + typecheck + pytest all green

### 18.7 Documentation

- [ ] Root README quickstart accurate
- [ ] Each app README states "shell only"
- [ ] Backend README documents env vars
- [ ] This phase doc present at documented path

---

## 19. Vibe Coding Principles Audit (table format)

Evaluate against files in [`Vibe code principles/`](../../Vibe%20code%20principles/). Missing files noted as N/A per [`README.md`](./README.md).

| Control / Principle | Source | Phase 01 expectation | Pass criteria |
|---------------------|--------|----------------------|---------------|
| No secrets in repository | GREENFIELD Checklist 3, `CRYPTO-KEYMGMT-001` | `.env` gitignored; examples only | `gitleaks detect` clean or manual review |
| Lockfiles committed | GREENFIELD Checklist 3 | `pnpm-lock.yaml`, `uv.lock` | Both present in repo |
| CI skeleton with scan placeholder | GREENFIELD Checklist 3 | ci.yml runs lint/test | Workflow green |
| AI claims ≠ evidence | VIBE-CODING §4.3 | All verification uses command output | Exit gate uses §17 commands, not agent assertions |
| Diff review for removed checks | VIBE-CODING §4.2 | N/A minimal code | No security checks removed (greenfield) |
| Dependency verify before install | VIBE-CODING §4.4 | Use official Expo/FastAPI packages only | No hallucinated package names |
| Minimum scope changes | VIBE-CODING §4.11 | Phase 01 scope only | Audit §18: no product features |
| Independent test execution | VIBE-CODING §4.3 | pytest + CI run independently | CI logs attached to exit |
| Trust boundaries documented | GREENFIELD Checklist 2 | §5 diagrams | Diagram present |
| Env separation planned | `ENV-SEPARATE-001` | dev `.env.example` documented | No prod secrets in examples |
| Branch protection | `REPO-BRANCH-001` | Recommend on main | Document in README if not configured |
| Stub auth not in prod | Security prompt | `ENV=development` gate | Test stub fails when ENV=production |
| CONSTITUTION.md | Referenced but **missing from repo** | N/A | Note gap; use GREENFIELD substitute |
| CONTROLS-CATALOG-2.md | **Missing** | N/A | Use CONTROLS-CATALOG-1 only |
| SECURITY_ANALYSIS.md | **Missing** (has `security analysis 1.md`) | Partial | Apply available security prompt |
| SCORING-AND-GATES.md | **Missing** | N/A | Use phase exit gate §24 instead |

**Phase 01 Vibe exit:** All rows with "Pass criteria" applicable to greenfield MUST pass. Missing companion files documented; do not block on absent `CONSTITUTION.md`.

---

## 20. Architecture Conformance Audit

Verify alignment with [`05-technical-architecture.md`](../architecture/05-technical-architecture.md) and related docs.

| Architecture rule | Phase 01 conformance | Evidence |
|-------------------|------------------------|----------|
| Monorepo layout: apps + packages + backend | Required | §2 tree |
| Customer + technician Expo | Required | apps exist |
| Admin Next.js | Required | apps/admin |
| Admin mobile Expo | Required (audit resolution) | apps/admin-mobile |
| FastAPI modular monolith | Started | modules/health, auth |
| SQLAlchemy + Alembic | Required | baseline migration |
| ARQ worker | Stub | worker/main.py |
| Supabase Postgres | Connection only | DATABASE_URL |
| Redis not business truth | N/A Phase 01 | Worker stub only |
| REST under `/v1` | Started | `/v1/me` |
| OpenAPI authoritative | Started | /openapi.json |
| Problem Details errors | Required | errors.py |
| No second auth system | Stub only | No password endpoints |
| Clients use API not PostgREST | Required | api-client → FastAPI |
| `packages/ui` only when needed | Not created | Correct |
| UTC timestamps in API | Required | ISO 8601 with Z |
| INR money types | N/A Phase 01 | contracts/errors only |

**Non-conformance allowed in Phase 01:**

- JWT not yet verified (Phase 02)
- No domain modules (Phases 02+)
- No Railway deploy (Phase 12)

---

## 21. Walkthrough Conformance Audit

**Status: N/A — no product UI yet**

Phase 01 intentionally delivers empty shells. Walkthrough screens (`gs-01`, `gpr-01`, `om-01`, `sos-01`, technician, admin) are **not implemented**.

| Walkthrough element | Phase 01 | First implementing phase |
|--------------------|----------|--------------------------|
| Customer home 4 tabs | Not started | Phase 02 |
| Vehicle picker | Not started | Phase 02–03 |
| Job card / estimate | Not started | Phase 03 |
| Advisor flow | Not started | Phase 04 |
| One-man / SOS | Not started | Phase 05 |
| Technician field | Not started | Phase 06 |
| Admin web ops | Not started | Phase 09 |
| Admin mobile inbox | Not started | Phase 04 |

**Gate rule:** Do not mark walkthrough failures on Phase 01 — mark N/A with confirmation placeholders only exist.

---

## 22. Regression Audit

Phase 01 is greenfield; regression scope is **self-referential**:

| Check | Method |
|-------|--------|
| Re-clone + install + CI | Fresh machine or `git clean -xfd` (destructive — use CI instead) |
| Health endpoint stable | Snapshot test on JSON keys |
| Contracts breaking change | Typecheck all apps |
| Lockfile reproducibility | `pnpm install --frozen-lockfile` |

**Baseline capture:** After exit gate, tag `phase-01-complete` (optional) for future diffs.

No prior product behavior to regress.

---

## 23. Technical Debt Review

| Debt item | Severity | Accept in Phase 01? | Paydown phase |
|-----------|----------|---------------------|---------------|
| Manual contract sync (no OpenAPI codegen) | Medium | Yes | Phase 02 |
| Stub JWT auth (`Bearer stub`) | High | Yes (dev only) | Phase 02 |
| Empty Alembic baseline (no tables) | Low | Yes | Phase 02 |
| No Turbo/monorepo cache | Low | Yes | Optional anytime |
| No EAS config | Low | Yes | Phase 11–12 |
| No Railway deploy | Medium | Yes | Phase 12 |
| Three Expo apps on separate Metro ports | Low | Yes | Document port map |
| pytest without full Supabase integration | Medium | Yes | Phase 02 |
| No gitleaks in CI | Medium | Optional | Phase 01 if time |
| Design system doc vs walkthrough color conflict | Low | N/A UI | Phase 02 (light blue wins; walkthrough retinted) |

**Debt registration:** Record accepted items in PR description or `docs/architecture/decisions/` if any deviate from this spec.

---

## 24. Phase Exit Gate (checkbox list)

All boxes MUST be checked before starting Phase 02.

### Platform

- [ ] pnpm workspace installs cleanly on fresh clone
- [ ] Node 20+ and pnpm 9+ documented and enforced via engines
- [ ] Python 3.12+ backend runs with uv
- [ ] Docker Compose Postgres + Redis start successfully

### Applications

- [ ] `@caratom/customer` Expo shell launches (Expo Go SDK 52)
- [ ] `@caratom/technician` Expo shell launches (port 8082)
- [ ] `@caratom/admin-mobile` Expo shell launches (port 8083)
- [ ] `@caratom/admin` Next.js shell serves on port 3000

### Backend

- [ ] `GET /health` returns 200 with correct schema
- [ ] Database ping reflected in health response
- [ ] `GET /v1/me` returns 401 without token
- [ ] `GET /v1/me` stub returns 200 in development with `Bearer stub`
- [ ] `GET /v1/me` returns 401 in production mode (verify via env)
- [ ] Alembic `upgrade head` succeeds
- [ ] ARQ worker starts and connects to Redis
- [ ] pytest: 100% pass rate on Phase 01 tests

### Shared packages

- [ ] `@caratom/contracts` typechecks; Zod schemas match API
- [ ] `@caratom/api-client` typechecks; health call works from customer optional ping

### Security & hygiene

- [ ] No secrets committed (manual + optional gitleaks)
- [ ] All `.env.example` files present; real `.env` gitignored
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not in any client package

### CI & docs

- [ ] GitHub Actions CI green
- [ ] Root README quickstart verified by second person or fresh VM
- [ ] ADR-001 toolchain versions committed
- [ ] §18 Full Codebase Audit: all applicable items PASS
- [ ] §19 Vibe audit: applicable controls PASS
- [ ] §20 Architecture audit: all Phase 01 rules PASS

---

## 25. Outputs Passed to Next Phase

Phase 02 ([`PHASE-02-identity-design-catalog.md`](./PHASE-02-identity-design-catalog.md)) receives:

| Output | Location | Phase 02 usage |
|--------|----------|----------------|
| Runnable monorepo | repo root | Add auth, catalog, design tokens |
| API server | `backend/` | JWKS middleware, profiles module |
| Contracts package | `packages/contracts` | Extend with catalog types |
| API client | `packages/api-client` | Add auth header from Supabase session |
| Customer Expo app | `apps/customer` | Replace placeholder with auth + home |
| Admin Next.js | `apps/admin` | Read-only catalog stub |
| Alembic chain | `backend/alembic/` | Add profiles + catalog migrations |
| CI pipeline | `.github/workflows/ci.yml` | Extend with integration tests |
| Env var contract | `.env.example` files | Supabase keys required |
| OpenAPI baseline | `/openapi.json` | Add catalog routes |
| Docker local infra | `docker-compose.yml` | Seed catalog against local PG |

**Handoff command bundle for Phase 02 agent:**

```powershell
pnpm install
docker compose up -d
cd backend && uv sync && uv run alembic upgrade head && cd ..
pnpm dev:api
# Verify health, then begin Phase 02 tasks
```

---

## 26. Cursor Execution Instructions

### 26.1 Agent preamble

When executing Phase 01 in Cursor:

1. Read this entire document before writing code.
2. Read [`05-technical-architecture.md`](../architecture/05-technical-architecture.md) § System shape.
3. Do NOT implement product features, mock UI, or walkthrough screens.
4. Execute §8 tasks sequentially; mark task complete only after its verification commands pass.
5. Run §17 verification before claiming exit gate.
6. AI-generated code is unverified until commands pass (Vibe Coding §4.3).

### 26.2 Recommended Cursor workflow

```text
Step 1: Tasks 1.1–1.4  (monorepo + packages)
Step 2: Tasks 1.5–1.8  (four app shells — parallel OK after Step 1)
Step 3: Tasks 1.9–1.19 (backend + docker + env)
Step 4: Task 1.20       (CI)
Step 5: Tasks 1.21–1.22 (ADR + README)
Step 6: §17 full verification
Step 7: §18–§20 audits
Step 8: §24 exit gate checkboxes
```

### 26.3 Scope discipline rules

- If a task is not listed in §6.1, do not implement it.
- If Expo template adds tabs/demo screens, delete them — keep single placeholder.
- Do not create `packages/ui` until Phase 02+ needs it.
- Do not add domain tables beyond Alembic baseline.
- Do not wire Razorpay SDK.
- Do not deploy to Railway in Phase 01 unless explicitly requested.

### 26.4 File creation order (minimize broken workspace)

1. Root workspace files
2. `packages/contracts` → `packages/api-client`
3. All `apps/*` referencing workspace packages
4. `backend/` (independent of apps)
5. CI workflow last (after tests exist)

### 26.5 Common failure modes

| Failure | Fix |
|---------|-----|
| Expo SDK mismatch | Align all apps to SDK 52; run `npx expo-doctor` |
| Workspace package not found | Check `pnpm-workspace.yaml` and `"workspace:*"` deps |
| Database health `unavailable` | Start Docker Postgres; verify DATABASE_URL |
| Metro port conflict | Use 8081/8082/8083 as documented |
| pytest DB errors | Ensure Postgres service in CI; use test DATABASE_URL |
| CORS blocked from Next.js | Add `http://localhost:3000` to cors_origins |
| Phone cannot reach localhost API | Use machine LAN IP or documented Railway dev URL in Phase 02 |

### 26.6 Commit guidance

Phase 01 MAY be one or multiple commits. Suggested messages:

```text
chore(phase-01): initialize pnpm monorepo workspace
chore(phase-01): add contracts and api-client packages
feat(phase-01): scaffold four client shells
feat(phase-01): add FastAPI health and /v1/me stub
chore(phase-01): add docker compose, CI, and ADR-001
```

Do not commit unless user requests (per user rules).

### 26.7 Completion report template

When Phase 01 is complete, report:

```markdown
## Phase 01 Complete

- Exit gate: X/X checkboxes
- CI: [link or status]
- Verification: §17 commands [pass/fail]
- Line count / structure: [summary]
- Known debt: [§23 items]
- Ready for Phase 02: [yes/no]
```

### 26.8 Stop condition

**Stop after §24 exit gate passes.** Do not begin Supabase OTP, catalog seed, or home screen implementation — that is Phase 02.

---

*End of PHASE-01-monorepo-platform-foundation.md*
