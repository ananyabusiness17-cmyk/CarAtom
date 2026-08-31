# PHASE 06 — Technician Field Execution (fieldVisit)

**Document ID:** `PHASE-06-technician-field-execution.md`  
**Version:** 1.0.0  
**Status:** Execution-ready specification  
**Depends on:** [PHASE-01-monorepo-platform-foundation.md](./PHASE-01-monorepo-platform-foundation.md), [PHASE-02-identity-design-catalog.md](./PHASE-02-identity-design-catalog.md), [PHASE-03-general-service-e2e.md](./PHASE-03-general-service-e2e.md) (Exit Gate §24 complete)  
**Unblocks:** [PHASE-07-inspection-repair-loop.md](./PHASE-07-inspection-repair-loop.md), [PHASE-09-admin-web-ops-plane.md](./PHASE-09-admin-web-ops-plane.md)  
**Previous phase:** [PHASE-05-oneman-sos-account.md](./PHASE-05-oneman-sos-account.md) (parallel; Phase 06 requires Phase 03 bookings only)  
**Estimated effort:** 12–18 engineer-days (single developer + Cursor agent)

**Authority chain:**

1. Walkthrough screens embedded inline in §14 and [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — **fieldVisit** folder (`today`, `detail`, `map`, `inspect`, `service`, `parts`, `exception`, `qc`, `me`).
2. [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) — technician never edits selling prices; read-only job card scope.
3. [`docs/architecture/01-product-constitution.md`](../architecture/01-product-constitution.md) — §34–§35 field traceability, separate technician product.
4. Architecture docs **04, 06, 08, 09, 11, 13, 14** — Visit state machine, offline queue, API contracts, screen specs, security.

**Critical glossary (repeat in code review):**

> **fieldVisit** = technician E2E folder in walkthrough: assigned jobs → read-only job card → navigate → inspect **or** service → parts → exception (optional) → QC → profile/sync.  
> **Technician never sets selling prices** — only records fitted parts/labour, findings, and exceptions. Estimate edits are advisor-only on admin.  
> **Dispatch hooks** = backend assignment + visit creation from confirmed bookings; full admin dispatch UI ships Phase 10, but Phase 06 MUST wire assignment → visit → technician today list.

---

## 0. Phase Summary

### Objective

Deliver the **technician mobile product** (`apps/technician`): authenticated field operators can view assigned visits for today, open a read-only job card, navigate and check in, execute **inspection** or **service/repair** visits, record fitted parts and labour, raise scope exceptions, pass QC, and complete visits — with **offline-tolerant writes**, **signed media uploads**, and full **`/v1/technician/*`** API coverage tested independently of admin UI.

Phase 06 also implements **dispatch hooks** (visit creation from booking assignment, dev assign endpoint, outbox events) so Phase 09/10 admin surfaces can assign without rewriting domain logic.

### What Phase 06 delivers

| ID | Deliverable | Description |
|----|-------------|-------------|
| P06-A | Technician auth surface | Phone OTP login for `role=technician`; provisioned test tech account |
| P06-B | Today queue UI | `today` tab — assigned visits grouped by operational day, distance chip, visit type |
| P06-C | Visit detail UI | `detail` — read-only job card scope, concerns, approved lines **without selling prices** |
| P06-D | Navigation + check-in | `map` tab + visit navigate — en-route, on-site check-in, location pings |
| P06-E | Inspection flow | `inspect` — findings, photos, recommendations to advisor (no pricing) |
| P06-F | Service flow | `service` — approved scope checklist, mark work done per line |
| P06-G | Parts + labour | `parts` — SKU/qty traceability; labour entries; no selling price fields |
| P06-H | Exception flow | `exception` — scope divergence flag to advisor; visit may pause |
| P06-I | QC + complete | `qc` — checklist pass/fail; `complete` transition |
| P06-J | Profile + sync | `me` tab — on-duty state, offline queue count, sync status |
| P06-K | Offline queue | Zustand persisted queue; idempotent replay; encrypted local storage where supported |
| P06-L | Signed uploads | `POST /v1/media/signed-upload` → Supabase Storage direct upload from device |
| P06-M | Technician API | All routes in §12 under `/v1/technician/*` + integration tests |
| P06-N | Dispatch hooks | `VisitService.assign_from_booking`, dev/admin assign endpoint, assignment outbox |
| P06-O | DB tables | `technicians`, `technician_skills`, `visits`, `technician_assignments`, `technician_location_pings`, `inspections`, `inspection_findings`, `media_assets`, `job_parts`, `job_labour`, `qc_checks` |

### What Phase 06 explicitly does NOT deliver

| Item | Phase |
|------|-------|
| Full admin dispatch board UI (`dispatch` screen) | 10 |
| Admin web technician dossier grid | 09 |
| Customer-facing ETA / technician name on booking detail (polish) | 08, 11 |
| Inspection + Repair **customer** two-visit UI | 07 |
| Inventory stock management / van stock deduction | 09 |
| Push notifications on assignment | 11 |
| Production private APK distribution | 12 |
| Technician rating UI | 09 |
| GPS background tracking beyond explicit pings | 11 (document limits) |

### Canonical fieldVisit journey (walkthrough)

```text
today (Jobs tab)
  → detail (JC-1042 read-only job card)
  → map (Navigate · en-route · arrived on site)
  → inspect OR service (visit type branch)
  → parts (fitted SKUs · traceability)
  → exception (optional · advisor flag)
  → qc (checklist · mark complete)
  → me (Profile & sync · offline queue)
```

**Flow rail:** 9 dots on screens inside `fieldVisit` folder (see §14). Bottom tabs: **Jobs** (`today`), **Map** (`map`), **Me** (`me`).

### Success statement

At Phase 06 exit, a provisioned technician (`Imran`, demo account) logs into `apps/technician`, sees **3 jobs** on **Wednesday 19 Aug**, opens **JC-1042**, navigates, checks in, completes service checklist, records brake pads + fluid SKUs, passes QC, and marks visit complete. With network disabled mid-flow, check-in and parts writes queue locally and replay without duplicates when online. API integration tests prove `role=customer` receives **403** on all `/v1/technician/*` routes; technician DTOs omit price edit fields; dispatch assign creates visit visible on `GET /v1/technician/visits?date=`.

---

## 1. Starting State

### 1.1 Prerequisites from prior phases

Phase 06 assumes Phase 03 Exit Gate (§24) complete at minimum:

| Artifact | From | Phase 06 usage |
|----------|------|----------------|
| `bookings`, `booking_snapshots` | 03 | Source truth for visit scope snapshots |
| `job_cards`, `estimates`, `estimate_line_items` | 03–04 | Read-only scope on technician detail |
| Supabase OTP + JWT + `profiles.role` | 02 | Technician login |
| Design tokens `#5DB7E8` | 02 | Technician UI chrome |
| `apps/technician` Expo shell | 01 | Replace placeholder with field app |
| `@caratom/contracts`, `@caratom/api-client` | 01–03 | Extend with technician DTOs |

**Optional but recommended:** Phase 04 advisor-revised job cards (JC-1042 demo with brake fluid line added on call) for realistic detail screen copy.

### 1.2 Repository state at Phase 06 start

```text
apps/technician/
  app/_layout.tsx          # Phase 01 placeholder
  app/index.tsx            # "CARATOM Technician" shell text
backend/app/modules/
  bookings/                # Phase 03 — creates booking, no visits yet
  auth/                    # Phase 02 — JWT, /v1/me
  (no technicians/, visits/, media/)
packages/contracts/
  (no technician visit types)
```

**Absent at start:**

- No `visits` table or visit state machine in backend
- No `/v1/technician/*` routes (may exist as stubs from emergent prompt — replace with full impl)
- No offline queue in technician app
- No camera/location permissions wired
- No signed upload pipeline
- No dispatch assignment service

### 1.3 Demo fixtures required for E2E

| Fixture | Value | Purpose |
|---------|-------|---------|
| Technician profile | Imran · `+91 99000 11001` · role `technician` | `me` screen |
| Technician skills | AC, electrics, brakes | Profile card |
| Customer booking | JC-1042 · Rajesh · Honda City 2019 | Primary E2E visit |
| Visit window | Wed 19 · 11:00 – 13:00 | Today list |
| Approved scope | General service + AC gas + brake pads + brake fluid flush | Detail checklist |
| One-man visit | JC-0991 · Creta · lighting · 14:00 | Second today card |
| Repair visit 2 | JC-1008 · Swift · 16:30 | Third today card |

Seed script `backend/scripts/seed_phase06_demo.py` creates technician user, assigns three visits from existing bookings (or creates bookings if missing).

---

## 2. Desired End State

After Phase 06 passes Exit Gate (§24), the repository tree MUST include:

```text
apps/technician/
  app/
    _layout.tsx
    (auth)/
      phone.tsx
      otp.tsx
    (tech)/
      _layout.tsx
      (tabs)/
        _layout.tsx
        today.tsx              # walkthrough: today
        map.tsx                # walkthrough: map (day overview)
        me.tsx                 # walkthrough: me
      visits/
        [id]/
          index.tsx            # walkthrough: detail
          navigate.tsx         # walkthrough: map (visit-scoped)
          inspection.tsx       # walkthrough: inspect
          service.tsx          # walkthrough: service
          parts.tsx            # walkthrough: parts
          exception.tsx        # walkthrough: exception
          qc.tsx               # walkthrough: qc
      offline-queue.tsx
  src/
    coordinators/
      fieldVisitCoordinator.ts
    stores/
      offlineQueueStore.ts
    hooks/
      useVisitMutations.ts
      useSignedUpload.ts
    components/
      VisitCard.tsx
      FlowRail.tsx
      OfflineBanner.tsx
      ScopeChecklist.tsx
      PartsEntryList.tsx
      QCChecklist.tsx
  package.json                 # + expo-camera, expo-location, expo-secure-store, zustand, @tanstack/react-query
  app.json                     # camera, location permissions
  .env.example
  README.md

packages/contracts/src/
  technician/
    visits.ts
    parts.ts
    qc.ts
    offline.ts
    media.ts
  index.ts                     # re-export

packages/api-client/src/
  technician.ts                # typed technician methods

backend/app/modules/
  technicians/
    models.py, schemas.py, repository.py, router.py, service.py
  visits/
    models.py, schemas.py, repository.py, router.py, service.py, state_machine.py
  inspections/
    models.py, schemas.py, service.py
  field_work/
    parts.py, labour.py, qc.py
  media/
    router.py, service.py, storage.py
  dispatch/
    service.py                 # assign hooks (admin-facing methods)
  admin/
    router.py                  # POST /v1/admin/jobs/{id}/assign (minimal)

backend/alembic/versions/
  0006_technicians_visits_field_work.py

backend/tests/
  test_technician_visits.py
  test_visit_transitions.py
  test_signed_upload.py
  test_offline_idempotency.py
  test_dispatch_assign.py

docs/implementation/
  PHASE-06-technician-field-execution.md   # this file
```

### Runtime verification targets

| Runtime | Command / action | Expected |
|---------|------------------|----------|
| API | `GET /v1/technician/visits?date=2026-08-19` (tech JWT) | 200 list with JC-1042 |
| API | `POST .../visits/{id}/en-route` | 200; visit `EN_ROUTE` |
| API | `POST .../visits/{id}/check-in` | 200; visit `ON_SITE` |
| API | `POST /v1/media/signed-upload` | 200 signed URL |
| API | `POST /v1/admin/jobs/{id}/assign` (admin JWT) | 201 visit + assignment |
| API | Customer JWT on `/v1/technician/visits` | 403 |
| Technician Expo | Login as Imran → Today | 3 job cards |
| Technician Expo | Complete JC-1042 flow | QC complete; queue drains |
| Technician Expo | Airplane mode → check-in → online | Single check-in on server |
| CI | pytest technician module | All green |

---

## 3. Why This Phase Exists Here

Phase 06 sits after Phase 03 (bookings exist) and parallel to Phases 04–05 because **field execution is independent of customer account screens** but **requires confirmed bookings with snapshots**.

Per [`README.md`](./README.md) dependency graph:

```text
P03 → P06 → P07 (inspection+repair customer UI consumes technician findings)
P06 → P09 (admin web dossier reads visit/parts data)
```

**Why not earlier:** Without `booking_snapshots`, technicians would see mutable customer/address truth — violating immutability after confirm ([`08-data-model.md`](../architecture/08-data-model.md) §Snapshots).

**Why not later:** Phase 07 inspection-repair loop requires `POST /v1/technician/visits/{id}/inspection-findings` and evidence uploads working. Phase 08 payment closure assumes visits can reach `COMPLETED`.

**Risk if skipped:** Admin builds dispatch against stub visits; customer app shows fake progress; parts traceability breaks; offline field work impossible in Indian network conditions.

---

## 4. Source Material

| Source | Use in Phase 06 |
|--------|-----------------|
| [`CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) | `techFolders.fieldVisit` — 9 screens §14 |
| [`06-frontend-architecture.md`](../architecture/06-frontend-architecture.md) | Technician route tree, offline queue, coordinators |
| [`04-state-machines.md`](../architecture/04-state-machines.md) | Visit lifecycle transitions |
| [`08-data-model.md`](../architecture/08-data-model.md) | Field work tables, constraints |
| [`09-api-contracts.md`](../architecture/09-api-contracts.md) | `/v1/technician/*`, signed upload |
| [`11-screen-specifications.md`](../architecture/11-screen-specifications.md) | Technician mobile screen behaviors |
| [`13-error-recovery.md`](../architecture/13-error-recovery.md) | Offline banner, queue replay rules |
| [`14-security.md`](../architecture/14-security.md) | Role boundaries, upload ownership |
| [`15-testing-strategy.md`](../architecture/15-testing-strategy.md) | Visit transition + offline tests |
| [`18-implementation-roadmap.md`](../architecture/18-implementation-roadmap.md) | Phase 6 definition of done |
| [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) | Technician field visit table §4 |
| [`EMERGENT-IMPLEMENTATION-PROMPT.md`](../EMERGENT-IMPLEMENTATION-PROMPT.md) | Backend-first technician routes §6.9 |
| [`PHASE-03-general-service-e2e.md`](./PHASE-03-general-service-e2e.md) | §25.3 artifacts handed to Phase 06 |

---

## 5. Architectural Context

### 5.1 Phase 06 system context

```mermaid
flowchart TB
  subgraph techApp [apps/technician Expo]
    T1[Today / Map / Me tabs]
    T2[fieldVisit screens]
    T3[Offline Queue Store]
    T4[Camera / Location]
  end

  subgraph packages [Shared]
    CON[@caratom/contracts]
    AC[@caratom/api-client]
  end

  subgraph api [FastAPI]
    TR[/v1/technician/*]
    MR[/v1/media/signed-upload]
    AR[/v1/admin/jobs/assign hook]
    VS[VisitService + state machine]
  end

  subgraph data [Supabase]
    PG[(Postgres visits parts qc)]
    ST[(Storage evidence)]
  end

  subgraph future [Phase 10 - not UI]
    AM[admin-mobile dispatch]
  end

  T1 --> T2
  T2 --> AC
  T3 --> AC
  T4 --> ST
  AC --> CON
  AC --> TR
  AC --> MR
  TR --> VS
  VS --> PG
  MR --> ST
  AR --> VS
  AM -.-> AR
  T3 -.->|replay when online| TR
```

### 5.2 Trust boundaries (Phase 06)

```text
┌─────────────────────────────────────────────────────────────┐
│  TECHNICIAN DEVICE — apps/technician                        │
│  - JWT in SecureStore                                       │
│  - Offline queue local (encrypted where OS allows)          │
│  - Camera/location only on explicit actions                 │
│  - NEVER selling price edit controls                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + signed upload URLs
┌──────────────────────────▼──────────────────────────────────┐
│  API ZONE — role=technician middleware                      │
│  - Assignment scope: only assigned visit IDs                │
│  - Transitions validated by Visit state machine             │
│  - Parts/labour: SKU + qty only; price from approved data   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  DATA ZONE — Postgres + Storage                             │
│  - booking_snapshots immutable read model for scope         │
│  - media_assets linked to visit + uploader                  │
│  - location_pings retained per privacy policy               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Visit state machine (normative)

From [`04-state-machines.md`](../architecture/04-state-machines.md):

```text
SCHEDULED → ASSIGNED | CANCELLED
ASSIGNED → EN_ROUTE | UNASSIGNED | CANCELLED
EN_ROUTE → ON_SITE | LATE | CANCELLED
LATE → ON_SITE | CANCELLED | SUPPORT_REQUIRED
ON_SITE → INSPECTION_IN_PROGRESS | SERVICE_IN_PROGRESS
INSPECTION_IN_PROGRESS → INSPECTION_SUBMITTED | SUPPORT_REQUIRED
SERVICE_IN_PROGRESS → QC_PENDING | SUPPORT_REQUIRED
INSPECTION_SUBMITTED → COMPLETED
QC_PENDING → COMPLETED | QC_FAILED
QC_FAILED → SERVICE_IN_PROGRESS | FOLLOW_UP_REQUIRED | COMPLETED (admin override)
```

**Phase 06 technician actions map:**

| Walkthrough action | API | From state | To state |
|--------------------|-----|------------|----------|
| I'm on the way | `POST .../en-route` | ASSIGNED | EN_ROUTE |
| Arrived · on site | `POST .../check-in` | EN_ROUTE, LATE | ON_SITE |
| Start inspection | `POST .../start-inspection` | ON_SITE | INSPECTION_IN_PROGRESS |
| Submit findings | `POST .../inspection-findings` | INSPECTION_IN_PROGRESS | INSPECTION_SUBMITTED |
| Start service | `POST .../start-service` | ON_SITE | SERVICE_IN_PROGRESS |
| Save parts | `POST .../parts` | SERVICE_IN_PROGRESS, QC_PENDING | (no state change) |
| Save labour | `POST .../labour` | SERVICE_IN_PROGRESS | (no state change) |
| Submit QC | `POST .../qc` | QC_PENDING | COMPLETED or QC_FAILED |
| Mark complete | `POST .../complete` | QC_PENDING, INSPECTION_SUBMITTED | COMPLETED |

### 5.4 Offline queue architecture

```text
[User action offline]
       │
       ▼
[fieldVisitCoordinator]
       │
       ├──► enqueue({ eventId, visitId, kind, payload, createdAt })
       │
       └──► optimistic UI update (marked "pending sync")

[NetInfo online / app foreground]
       │
       ▼
[offlineQueueStore.drain()]
       │
       ├── FOR each entry FIFO (per visit, ordered by createdAt)
       │     POST with Idempotency-Key: eventId
       │     on 2xx → dequeue
       │     on 409 duplicate → dequeue (already applied)
       │     on 4xx validation → mark failed; surface in me/offline-queue
       │
       └── refresh TanStack Query visit caches
```

**Queue entry kinds:** `EN_ROUTE`, `CHECK_IN`, `START_INSPECTION`, `START_SERVICE`, `INSPECTION_FINDINGS`, `PARTS`, `LABOUR`, `QC`, `COMPLETE`, `LOCATION_PING`, `UPLOAD_INTENT`.

### 5.5 Signed upload flow

```text
1. Technician captures photo offline → local URI + upload intent in queue
2. When online:
   a. POST /v1/media/signed-upload { visit_id, content_type, filename, sha256? }
   b. API validates visit assignment + quota → returns { upload_url, asset_id, headers }
   c. Client PUT binary to Supabase signed URL
   d. POST /v1/technician/visits/{id}/inspection-findings or attach asset_id
3. media_assets row: visit_id, uploader_id, storage_path, content_type, created_at
```

---

## 6. Exact Implementation Scope + Out of Scope

### 6.1 In scope (MUST implement)

| Area | Scope |
|------|-------|
| Technician auth | OTP login; reject `role=customer` at app gate |
| 9 walkthrough screens | §14 — all fieldVisit screens pixel/copy faithful |
| Bottom tabs | Jobs / Map / Me per walkthrough |
| Flow rail | 9-step rail on fieldVisit stack screens |
| `/v1/technician/*` | All endpoints §12 |
| `/v1/media/signed-upload` | Technician + admin roles; visit-scoped |
| Visit CRUD + transitions | State machine enforced server-side |
| Dispatch hooks | `DispatchService.assign_technician`, admin assign route, dev seed |
| Offline queue | Persist, drain, idempotency, UI in `me` |
| Location pings | `POST /v1/technician/location-pings` on en-route (throttled) |
| Contracts | Zod schemas for all technician DTOs |
| Tests | API integration + queue reducer unit tests |
| Map adapter | MapLibre or expo-maps placeholder with pin + ETA copy |

### 6.2 Out of scope (MUST NOT implement in Phase 06)

| Item | Deferred to |
|------|-------------|
| Admin dispatch board UI | 10 |
| Customer booking detail technician ETA | 08, 11 |
| Inventory stock decrement on parts fit | 09 |
| Invoice generation on complete | 08 |
| Push notification on assign | 11 |
| Background GPS tracking | 11 |
| Barcode scanner hardware integration | Optional stub button only |
| Technician wage / payroll | Never in MVP |
| Selling price on any technician screen | **Forbidden always** |

### 6.3 Boundary rules

- Technician API responses MUST omit `amount_minor` on estimate lines unless explicitly approved as read-only display — walkthrough says **selling prices hidden**; implement as **no price fields** in technician DTOs.
- `POST .../parts` accepts SKU + quantity + notes; server resolves catalog label; never accepts unit_price from client.
- Exception submission creates `advisor_cases` or `job_card_events` flag — does not mutate estimate lines.
- Dispatch assign MUST create `visits` row in `ASSIGNED` or `SCHEDULED` → `ASSIGNED` atomically with `technician_assignments`.
- All mutating technician routes require `Idempotency-Key` header (client offline event id).

---

## 7. Repository Changes

### 7.1 New files (complete list)

**Technician app (`apps/technician/`):** See §2 tree — all route files, `src/` modules.

**Contracts (`packages/contracts/src/technician/`):**

- `visits.ts` — list/detail DTOs, `AllowedAction` enum
- `parts.ts`, `labour.ts`, `qc.ts`
- `offline.ts` — queue entry schema
- `media.ts` — signed upload request/response

**API client:** `packages/api-client/src/technician.ts`

**Backend modules:** `technicians/`, `visits/`, `inspections/`, `field_work/`, `media/`, `dispatch/`

**Migration:** `0006_technicians_visits_field_work.py`

**Tests:** §16.2 minimum set

**Seed:** `backend/scripts/seed_phase06_demo.py`

### 7.2 Modified files

| File | Change |
|------|--------|
| `backend/app/main.py` | Include technician, media, admin assign routers |
| `packages/contracts/src/index.ts` | Export technician types |
| `packages/api-client/src/index.ts` | Export technician client |
| `apps/technician/app/_layout.tsx` | Auth gate + providers |
| `apps/technician/package.json` | Dependencies |
| `backend/.env.example` | Storage bucket vars |
| `docs/implementation/README.md` | Link resolves (already listed) |

### 7.3 Files that MUST NOT be created

- Customer app routes under `apps/customer` for technician features
- PostgREST direct storage uploads from mobile
- Duplicate visit state definitions in client (import from contracts)

### 7.4 Environment variables (Phase 06 additions)

**`backend/.env.example` additions:**

```env
# Supabase Storage (Phase 06)
SUPABASE_STORAGE_BUCKET_EVIDENCE=caratom-evidence
SIGNED_UPLOAD_TTL_SECONDS=3600
MAX_EVIDENCE_BYTES=10485760

# Location ping rate limit
TECH_LOCATION_PING_MIN_INTERVAL_SECONDS=30

# Dev assign (development only)
DEV_AUTO_ASSIGN_TECHNICIAN_ID=
```

**`apps/technician/.env.example`:**

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

---

## 8. Detailed Implementation Sequence

Execute tasks **in order** unless marked parallel-safe.

---

### Task 6.1 — Database migration: technicians + visits + field work

**Goal:** Alembic revision `0006_technicians_visits_field_work.py`.

**Tables:**

```sql
-- technicians
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
  employee_code TEXT UNIQUE,
  display_name TEXT NOT NULL,
  on_duty BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE technician_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id),
  skill_code TEXT NOT NULL,
  UNIQUE (technician_id, skill_code)
);

-- visits
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref TEXT UNIQUE NOT NULL,  -- e.g. V-1042-A
  booking_id UUID NOT NULL REFERENCES bookings(id),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  visit_type TEXT NOT NULL CHECK (visit_type IN ('INSPECTION', 'SERVICE', 'ONE_MAN', 'SOS_ASSIST')),
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  technician_id UUID NOT NULL REFERENCES technicians(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX one_current_assignment_per_visit
  ON technician_assignments (visit_id) WHERE is_current = true;

CREATE TABLE technician_location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id),
  visit_id UUID REFERENCES visits(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  client_event_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- inspections + findings
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL UNIQUE REFERENCES visits(id),
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ
);

CREATE TABLE inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id),
  summary TEXT NOT NULL,
  recommendation TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  uploader_profile_id UUID NOT NULL REFERENCES profiles(id),
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INT,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  sku_code TEXT NOT NULL,
  label TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  notes TEXT,
  fitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_event_id UUID UNIQUE
);

CREATE TABLE job_labour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  description TEXT NOT NULL,
  minutes INT,
  client_event_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  checklist_version TEXT NOT NULL DEFAULT 'v1',
  items JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_event_id UUID UNIQUE
);
```

**Verification:**

```powershell
cd backend
uv run alembic upgrade head
uv run alembic current
```

---

### Task 6.2 — `@caratom/contracts` technician types

**Goal:** Zod schemas matching §12 API shapes.

**Key types:**

```typescript
// packages/contracts/src/technician/visits.ts
export const VisitTypeSchema = z.enum(['INSPECTION', 'SERVICE', 'ONE_MAN', 'SOS_ASSIST']);
export const VisitStatusSchema = z.enum([
  'SCHEDULED', 'ASSIGNED', 'EN_ROUTE', 'LATE', 'ON_SITE',
  'INSPECTION_IN_PROGRESS', 'INSPECTION_SUBMITTED',
  'SERVICE_IN_PROGRESS', 'QC_PENDING', 'QC_FAILED',
  'COMPLETED', 'CANCELLED', 'UNASSIGNED', 'SUPPORT_REQUIRED', 'FOLLOW_UP_REQUIRED',
]);

export const AllowedActionSchema = z.enum([
  'VIEW', 'EN_ROUTE', 'CHECK_IN', 'START_INSPECTION', 'START_SERVICE',
  'SUBMIT_INSPECTION', 'RECORD_PARTS', 'RECORD_LABOUR', 'SUBMIT_QC',
  'COMPLETE', 'RAISE_EXCEPTION',
]);

export const TechnicianScopeLineSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  kind: z.enum(['SERVICE', 'REPAIR', 'INCLUSION']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE']),
  // NO amount_minor — constitution
});

export const TechnicianVisitSummarySchema = z.object({
  id: z.string().uuid(),
  public_ref: z.string(),
  job_card_ref: z.string(),
  visit_type: VisitTypeSchema,
  status: VisitStatusSchema,
  scheduled_label: z.string(),
  distance_km: z.number().nullable(),
  vehicle_label: z.string(),
  address_short: z.string(),
  allowed_actions: z.array(AllowedActionSchema),
});

export const TechnicianVisitDetailSchema = TechnicianVisitSummarySchema.extend({
  concerns: z.string().nullable(),
  scope_lines: z.array(TechnicianScopeLineSchema),
  advisor_note: z.string().nullable(),
  customer_name: z.string(),
  customer_phone_masked: z.string(),
  address_full: z.string(),
  parking_notes: z.string().nullable(),
  map_preview_url: z.string().nullable(),
});
```

**Verification:** `pnpm --filter @caratom/contracts typecheck`

---

### Task 6.3 — Visit service + state machine (backend)

**Goal:** `backend/app/modules/visits/service.py` + `state_machine.py`.

**Core methods:**

- `list_for_technician(technician_id, date)` — joins assignment, booking snapshot
- `get_detail(visit_id, technician_id)` — authorization check
- `transition(visit_id, action, actor, idempotency_key)` — atomic
- `build_allowed_actions(visit)` — drives UI buttons

**Read model for scope:** Join `booking_snapshots.scope_lines` — strip prices; map line ids for checklist.

**Verification:** Unit tests for illegal transitions return `409 INVALID_STATE_TRANSITION`.

---

### Task 6.4 — Technician router (all `/v1/technician/*`)

**Goal:** `backend/app/modules/technicians/router.py` delegating to visit service.

Mount at `/v1/technician` with `require_role("technician")` dependency.

**Verification:** OpenAPI tag `technician` lists all §12 routes.

---

### Task 6.5 — Media signed upload

**Goal:** `backend/app/modules/media/router.py`

```python
@router.post("/signed-upload")
async def create_signed_upload(body: SignedUploadRequest, user: User = Depends(require_role("technician", "admin"))):
    # Validate visit assignment for technicians
    # Create media_assets row status=pending
    # Return supabase createSignedUploadUrl (service role server-side only)
```

**Verification:** Upload 1 JPEG; asset row links to visit.

---

### Task 6.6 — Dispatch hooks

**Goal:** `backend/app/modules/dispatch/service.py`

```python
class DispatchService:
    async def assign_technician_to_booking(
        self,
        booking_id: UUID,
        technician_id: UUID,
        actor_admin_id: UUID,
        *,
        visit_type: VisitType | None = None,
    ) -> Visit:
        """Create visit + assignment from confirmed booking. Idempotent on booking_id+sequence."""
```

**Admin route (minimal — Phase 10 adds UI):**

```text
POST /v1/admin/jobs/{job_card_id}/assign
Body: { "technician_id": "uuid", "visit_type": "SERVICE" }
Response: 201 VisitResponse + audit_ref
```

**Dev helper:**

```text
POST /v1/dev/bookings/{id}/auto-assign   # ENV=development only
```

**Outbox:** Enqueue `visit.assigned` event for Phase 11 notifications.

**Verification:** Assign JC-1042 booking → appears in technician today list.

---

### Task 6.7 — Seed demo data

**Goal:** `backend/scripts/seed_phase06_demo.py`

Creates Imran technician, three visits matching walkthrough copy (Wed 19 Aug, 3 jobs).

**Verification:** `uv run python scripts/seed_phase06_demo.py` then API list returns 3.

---

### Task 6.8 — Technician app auth + tab shell

**Goal:** Replace Phase 01 placeholder.

**Routes:**

```text
app/(auth)/phone.tsx, otp.tsx
app/(tech)/(tabs)/today.tsx, map.tsx, me.tsx
```

**Gate:** After login, `GET /v1/me` must have `role=technician` else sign out with error.

**Verification:** Expo Go loads Today tab with bottom nav Jobs/Map/Me.

---

### Task 6.9 — `fieldVisitCoordinator`

**Goal:** `apps/technician/src/coordinators/fieldVisitCoordinator.ts`

Maps `allowed_actions[]` → routes and primary CTAs. Screens never branch on visit type without server actions.

```typescript
export function nextRouteForVisit(detail: TechnicianVisitDetail): Href {
  if (detail.allowed_actions.includes('START_INSPECTION')) return `/visits/${detail.id}/inspection`;
  if (detail.allowed_actions.includes('START_SERVICE')) return `/visits/${detail.id}/service`;
  // ...
}
```

**Verification:** Unit tests for action → route mapping.

---

### Task 6.10 — Offline queue store

**Goal:** `apps/technician/src/stores/offlineQueueStore.ts`

- Zustand + `expo-secure-store` or `AsyncStorage` with schema version
- Methods: `enqueue`, `drain`, `countPending`, `listFailed`
- NetInfo listener triggers drain

**Verification:** Unit test reducer; manual airplane mode test §17.

---

### Task 6.11 — Visit stack screens (detail → qc)

**Goal:** Implement routes per §14.2–§14.10.

Wire TanStack Query: `useVisitDetail(id)`, mutations via `useVisitMutations`.

**Verification:** Walkthrough audit §21 all PASS.

---

### Task 6.12 — `@caratom/api-client` technician module

**Goal:** Typed methods with idempotency key support.

```typescript
export class TechnicianApi {
  listVisits(date: string): Promise<TechnicianVisitSummary[]>;
  getVisit(id: string): Promise<TechnicianVisitDetail>;
  enRoute(id: string, idempotencyKey: string): Promise<TechnicianVisitDetail>;
  // ... all §12 mutations
}
```

**Verification:** typecheck passes.

---

### Task 6.13 — Backend integration tests

**Goal:** §16.2 test files.

**Verification:** `uv run pytest tests/test_technician_visits.py -v`

---

### Task 6.14 — Map + location permissions

**Goal:** Request location on "Open navigation" / en-route only.

**Map tab:** Show today's visit pins (read from cached today list).

**Navigate screen:** Map preview + address + **Arrived · on site** CTA.

**Verification:** Permission rationale string present; denied → manual check-in still works.

---

### Task 6.15 — Exception → advisor flag

**Goal:** `POST /v1/technician/visits/{id}/exception` (add to §12 if not in architecture doc — extends technician namespace).

Creates support/advisor signal; sets visit `SUPPORT_REQUIRED` optionally.

**Verification:** Admin can query flag via existing job card (Phase 09 UI).

---

### Task 6.16 — CI extension

**Goal:** Add technician pytest job artifacts to existing CI.

**Verification:** PR green.

---

## 9. Mobile Implementation (`apps/technician`)

### 9.1 App matrix

| Property | Value |
|----------|-------|
| Package | `@caratom/technician` |
| Expo slug | `caratom-technician` |
| Dev port | **8082** |
| Distribution | Expo Go (Phase 06); private APK Phase 12 |
| Primary user | Field technician (`role=technician`) |

### 9.2 Dependencies (add to `package.json`)

```json
{
  "dependencies": {
    "@caratom/api-client": "workspace:*",
    "@caratom/contracts": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "zustand": "^5.0.2",
    "@react-native-community/netinfo": "^11.4.1",
    "expo-camera": "~16.0.0",
    "expo-location": "~18.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-file-system": "~18.0.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "maplibre-gl": "^4.7.1",
    "@maplibre/maplibre-react-native": "^10.1.0"
  }
}
```

Use MapLibre placeholder acceptable if native build blocked in Expo Go — static map image fallback with **MAP PLACEHOLDER** label per walkthrough.

### 9.3 Expo Router tree (normative)

```text
app/
  _layout.tsx                    # QueryClient, auth, theme
  (auth)/
    phone.tsx
    otp.tsx
  (tech)/
    _layout.tsx                  # require technician session
    (tabs)/
      _layout.tsx                # Jobs | Map | Me
      today.tsx
      map.tsx
      me.tsx
    visits/[id]/
      index.tsx                  # detail
      navigate.tsx
      inspection.tsx
      service.tsx
      parts.tsx
      exception.tsx
      qc.tsx
    offline-queue.tsx
```

### 9.4 Bottom tab bar (walkthrough)

| Tab ID | Label | Icon | Default route |
|--------|-------|------|---------------|
| `today` | Jobs | list | `(tabs)/today` |
| `map` | Map | map | `(tabs)/map` |
| `me` | Me | user | `(tabs)/me` |

Active tab: brand `#5DB7E8` label + icon.

### 9.5 Global providers

```tsx
// app/_layout.tsx — structure
<QueryClientProvider>
  <AuthProvider>
    <OfflineSyncProvider>  {/* NetInfo → drain queue */}
      <ThemeProvider tokens={designTokens}>
        <Stack />
      </ThemeProvider>
    </OfflineSyncProvider>
  </AuthProvider>
</QueryClientProvider>
```

### 9.6 Shared components

| Component | Used on |
|-----------|---------|
| `FlowRail` | fieldVisit stack (9 dots) |
| `VisitCard` | today, map |
| `OfflineBanner` | all screens when queue pending or offline |
| `ScopeChecklist` | detail (read-only), service (interactive) |
| `PartsEntryList` | parts |
| `QCChecklist` | qc |
| `EvidencePhotoGrid` | inspect, exception |
| `PrimaryButton` / `SecondaryButton` | design system Phase 02 |

### 9.7 `fieldVisitCoordinator` rules

1. Never show **Edit estimate** or price inputs.
2. Primary CTA always derived from `allowed_actions[0]` priority: CHECK_IN > START_SERVICE > SUBMIT_QC > COMPLETE.
3. Inspection visit: after check-in route to `inspection`, not `service`.
4. Service visit: after check-in route to `service`.
5. Exception available from overflow menu on service/inspect when `RAISE_EXCEPTION` in actions.

### 9.8 Offline UX requirements

| Requirement | Implementation |
|-------------|----------------|
| Persistent banner | "Offline — N changes pending" when NetInfo disconnected OR queue length > 0 |
| Optimistic check-in | Show "Pending sync" chip on visit card |
| No fake complete | Do not show success toast until server 2xx or queued with visible pending state |
| Failed replay | Surface in `offline-queue.tsx` with retry + discard (discard requires confirm) |
| App kill safety | Queue persisted before UI optimistic update |

### 9.9 Permissions (`app.json`)

```json
{
  "expo": {
    "plugins": [
      ["expo-location", { "locationWhenInUsePermission": "CARATOM uses your location to navigate to customer addresses and record arrival." }],
      ["expo-camera", { "cameraPermission": "CARATOM uses the camera to capture inspection and service evidence." }]
    ]
  }
}
```

### 9.10 Analytics events (stub OK)

| Event | Screen |
|-------|--------|
| `tech_today_viewed` | today |
| `visit_opened` | detail |
| `visit_en_route` | detail/map |
| `visit_check_in` | navigate |
| `inspection_submitted` | inspect |
| `parts_saved` | parts |
| `exception_raised` | exception |
| `qc_submitted` | qc |
| `visit_completed` | qc |
| `offline_queue_drained` | background |

---

## 10. Backend Implementation

### 10.1 Module layout

```text
backend/app/modules/
  technicians/
    router.py       # mounts /v1/technician/*
    service.py      # resolve technician from profile_id
  visits/
    router.py       # optional split; may live under technicians
    service.py
    state_machine.py
    repository.py
    schemas.py
  inspections/
    service.py      # findings submission
  field_work/
    parts.py
    labour.py
    qc.py
  media/
    router.py       # /v1/media/signed-upload
    storage.py      # Supabase service role
  dispatch/
    service.py
  admin/
    router.py       # assign hook only in Phase 06
```

### 10.2 Layering rules

| Layer | Responsibility |
|-------|----------------|
| `router.py` | HTTP, auth, idempotency key extraction |
| `schemas.py` | Pydantic request/response — technician responses use `TechnicianVisitDetail` without prices |
| `service.py` | Transactions, state machine, snapshot reads |
| `repository.py` | SQLAlchemy queries |
| `state_machine.py` | Pure transition table |

### 10.3 Authorization

```python
async def require_assigned_visit(visit_id: UUID, technician: Technician) -> Visit:
    visit = await repo.get_visit(visit_id)
    assignment = await repo.get_current_assignment(visit_id)
    if not assignment or assignment.technician_id != technician.id:
        raise HTTPException(403, detail=problem("FORBIDDEN", "Not assigned to this visit."))
    return visit
```

Customer JWT → 403 on all `/v1/technician/*`. Admin JWT → 403 except media upload for support scenarios.

### 10.4 Idempotency

All `POST` mutation handlers:

1. Read `Idempotency-Key` header (required; 422 if missing).
2. Look up `client_event_id` on target table unique index.
3. If exists → return **200** with current resource (duplicate safe).
4. Else apply mutation in transaction.

### 10.5 Dispatch hook service

```python
async def assign_technician_to_booking(self, booking_id: UUID, technician_id: UUID, admin_id: UUID):
    async with self.db.begin():
        booking = await self.bookings.get_confirmed(booking_id)
        snapshot = await self.snapshots.get_for_booking(booking.id)
        visit_type = infer_visit_type(snapshot.flow_policy, booking.sequence)
        visit = await self.visits.create_from_booking(booking, snapshot, visit_type)
        await self.assignments.create(visit.id, technician_id)
        visit.status = VisitStatus.ASSIGNED
        await self.outbox.enqueue("visit.assigned", {"visit_id": str(visit.id), ...})
        await self.audit.log(admin_id, "visit.assigned", visit.id, reason=None)
    return visit
```

### 10.6 Location ping throttling

Reject pings closer than `TECH_LOCATION_PING_MIN_INTERVAL_SECONDS` unless `force=true` on check-in event.

### 10.7 Exception endpoint

```python
@router.post("/visits/{visit_id}/exception")
async def raise_exception(body: ExceptionRequest, ...):
    # body: summary, requested_action, media_asset_ids[]
    # Creates job_card_event + optional advisor_case link
    # May transition visit → SUPPORT_REQUIRED
```

### 10.8 OpenAPI

Tag: `technician`, `media`, `admin-dispatch`. Document idempotency header on all POSTs.

---

## 11. Database Implementation

### 11.1 Scope

Phase 06 adds all tables in Task 6.1. Does **not** add inventory stock tables (Phase 09).

### 11.2 Visit creation from booking

When dispatch assigns:

```python
visit = Visit(
    public_ref=generate_visit_ref(booking.job_card_ref, sequence=1),
    booking_id=booking.id,
    job_card_id=booking.job_card_id,
    visit_type=VisitType.SERVICE,
    status=VisitStatus.ASSIGNED,
    scheduled_start_at=booking.slot_start_at,
    scheduled_end_at=booking.slot_end_at,
)
```

### 11.3 Exclusion constraint (recommended)

```sql
-- Prevent overlapping visits for same technician when status active
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE visits ADD CONSTRAINT no_overlap_assigned_technician
  EXCLUDE USING gist (
    technician_id WITH =,
    tstzrange(scheduled_start_at, scheduled_end_at) WITH &&
  ) WHERE (status NOT IN ('COMPLETED', 'CANCELLED'));
```

Implement via materialized technician_id on visits or join table — choose one approach in migration; document in ADR if simplified to app-level check for Phase 06.

### 11.4 Snapshot read for scope

Technician detail **never** joins live `estimate_line_items` for scope. Use `booking_snapshots.payload.scope_lines` written at book time.

### 11.5 media_assets lifecycle

| State | Meaning |
|-------|---------|
| `pending` | Signed URL issued, upload not confirmed |
| `ready` | Upload verified (optional webhook or client confirm) |
| `failed` | TTL expired |

Phase 06: mark `ready` on successful PUT callback or client confirm POST.

### 11.6 Indexes

```sql
CREATE INDEX visits_scheduled_start_idx ON visits (scheduled_start_at);
CREATE INDEX visits_status_idx ON visits (status);
CREATE INDEX technician_assignments_technician_idx ON technician_assignments (technician_id) WHERE is_current;
CREATE INDEX location_pings_technician_time_idx ON technician_location_pings (technician_id, recorded_at DESC);
```

---

## 12. API Contracts

Base path: `/v1/technician` — all require `Authorization: Bearer <technician JWT>` unless noted.

### 12.1 `GET /v1/technician/visits?date=YYYY-MM-DD`

**Query:** `date` required — interpreted in `Asia/Kolkata`.

**Response 200:**

```json
{
  "date": "2026-08-19",
  "timezone": "Asia/Kolkata",
  "visits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "public_ref": "V-1042-A",
      "job_card_ref": "JC-1042",
      "visit_type": "SERVICE",
      "status": "ASSIGNED",
      "scheduled_label": "11:00 · Inspection",
      "distance_km": 4.2,
      "vehicle_label": "Honda City",
      "address_short": "Koramangala 5th Block",
      "allowed_actions": ["VIEW", "EN_ROUTE"]
    }
  ],
  "summary": { "total": 3, "completed": 0 }
}
```

**Note:** Walkthrough shows "11:00 · Inspection" for JC-1042 — visit_type may display label combining slot + policy; service+repair booked as SERVICE visit.

---

### 12.2 `GET /v1/technician/visits/{id}`

**Response 200:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "public_ref": "V-1042-A",
  "job_card_ref": "JC-1042",
  "visit_type": "SERVICE",
  "status": "ASSIGNED",
  "scheduled_label": "Wed 11:00 – 13:00",
  "distance_km": 4.2,
  "vehicle_label": "Honda City 2019 · Petrol",
  "address_short": "Koramangala 5th Block",
  "concerns": "AC weak on idle · brakes feel soft",
  "scope_lines": [
    { "id": "...", "label": "General servicing + health report", "kind": "SERVICE", "status": "PENDING" },
    { "id": "...", "label": "AC gas refill", "kind": "REPAIR", "status": "PENDING" },
    { "id": "...", "label": "Brake pads (pair)", "kind": "REPAIR", "status": "PENDING" },
    { "id": "...", "label": "Brake fluid flush", "kind": "REPAIR", "status": "PENDING" }
  ],
  "advisor_note": "Customer accepted on call · pads + fluid confirmed",
  "customer_name": "Rajesh",
  "customer_phone_masked": "+91 98765 *****0",
  "address_full": "12, 5th Cross, Koramangala 5th Block",
  "parking_notes": "Basement B2 · call on arrival",
  "allowed_actions": ["EN_ROUTE", "VIEW"],
  "tags": [{ "code": "SERVICE_REPAIR", "label": "Service + repair" }, { "code": "APPROVED", "label": "Approved" }]
}
```

**MUST NOT include:** `amount_minor`, `unit_price`, estimate version ids.

---

### 12.3 `POST /v1/technician/visits/{id}/en-route`

**Headers:** `Idempotency-Key: <uuid>`

**Body:** `{ "lat": 12.9352, "lng": 77.6245 }` optional

**Response 200:** Updated visit detail; status `EN_ROUTE`.

**Side effect:** Location ping recorded; customer progress may update (Phase 11 notification).

---

### 12.4 `POST /v1/technician/visits/{id}/check-in`

**Headers:** `Idempotency-Key`

**Body:** `{ "lat": 12.934, "lng": 77.610, "accuracy_m": 12 }`

**Response 200:** status `ON_SITE`; `allowed_actions` includes `START_SERVICE` or `START_INSPECTION`.

---

### 12.5 `POST /v1/technician/visits/{id}/start-inspection`

**Response 200:** status `INSPECTION_IN_PROGRESS`.

---

### 12.6 `POST /v1/technician/visits/{id}/start-service`

**Response 200:** status `SERVICE_IN_PROGRESS`.

---

### 12.7 `POST /v1/technician/visits/{id}/inspection-findings`

**Body:**

```json
{
  "summary": "Brake pads worn · AC gas low",
  "recommendation": "Pads + fluid flush (no price)",
  "severity": "medium",
  "media_asset_ids": ["uuid", "uuid"]
}
```

**Response 200:** status `INSPECTION_SUBMITTED`; triggers advisor workflow (Phase 04/07).

---

### 12.8 `POST /v1/technician/visits/{id}/parts`

**Body:**

```json
{
  "lines": [
    { "sku_code": "BP-HC-19", "label": "Brake pad set · OEM", "quantity": 1, "notes": null },
    { "sku_code": "BF-500", "label": "Brake fluid 500ml", "quantity": 1, "notes": null }
  ]
}
```

**Response 200:** `{ "parts_recorded": 2 }` — **no prices** in response.

**422** if client sends `unit_price` field (strip and reject).

---

### 12.9 `POST /v1/technician/visits/{id}/labour`

**Body:**

```json
{
  "entries": [{ "description": "Brake pad replacement", "minutes": 45 }]
}
```

---

### 12.10 `POST /v1/technician/visits/{id}/qc`

**Body:**

```json
{
  "items": [
    { "code": "ac_vent_temp", "label": "AC vent temp OK", "passed": true },
    { "code": "no_leak", "label": "No leak at fittings", "passed": true },
    { "code": "error_codes", "label": "Error codes clear", "passed": true }
  ],
  "passed": true
}
```

**Response 200:** If all passed → status `QC_PENDING` → `COMPLETED` on success path; failed item → `QC_FAILED`.

---

### 12.11 `POST /v1/technician/visits/{id}/complete`

**Headers:** `Idempotency-Key`

**Response 200:** status `COMPLETED`; job card progress updated server-side.

Idempotent if already `COMPLETED`.

---

### 12.12 `POST /v1/technician/location-pings`

**Body:**

```json
{
  "visit_id": "uuid-or-null",
  "lat": 12.93,
  "lng": 77.62,
  "accuracy_m": 15,
  "recorded_at": "2026-08-19T05:30:00.000Z",
  "client_event_id": "uuid"
}
```

**Response 202:** Accepted (may batch in worker later).

---

### 12.13 `POST /v1/technician/visits/{id}/exception`

**Body:**

```json
{
  "summary": "Rotor scoring — pads alone not safe",
  "requested_action": "Advisor review + customer callback",
  "media_asset_ids": ["uuid"]
}
```

**Response 200:** Exception recorded; visit may enter `SUPPORT_REQUIRED`.

---

### 12.14 `POST /v1/media/signed-upload`

**Auth:** technician or admin.

**Body:**

```json
{
  "visit_id": "uuid",
  "filename": "evidence.jpg",
  "content_type": "image/jpeg",
  "byte_size": 2048000,
  "sha256": "optional-hex"
}
```

**Response 200:**

```json
{
  "asset_id": "uuid",
  "upload_url": "https://...supabase.co/storage/v1/upload/sign/...",
  "upload_headers": { "Content-Type": "image/jpeg" },
  "expires_at": "2026-08-19T06:30:00.000Z"
}
```

---

### 12.15 Dispatch hook: `POST /v1/admin/jobs/{job_card_id}/assign`

**Auth:** admin.

**Body:**

```json
{
  "technician_id": "uuid",
  "visit_type": "SERVICE"
}
```

**Response 201:** Created visit + assignment.

---

### 12.16 Error conventions

Same Problem Details as Phase 01–03:

| Code | When |
|------|------|
| `FORBIDDEN` | Wrong role or not assigned |
| `INVALID_STATE_TRANSITION` | Illegal visit transition |
| `IDEMPOTENCY_CONFLICT` | Same key, different body |
| `VISIT_NOT_FOUND` | 404 |
| `UPLOAD_QUOTA_EXCEEDED` | Too many pending assets |

---

## 13. Complete Data Flow

### 13.1 Happy path: service visit (JC-1042)

```text
[Dispatch assign POST /v1/admin/jobs/JC-1042/assign]
       │
       ▼
[Visit ASSIGNED + booking_snapshot scope loaded]
       │
       ▼
[Technician GET /v1/technician/visits?date=2026-08-19]
       │
       ▼
[Open detail → POST en-route → POST check-in]
       │
       ▼
[POST start-service → service checklist UI]
       │
       ├── POST parts (SKU lines)
       ├── POST labour
       │
       ▼
[POST qc → POST complete]
       │
       ▼
[Visit COMPLETED · customer progress VISIT complete · outbox event]
```

### 13.2 Inspection visit path

```text
[check-in ON_SITE]
       │
       ▼
[POST start-inspection]
       │
       ▼
[Capture photos → signed-upload → inspection-findings]
       │
       ▼
[INSPECTION_SUBMITTED → COMPLETED or await Phase 07 repair booking]
```

### 13.3 Offline replay path

```text
[Airplane mode: POST check-in queued eventId=E1]
       │
       ▼
[UI shows ON_SITE optimistic + pending badge]
       │
       ▼
[Online: drain sends POST check-in Idempotency-Key: E1]
       │
       ▼
[200 → dequeue E1 · refresh visit detail]
```

### 13.4 Signed upload path

```text
[Camera capture local URI]
       │
       ▼
[POST signed-upload → PUT binary to Supabase]
       │
       ▼
[Attach asset_id to findings/parts/exception]
```

### 13.5 Exception path

```text
[Rotor scoring discovered on service screen]
       │
       ▼
[exception screen → POST /exception + photos]
       │
       ▼
[Advisor case flagged · visit SUPPORT_REQUIRED]
       │
       └── Technician cannot POST complete until admin resolves (or override Phase 09)
```

---

## 14. UI/UX Conformance (embed ALL fieldVisit walkthrough screens inline)

**Normative reference:** [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — `techFolders.fieldVisit`.

**Global tokens (Phase 02 light-blue accent):**

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#176B9E` | Primary buttons, active tab, today card left border |
| `--brand-soft` | `#EAF6FC` | Chips, success backgrounds |
| `--bg` | `#F6F4F1` | Screen canvas |
| `--card` | `#FFFFFF` | Visit cards |
| `--muted` | `#6B6B6B` | Secondary copy |
| `--ok` | `#2E7D4F` | Done chips, sync online |
| `--warn` | `#B45309` | Exception banner |

**Global chrome (all technician screens):**

- Status bar: `9:41` · `●●●● LTE` (walkthrough mock)
- Bottom tabs: **Jobs** | **Map** | **Me**
- Nav back: `‹` unless root tab

**Flow rail (fieldVisit stack):** 9 dots — order: today(1) → detail(2) → map(3) → inspect(4) → service(5) → parts(6) → exception(7) → qc(8) → me(9).  
**Note:** inspect **or** service is taken per visit type — inactive branch shown as skipped in coordinator, not in rail numbering.

**Folder hint (walkthrough):** *E2E: assigned jobs → read-only job card → navigate → inspect or service → parts → QC. Technician never edits estimates — sales advisor on admin does.*

---

### 14.1 Screen `today`

**Walkthrough ID:** `today`  
**Route:** `app/(tech)/(tabs)/today.tsx`  
**Tab active:** `today` (Jobs)  
**Flow step:** 1 of 9  
**Nav title:** Today  
**Nav right:** On duty

#### Navigation

| Action | Target |
|--------|--------|
| Visit card tap | `/visits/{id}` (detail) |
| Map tab | `(tabs)/map` |
| Me tab | `(tabs)/me` |
| Pull refresh | Refetch `GET /v1/technician/visits?date=today` |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Date header | Wednesday 19 Aug · 3 jobs |
| Card 1 title | 11:00 · Inspection |
| Card 1 distance chip | 4.2 km |
| Card 1 job | JC-1042 · Honda City |
| Card 1 address | Koramangala 5th Block |
| Card 2 title | 14:00 · One-man |
| Card 2 distance | 7 km |
| Card 2 sub | JC-0991 · Creta · lighting |
| Card 3 title | 16:30 · Repair visit 2 |
| Card 3 distance | 5 km |
| Card 3 sub | JC-1008 · Swift |
| Nav right | On duty |

#### Layout

1. Muted date summary line
2. **Card 1** — left border 3px `#5DB7E8` (next/upcoming emphasis)
3. Cards 2–3 — standard white cards
4. Each card: time + type row, job ref + vehicle, muted address, distance chip right

#### Sample data (API)

From `GET /v1/technician/visits?date=2026-08-19` — 3 items ordered by `scheduled_start_at`.

#### States

| State | Behavior |
|-------|----------|
| Loading | 3 skeleton cards |
| Empty | "No jobs assigned today" + refresh + contact support |
| Offline | Banner + cached list with stale timestamp |
| Error | Retry banner |

---

### 14.2 Screen `detail`

**Walkthrough ID:** `detail`  
**Route:** `app/(tech)/visits/[id]/index.tsx`  
**Tab active:** `today`  
**Flow step:** 2 of 9  
**Nav title:** JC-1042

#### Navigation

| Action | Target |
|--------|--------|
| Back | `(tabs)/today` |
| **I'm on the way** (secondary) | `POST en-route` → stay or toast |
| **Open navigation** (primary) | `/visits/{id}/navigate` |
| Scope line | Read-only — no edit |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Tags | Service + repair · Approved |
| Vehicle | Honda City 2019 · Petrol |
| Plate/time | KA-01-XX-4421 · Wed 11:00 – 13:00 |
| Concerns label | Customer concerns |
| Concerns body | AC weak on idle · brakes feel soft |
| Section title | Approved work (from job card) |
| Line 1 | General servicing + health report · In scope |
| Line 2 | AC gas refill · Approved |
| Line 3 | Brake pads (pair) · Approved |
| Line 4 | Brake fluid flush · Added on advisor call · Approved |
| Price disclaimer | Selling prices hidden · estimate edits are advisor-only on admin |
| Advisor note label | Advisor note |
| Advisor note | Customer accepted on call · pads + fluid confirmed |
| Customer row | Rajesh · Call |
| Address row | 5th Cross, Koramangala |
| Parking row | Basement B2 · call on arrival |
| Map | MAP PREVIEW placeholder |
| Secondary CTA | I'm on the way |
| Primary CTA | Open navigation |

#### Layout

1. Tag chips row
2. Vehicle card with car photo placeholder
3. Concerns card
4. Approved work list — **chips only, no ₹ amounts**
5. Muted disclaimer
6. Advisor note card
7. Contact/address list
8. Map preview block
9. Two buttons stacked

#### Colors

- Tag `Approved`: green chip `--ok`
- Tag `Service + repair`: neutral chip
- Primary CTA: `#176B9E`

---

### 14.3 Screen `map` (Navigate)

**Walkthrough ID:** `map`  
**Route:** `app/(tech)/visits/[id]/navigate.tsx` (visit-scoped) AND `(tabs)/map.tsx` (day overview)  
**Tab active:** `map` (when on tab route) or `today` (when in visit stack)  
**Flow step:** 3 of 9  
**Nav title:** Navigate  
**Nav back:** ‹ Job

#### Navigation (visit navigate)

| Action | Target |
|--------|--------|
| Back | `/visits/{id}` |
| **Arrived · on site** | `POST check-in` → service or inspection |

#### Copy (verbatim — visit navigate)

| Element | Text |
|---------|------|
| Map | Full-width map placeholder (road, van, pin) |
| Address | 12, 5th Cross, Koramangala |
| ETA | 4.2 km · 18 min |
| Primary CTA | Arrived · on site |

#### Layout

1. Map block ~40% viewport height
2. Address card
3. Full-width primary button

#### Map tab (day overview)

Shows all today's visits as pins; tapping pin opens visit detail. Copy: no extra walkthrough — reuse today cards list + map pins.

---

### 14.4 Screen `inspect`

**Walkthrough ID:** `inspect`  
**Route:** `app/(tech)/visits/[id]/inspection.tsx`  
**Flow step:** 4 of 9 (inspection visits only)  
**Nav title:** Inspection

#### Navigation

| Action | Target |
|--------|--------|
| Back | detail |
| **Submit findings to advisor** | `POST inspection-findings` → qc or complete path |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Finding label | Finding |
| Finding value | Brake pads worn · AC gas low |
| Recommend label | Recommend |
| Recommend value | Pads + fluid flush (no price) |
| Photos | Photo 1 · + Camera |
| Disclaimer | Recommendations go to the sales advisor — you do not edit the customer estimate. |
| Primary CTA | Submit findings to advisor |

#### Layout

1. Two labeled cells (finding, recommend)
2. 2-column photo grid
3. Muted disclaimer
4. Primary button

#### Behavior

- Camera opens on + Camera tile
- Photos upload via signed-upload pipeline
- **No price fields anywhere**

---

### 14.5 Screen `service`

**Walkthrough ID:** `service`  
**Route:** `app/(tech)/visits/[id]/service.tsx`  
**Flow step:** 5 of 9 (service visits)  
**Nav title:** Service visit

#### Navigation

| Action | Target |
|--------|--------|
| **Record parts used** (secondary) | `/visits/{id}/parts` |
| **Go to QC** (primary) | `/visits/{id}/qc` when all lines Done |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Intro | Work against approved job card lines · customer accepted on advisor call |
| Line 1 | General service + health report · Done |
| Line 2 | AC gas refill · Done |
| Line 3 | Brake pads (pair) · Now |
| Line 4 | Brake fluid flush · Queued |
| Secondary CTA | Record parts used |
| Primary CTA | Go to QC |

#### Layout

Checklist rows with status chips: `Done` (green), `Now` (brand), `Queued` (neutral).

#### Behavior

Tap row cycles PENDING → IN_PROGRESS → DONE (local optimistic; PATCH scope line status via API extension or batch on QC).

---

### 14.6 Screen `parts`

**Walkthrough ID:** `parts`  
**Route:** `app/(tech)/visits/[id]/parts.tsx`  
**Flow step:** 6 of 9  
**Nav title:** Parts fitted

#### Navigation

| Action | Target |
|--------|--------|
| **Scan barcode** | Camera stub / future |
| **+ Add part from van stock** | SKU search sheet (Phase 09 inventory feed; Phase 06 manual SKU entry OK) |
| **Save parts for this visit** | `POST parts` → back to service |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Intro | Trace what you fitted — SKU, qty, notes. No selling price on this screen. |
| Part 1 | Brake pad set · OEM |
| Part 1 meta | SKU BP-HC-19 · qty 1 |
| Part 1 chip | Fitted |
| Part 2 | Brake fluid 500ml |
| Part 2 meta | SKU BF-500 · qty 1 |
| Secondary 1 | Scan barcode |
| Secondary 2 | + Add part from van stock |
| Primary CTA | Save parts for this visit |

#### Layout

List rows with part icon placeholder, SKU meta muted, Fitted chip.

---

### 14.7 Screen `exception`

**Walkthrough ID:** `exception`  
**Route:** `app/(tech)/visits/[id]/exception.tsx`  
**Flow step:** 7 of 9 (optional branch)  
**Nav title:** Raise exception

#### Navigation

| Action | Target |
|--------|--------|
| **Submit exception to advisor** | `POST exception` → back to detail with SUPPORT banner |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Banner | Something on site differs from the approved job card — do not change the bill yourself. |
| Found label | What you found |
| Found value | Rotor scoring — pads alone not safe |
| Action label | Requested action |
| Action value | Advisor review + customer callback |
| Photos | Evidence photo · + Camera |
| Disclaimer | Flags the sales advisor on admin. Visit may pause until scope is re-approved. |
| Primary CTA | Submit exception to advisor |

#### Colors

- Banner: warn background `#FEF3C7`, text `#92400E`

---

### 14.8 Screen `qc`

**Walkthrough ID:** `qc`  
**Route:** `app/(tech)/visits/[id]/qc.tsx`  
**Flow step:** 8 of 9  
**Nav title:** QC

#### Navigation

| Action | Target |
|--------|--------|
| **Mark visit complete** | `POST qc` + `POST complete` → today list |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Item 1 | AC vent temp OK · Pass |
| Item 2 | No leak at fittings · Pass |
| Item 3 | Error codes clear · Pass |
| Primary CTA | Mark visit complete |

#### Layout

Toggle rows Pass/Fail per item; all Pass enables primary CTA.

#### Behavior

Failed QC → `QC_FAILED` → show rework message; do not show invoice paid.

---

### 14.9 Screen `me`

**Walkthrough ID:** `me`  
**Route:** `app/(tech)/(tabs)/me.tsx`  
**Tab active:** `me`  
**Flow step:** 9 of 9  
**Nav title:** Imran

#### Navigation

| Action | Target |
|--------|--------|
| Offline queue row tap | `/offline-queue` |
| **Contact support** | `tel:` or support ticket stub |

#### Copy (verbatim)

| Element | Text |
|---------|------|
| Duty card | On duty |
| Skills | Skills: AC, electrics, brakes |
| Today jobs | Today's jobs · 3 |
| Sync | Online |
| Offline queue | 0 pending |
| Queue explainer | Queued events — Check-ins, photos, and parts sync when back online |
| Secondary CTA | Contact support |

#### Layout

1. Duty card with green dot
2. Stats list (jobs, sync, queue)
3. Explainer card
4. Support button

#### States

| State | Copy |
|-------|------|
| Offline | Sync chip → Offline (warn) |
| Pending queue | Offline queue · N pending |
| Failed events | Red badge + link to queue screen |

---

## 15. Security

### 15.1 Phase 06 security requirements

| Control | Implementation |
|---------|----------------|
| Role isolation | Middleware `require_role("technician")` on `/v1/technician/*` |
| Assignment scope | Technicians read only assigned visits |
| No price injection | Reject `unit_price` / `amount_minor` in technician POST bodies |
| Signed upload scope | Upload URL tied to visit_id + uploader; short TTL |
| Service role isolation | Supabase service role server-only |
| Location privacy | Pings retained per policy; not exposed to other customers |
| Offline queue | No secrets in queue payloads; JWT not stored in queue entries |
| Idempotency | Prevents replay duplicates on flaky networks |
| Dev assign endpoint | Gated `ENV=development` |

### 15.2 MUST NOT do in Phase 06

- Expose estimate line prices in technician API
- Allow technician to PATCH job cards or estimates
- Upload media without visit assignment check
- Store service role key in mobile bundle
- Mark visit COMPLETED client-side without server ack

### 15.3 Phase 09+ prep

- Admin override complete with audit reason
- Inventory movement on parts fit
- Rate limit location pings per technician

Reference: [`14-security.md`](../architecture/14-security.md)

---

## 16. Testing Strategy

### 16.1 Test pyramid

| Layer | Scope | Tool |
|-------|-------|------|
| Visit state machine unit | Illegal transitions | pytest |
| API integration | All §12 routes | pytest + TestClient |
| Idempotency | Duplicate POST same key | pytest |
| Role boundaries | customer 403 | pytest |
| Offline queue reducer | enqueue/drain/dedupe | Jest/Vitest |
| Coordinator unit | allowed_actions → routes | Vitest |
| Component | OfflineBanner, FlowRail | RNTL |
| E2E manual | JC-1042 full flow | Expo Go checklist §17 |
| E2E automated | Optional Detox Phase 11 | Deferred |

### 16.2 Required backend tests

```python
def test_list_visits_requires_technician_role(customer_client):
    assert customer_client.get("/v1/technician/visits?date=2026-08-19").status_code == 403

def test_en_route_transitions_assigned_to_en_route(tech_client, visit_id):
    r = tech_client.post(f"/v1/technician/visits/{visit_id}/en-route",
        headers={"Idempotency-Key": str(uuid4())})
    assert r.status_code == 200
    assert r.json()["status"] == "EN_ROUTE"

def test_idempotent_check_in(tech_client, visit_id):
    key = str(uuid4())
    h = {"Idempotency-Key": key}
    assert tech_client.post(f"/v1/technician/visits/{visit_id}/check-in", headers=h).status_code == 200
    assert tech_client.post(f"/v1/technician/visits/{visit_id}/check-in", headers=h).status_code == 200

def test_parts_rejects_unit_price(tech_client, visit_id):
    body = {"lines": [{"sku_code": "X", "label": "Y", "quantity": 1, "unit_price": 100}]}
    assert tech_client.post(f"/v1/technician/visits/{visit_id}/parts", json=body).status_code == 422

def test_dispatch_assign_creates_visit(admin_client, booking_id, tech_id):
    r = admin_client.post(f"/v1/admin/jobs/{booking_id}/assign",
        json={"technician_id": str(tech_id), "visit_type": "SERVICE"})
    assert r.status_code == 201
```

### 16.3 Required frontend tests

```typescript
describe('offlineQueueStore', () => {
  it('drains FIFO and removes on 200', async () => { ... });
  it('dedupes same eventId', async () => { ... });
});

describe('fieldVisitCoordinator', () => {
  it('routes inspection visit to inspection screen', () => { ... });
});
```

### 16.4 Manual E2E script

See §17.6 — JC-1042 full fieldVisit path including airplane mode segment.

Reference: [`15-testing-strategy.md`](../architecture/15-testing-strategy.md)

---

## 17. Verification Procedure

Run from repository root unless noted.

### 17.1 Prerequisites

```powershell
# Phase 03+ backend running
pnpm dev:api
# Seed Phase 06 demo
cd backend
uv run python scripts/seed_phase06_demo.py
```

### 17.2 API smoke (technician)

```powershell
$TECH_TOKEN = "<technician JWT from OTP dev login>"
$H = @{ Authorization = "Bearer $TECH_TOKEN" }

curl -s -H $H "http://localhost:8000/v1/technician/visits?date=2026-08-19"
curl -s -H $H "http://localhost:8000/v1/technician/visits/<visit-id>"
curl -s -X POST -H $H -H "Idempotency-Key: $(New-Guid)" `
  "http://localhost:8000/v1/technician/visits/<visit-id>/en-route"
```

Expected: 200 JSON; no `amount_minor` in scope lines.

### 17.3 API smoke (signed upload)

```powershell
curl -s -X POST -H $H -H "Content-Type: application/json" `
  -d '{"visit_id":"<id>","filename":"test.jpg","content_type":"image/jpeg","byte_size":1000}' `
  http://localhost:8000/v1/media/signed-upload
```

Expected: `upload_url` present.

### 17.4 Dispatch hook smoke

```powershell
$ADMIN = @{ Authorization = "Bearer <admin JWT>" }
curl -s -X POST -H $ADMIN -H "Content-Type: application/json" `
  -d '{"technician_id":"<tech-uuid>","visit_type":"SERVICE"}' `
  http://localhost:8000/v1/admin/jobs/<job-card-id>/assign
```

Expected: 201 + visit id.

### 17.5 Start technician app

```powershell
pnpm dev:technician
# Expo Go port 8082 — login Imran +91 99000 11001
```

### 17.6 Manual E2E checklist (JC-1042)

- [ ] Today shows **Wednesday 19 Aug · 3 jobs**
- [ ] JC-1042 card has **4.2 km** chip and green left border
- [ ] Detail shows approved lines **without ₹**
- [ ] Disclaimer: **Selling prices hidden...**
- [ ] Open navigation → map + **Arrived · on site**
- [ ] Service checklist matches walkthrough Done/Now/Queued
- [ ] Parts: BP-HC-19 and BF-500 saved
- [ ] QC: three Pass rows → **Mark visit complete**
- [ ] Me tab: sync Online, queue 0
- [ ] Airplane mode: check-in queues → online drains once

### 17.7 Offline replay verification

1. Enable airplane mode after en-route.
2. Tap **Arrived · on site**.
3. Confirm pending badge on Me tab.
4. Disable airplane mode.
5. Confirm queue drains to 0; server visit status `ON_SITE`.
6. Query DB: single check-in row for that idempotency key.

### 17.8 CI

```powershell
pnpm ci
cd backend
uv run pytest tests/test_technician_visits.py tests/test_visit_transitions.py tests/test_signed_upload.py -v
```

### 17.9 Role boundary check

```powershell
curl -s -H "Authorization: Bearer <customer JWT>" http://localhost:8000/v1/technician/visits
# Expected: 403
```

---

## 18. Full Codebase Audit checklist

Mark PASS/FAIL/N/A before exit gate.

### 18.1 Technician app

- [ ] All 9 walkthrough screens implemented (§14)
- [ ] Bottom tabs Jobs / Map / Me
- [ ] Flow rail on visit stack
- [ ] No price fields in UI
- [ ] Offline banner + queue in Me
- [ ] Camera/location permission strings present

### 18.2 Backend

- [ ] All §12 endpoints live in OpenAPI
- [ ] Visit state machine enforced
- [ ] Idempotency-Key required on POST
- [ ] Technician DTOs omit selling prices
- [ ] Signed upload validates assignment
- [ ] Dispatch assign creates visit

### 18.3 Database

- [ ] Migration 0006 applied
- [ ] Demo seed creates 3 visits
- [ ] `client_event_id` unique indexes exist

### 18.4 Contracts

- [ ] Zod schemas match OpenAPI
- [ ] api-client technician methods typecheck

### 18.5 Security

- [ ] Customer 403 on technician routes
- [ ] No service role in client env
- [ ] Parts POST rejects unit_price

### 18.6 Tests & CI

- [ ] pytest technician suite green
- [ ] Offline queue unit tests green
- [ ] CI includes new tests

---

## 19. Vibe Coding Principles Audit (table format)

| Control / Principle | Source | Phase 06 expectation | Pass criteria |
|---------------------|--------|----------------------|---------------|
| AI claims ≠ evidence | VIBE-CODING §4.3 | §17 commands executed | Paste curl/pytest output |
| Minimum scope | VIBE-CODING §4.11 | No dispatch UI | Only assign hook |
| No secrets in repo | GREENFIELD Checklist 3 | Storage keys server-only | Manual review |
| Independent tests | VIBE-CODING §4.3 | pytest not skipped | CI green |
| Trust boundaries | GREENFIELD Checklist 2 | §5.2 diagram | Technician cannot price |
| Idempotent retries | Constitution §6 | Offline queue | Dedup test pass |
| Walkthrough fidelity | AUDIT-REPORT | §21 all screens | Screen audit PASS |
| Dependency verify | VIBE-CODING §4.4 | expo-camera, maplibre real packages | package.json locks |

---

## 20. Architecture Conformance Audit

| Architecture rule | Phase 06 conformance | Evidence |
|-------------------|------------------------|----------|
| Separate technician app | Required | apps/technician |
| Technician never sets prices | Required | §12 DTOs, §14 UI |
| Visit state machine | Required | §5.3, state_machine.py |
| Booking snapshots immutable | Required | scope from snapshot |
| REST `/v1/technician/*` | Required | §12 |
| Signed upload to Storage | Required | §12.14 |
| Offline queue client-side | Required | §5.4, §9.8 |
| Dispatch creates visits | Required | §10.5 |
| No PostgREST writes | Required | api-client only |
| Parts traceability | Started | job_parts table |
| UTC timestamps | Required | ISO 8601 Z |

**Non-conformance allowed:** Full inventory deduction deferred Phase 09; push notifications deferred Phase 11.

---

## 21. Walkthrough Conformance Audit (screen-by-screen fieldVisit)

| Screen ID | Walkthrough | Phase 06 route | Copy match | Price hidden | PASS |
|-----------|-------------|----------------|------------|--------------|------|
| `today` | ✓ | `(tabs)/today` | §14.1 verbatim | N/A | [ ] |
| `detail` | ✓ | `visits/[id]` | §14.2 | ✓ | [ ] |
| `map` | ✓ | `visits/[id]/navigate` + `(tabs)/map` | §14.3 | N/A | [ ] |
| `inspect` | ✓ | `visits/[id]/inspection` | §14.4 | ✓ | [ ] |
| `service` | ✓ | `visits/[id]/service` | §14.5 | ✓ | [ ] |
| `parts` | ✓ | `visits/[id]/parts` | §14.6 | ✓ | [ ] |
| `exception` | ✓ | `visits/[id]/exception` | §14.7 | ✓ | [ ] |
| `qc` | ✓ | `visits/[id]/qc` | §14.8 | N/A | [ ] |
| `me` | ✓ | `(tabs)/me` | §14.9 | N/A | [ ] |

**Bottom tabs:** Jobs / Map / Me — must match walkthrough `apps.technician.tabs`.

**Flow rail:** 9 steps visible on stack screens 2–8.

**Gate rule:** All 9 screens PASS before Phase 06 exit.

---

## 22. Regression Audit

| Check | Method |
|-------|--------|
| Phase 03 booking still works | Run gs-01→gs-10 smoke |
| Customer cannot access tech routes | pytest 403 |
| Phase 02 auth unchanged | Customer login still works |
| CI green on clean checkout | GitHub Actions |
| Lockfile reproducible | frozen install |

**Baseline tag:** `phase-06-complete` optional after exit gate.

---

## 23. Technical Debt Review

| Debt item | Severity | Accept in Phase 06? | Paydown phase |
|-----------|----------|---------------------|---------------|
| MapLibre Expo Go fallback static map | Low | Yes | 11 native build |
| Manual SKU entry vs van stock search | Medium | Yes | 09 inventory |
| No push on assign | Medium | Yes | 11 |
| Visit overlap DB constraint simplified | Medium | Yes | 09 dispatch |
| Barcode scan stub only | Low | Yes | Optional |
| Background GPS | Low | Yes | 11 |
| QC checklist hardcoded v1 | Low | Yes | 09 CMS |
| Exception → advisor UI on admin | Medium | Yes | 04/09 |
| media_assets pending→ready confirm | Low | Yes | 11 worker |

---

## 24. Phase Exit Gate (checkbox list)

All boxes MUST be checked before starting Phase 07.

### Backend

- [ ] Migration 0006 applied cleanly
- [ ] All §12 technician endpoints implemented
- [ ] `POST /v1/media/signed-upload` works end-to-end
- [ ] Dispatch assign hook creates visit visible to technician
- [ ] Visit state machine tests pass
- [ ] Idempotency tests pass
- [ ] Customer role 403 on technician namespace

### Technician mobile

- [ ] Login as technician succeeds; customer rejected
- [ ] Today shows 3 demo jobs (Wed 19 Aug copy)
- [ ] fieldVisit E2E JC-1042 completable
- [ ] All 9 walkthrough screens §21 PASS
- [ ] Offline queue: enqueue + drain without duplicates
- [ ] No selling price visible anywhere

### Contracts & CI

- [ ] `@caratom/contracts` technician types match API
- [ ] `@caratom/api-client` technician methods work
- [ ] pytest + TS tests green
- [ ] GitHub Actions CI green

### Audits

- [ ] §18 Full Codebase Audit applicable items PASS
- [ ] §19 Vibe audit applicable PASS
- [ ] §20 Architecture audit PASS
- [ ] §21 Walkthrough audit 9/9 PASS

---

## 25. Outputs Passed to Next Phase

### 25.1 Artifacts for Phase 07 (Inspection + Repair)

| Artifact | Location | Use |
|----------|----------|-----|
| `POST .../inspection-findings` | API | Customer estimate after inspection |
| Inspection visit type | visits.visit_type | Two-visit policy |
| Evidence upload pipeline | media module | Customer-facing report |
| JC-1042 inspection demo | seed | Phase 07 E2E |

### 25.2 Artifacts for Phase 09 (Admin web)

| Artifact | Location | Use |
|----------|----------|-----|
| `job_parts`, `job_labour` | DB | Used on job screen |
| `technician_location_pings` | DB | Dossier map |
| `GET /v1/admin/technicians/{id}/dossier` | API stub OK | Full in 09 |
| Visit history on job card | visits table | Job board |

### 25.3 Artifacts for Phase 10 (Admin mobile dispatch)

| Artifact | Location | Use |
|----------|----------|-----|
| `DispatchService.assign_technician_to_booking` | backend | Wire dispatch UI |
| `POST /v1/admin/jobs/{id}/assign` | API | Mobile dispatch CTA |
| `visit.assigned` outbox | outbox_events | Notifications |

### 25.4 Demo credentials

| Role | Phone | Name |
|------|-------|------|
| Technician | +91 99000 11001 | Imran |
| Admin (assign) | +91 99000 10001 | Priya |
| Customer | +91 98765 43210 | Rajesh |

### 25.5 Handoff command bundle

```powershell
pnpm install
docker compose up -d
cd backend && uv sync && uv run alembic upgrade head
uv run python scripts/seed_phase06_demo.py
cd ..
pnpm dev:api
pnpm dev:technician
# Login Imran → verify today → run §17.6 E2E
```

---

## 26. Cursor Execution Instructions

### 26.1 Agent preamble

When executing Phase 06 in Cursor:

1. Read this entire document before writing code.
2. Confirm Phase 03 exit gate — bookings + snapshots must exist.
3. Read [`AUDIT-REPORT.md`](../AUDIT-REPORT.md) technician section — **no selling prices in field app**.
4. Execute §8 tasks sequentially; backend before mobile integration.
5. Embed walkthrough copy from §14 — do not paraphrase technician-facing strings.
6. Implement dispatch **hooks** only — not admin dispatch board UI (Phase 10).
7. Run §17 verification before claiming §24 exit gate.
8. AI-generated code is unverified until pytest + §17.6 manual E2E pass.

### 26.2 Recommended workflow

```text
Step 1: Tasks 6.1–6.7   (DB + backend API + seed + dispatch)
Step 2: Tasks 6.12–6.13 (contracts + api-client + pytest)
Step 3: Tasks 6.8–6.11  (technician app auth + screens + offline)
Step 4: Task 6.14–6.16  (map/location + exception + CI)
Step 5: §17 verification (API + manual E2E + offline)
Step 6: §18–§23 audits
Step 7: §24 exit gate
```

### 26.3 Scope discipline

| Do | Do not |
|----|--------|
| Implement all 9 fieldVisit screens | Build admin dispatch board |
| Hide selling prices | Show ₹ on technician detail |
| Offline queue with idempotency | Fake complete without server/queue |
| Signed upload via API | Direct storage bucket keys in app |
| Assign hook for admin API | Full dossier UI |
| Inspection **and** service paths | Conflate with customer repair tab |

### 26.4 File creation order

1. Alembic migration + models
2. Visit state machine + service
3. Technician + media routers
4. Contracts + api-client
5. pytest until green
6. Technician app shell + auth
7. Visit screens bottom-up: today → detail → navigate → service/inspect → parts → exception → qc → me
8. Offline queue last (depends on mutations)

### 26.5 Common failure modes

| Failure | Fix |
|---------|-----|
| Technician sees prices | Strip from DTO mapper |
| 403 on all visits | Seed assignment + on_duty |
| Duplicate check-ins offline | Idempotency-Key = eventId |
| Signed upload 403 | Verify visit assignment |
| Empty today list | Run seed; check date timezone IST |
| Map blank in Expo Go | Use placeholder per §14.3 |
| Customer JWT on tech app | Role gate at login |

### 26.6 Commit guidance

Suggested messages (only when user requests commit):

```text
feat(phase-06): add visits schema and state machine
feat(phase-06): implement /v1/technician API and signed upload
feat(phase-06): add dispatch assign hook
feat(phase-06): technician app fieldVisit screens
feat(phase-06): offline queue and sync
test(phase-06): technician visit integration tests
```

### 26.7 Completion report template

```markdown
## Phase 06 Complete

- Exit gate: X/X checkboxes
- Walkthrough audit: 9/9 screens
- Verification: §17 [pass/fail]
- Line count: N lines
- Offline E2E: [pass/fail]
- Known debt: §23 items
- Ready for Phase 07: [yes/no]
```

### 26.8 Stop condition

**Stop after §24 exit gate passes.** Do not implement Phase 07 customer inspection UI, admin dispatch board, or inventory stock — those belong to Phases 07, 09, 10.

---

*End of PHASE-06-technician-field-execution.md*