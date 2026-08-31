# CARATOM Pre-Implementation Architecture Audit Report

**Date:** 2026-08-29  
**Scope:** Documentation-only repository; no application code exists.  
**Authority:** [`docs/CARATOM-client-walkthrough.html`](CARATOM-client-walkthrough.html) is the **god reference** for all app faces (user-confirmed). Architecture docs in [`docs/architecture/`](architecture/00-overview.md) are secondary and must adapt where they conflict with the walkthrough, except for non-negotiable safety rules (server-authoritative money, auth, audit).

---

## 1. Executive Summary

CARATOM is a **doorstep automotive-service operating system** for a real car-care company—not a marketplace, workshop ERP, or generic booking app. Customers discover services, build a job scope, receive server-authoritative estimates, book doorstep slots, follow field execution, pay, and retain service history. Technicians execute assigned visits with evidence, parts traceability, and offline tolerance. Admin staff (advisors, dispatch, ops) manage the commercial lifecycle, inventory, money, and recovery.

The repository contains **25 planning documents** and one interactive HTML walkthrough. There is **no implementation** (no `package.json`, backend, migrations, or CI). The architecture corpus in `docs/architecture/` is unusually thorough for a docs-only project: domain model, state machines, API surface, data model, screen specs, roadmap, and open questions are all present.

**User-confirmed build targets:**

| Surface | Stack | Distribution |
|---------|-------|--------------|
| Customer app | Expo (iOS + Android) | **Public** App Store + Google Play |
| Technician app | Expo (iOS + Android) | **Private** direct download only |
| Admin mobile | Expo (iOS + Android) | **Private** direct download only |
| Admin web | Next.js on Railway | Browser URL |
| API + worker | FastAPI + ARQ on Railway | — |
| Data/auth/storage | Supabase | — |

**Overall readiness: 🟠 Significant architectural gaps**

Phase 0 scaffolding can begin. Phases 2+ require resolving walkthrough-vs-architecture conflicts (vehicle timing, home navigation model, checkout steps, admin dual-surface scope) and answering open product questions (catalog prices, tax rules, SOS scope). The walkthrough and architecture docs **disagree materially** on customer flow order; the walkthrough wins per product owner direction, but backend flow documents must be updated before engineers implement coordinators blindly from `02-product-flows.md`.

---

## 2. Product Understanding

### Users and roles

| Role | Surface | Primary jobs |
|------|---------|--------------|
| Customer (car owner) | Customer Expo app | Browse, job card, estimate, advisor call (when add-ons), book slot, pay, history |
| Technician (field) | Technician Expo app | Assigned visits, navigate, inspect/service, parts, QC, offline sync |
| Admin / sales advisor | Admin mobile + admin web | Advisor inbox, live estimate edit during calls, dispatch, overrides, catalog, inventory, money |
| System | FastAPI monolith | Policy, pricing, scheduling, money, audit |

MVP: **admin is omnipotent**; separate restricted advisor role is deferred (`19-open-questions.md`).

### Core problem

Translate real doorstep operations—scope, advisor clarification, scheduling, field work, inventory consumption, invoicing, payment—into a trustworthy consumer and ops platform where **server policy drives flow**, not screen conditionals.

### Core functionality

- **Four flow policies:** `GENERAL_SERVICE`, `ONE_MAN`, `DIRECT_SPECIAL`, `INSPECTION_REPAIR`
- General Service **without add-ons:** estimate → accept → finalize → book (no advisor)
- General Service **with add-ons:** estimate → accept → advisor call → possible revised estimate → finalize → book
- **One-man Job:** direct book (fixed price, no General Service funnel)
- **Direct Special Services:** same reduced path (catalog-driven; ~10 offerings in architecture; walkthrough shows One-man grid only)
- **Inspection + Repair:** two-visit path (architecture fully specified; **no customer walkthrough folder**)
- **SOS / roadside:** four-screen emergency flow in walkthrough; architecture treats as future policy, MVP may be support-only

### Major user journeys (walkthrough-grounded)

1. **General service (no add-ons):** Home → vehicle picker (make/model/year/fuel) → job card → estimate → accept → details (name/phone/address) → slot → confirmed  
2. **General + repair:** Home → repairs cart → vehicle picker → job card → estimate → submit & callback → on call → accept/deny revised estimate → slot → confirmed  
3. **One-man job:** Home → job detail → vehicle → details → slot → confirmed  
4. **SOS:** SOS home → pick help → calling → help dispatched  
5. **Technician field visit:** Today → job card (read-only) → navigate → inspect OR service → parts → exception → QC → profile/sync  
6. **Admin advisor:** Inbox → job on call → edit estimate → send to customer app  

### Mobile app experience (walkthrough)

- **Home chrome:** location top-left, optional vehicle pill top-right, **four mode tabs** (General service · Service + repair · One-man job · SOS)
- **Bottom nav (customer):** Home, Orders, Profile
- **Visual language:** mostly white/near-white surfaces, dark text, real automotive imagery, and **tasteful light-blue accents** (`#5DB7E8` / brand-strong `#176B9E`) on primary actions, active tabs, selected borders, vehicle pills, and links — not a page-wide tint
- **Design system doc (`10-design-system.md`):** light blue accent (`#5DB7E8`); warns against excessive cards. An earlier walkthrough CSS used green (`#0e3d2c`) — **product owner decision: light blue wins**; walkthrough CSS is retinted to match doc 10

---

## 3. System Architecture

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  CUSTOMER APP   │  │ TECHNICIAN APP  │  │ ADMIN MOBILE    │  │   ADMIN WEB     │
│  Expo iOS/Android│  │ Expo iOS/Android│  │ Expo iOS/Android│  │ Next.js Railway │
│  PUBLIC stores  │  │ PRIVATE install │  │ PRIVATE install │  │ Browser         │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                         │
                              HTTPS + Supabase JWT
                                         ▼
                              ┌──────────────────────┐
                              │ FastAPI modular      │
                              │ monolith (Railway)   │
                              └──────────┬───────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ Supabase        │            │ Redis + ARQ     │            │ External        │
│ Postgres        │            │ worker (Railway)│            │ Razorpay, SMS,  │
│ Auth, Storage   │            │ outbox, jobs    │            │ maps, Expo Push │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

### Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Customer / technician / admin-mobile** | Presentation, local draft, offline queue (tech), flow coordinators consuming `FlowDecision` and `allowed_actions` |
| **Admin web** | Dense ops UI: tables, catalog, inventory, reports, full job editor |
| **FastAPI** | Auth verification, domain rules, pricing, scheduling, transitions, audit, signed storage URLs |
| **Supabase Postgres** | Source of truth persistence via SQLAlchemy/Alembic |
| **Supabase Auth** | Phone OTP, JWT issuance |
| **Supabase Storage** | Private media/PDFs; metadata in Postgres |
| **Redis/ARQ** | Async notifications, reminders, outbox delivery—not business truth |
| **Railway** | API, worker, Redis, admin web hosting |

**Hard rule:** Clients never write job, estimate, invoice, inventory, or payment truth via PostgREST (`01-product-constitution.md` rule 37).

### Monorepo target

```text
apps/customer          Expo
apps/technician        Expo
apps/admin-mobile      Expo
apps/admin             Next.js
packages/api-client
packages/contracts
backend/               FastAPI + Alembic + workers
```

---

## 4. Walkthrough → Architecture Mapping

### Customer: General service (no add-ons)

| Step | Walkthrough ID | Architecture doc sequence | API / domain |
|------|----------------|---------------------------|--------------|
| Home | `gs-01-home` | Home / service detail | `GET /v1/catalog/home`, `GET /v1/services/{slug}` |
| Vehicle picker | `gs-02`–`gs-05` | **Not in architecture late-finalization model** | Local draft context; `POST /v1/job-cards/preview` may use vehicle for compatibility |
| Job card | `gs-06-jobcard` | Start job card, concerns | `POST/PATCH /v1/job-cards`, concerns endpoints |
| Estimate | `gs-07-estimate` | Request estimate, accept | `POST /price`, `POST .../accept` |
| Details | `gs-08-details` | Customer + address (combined in WT) | `POST /v1/job-cards/{id}/finalization` (partial) |
| Slot | `gs-09-slot` | Slot hold + confirm | `GET slots`, `POST slot-holds`, `POST book` |
| Confirmed | `gs-10-confirmed` | Booking confirmation | `GET /v1/bookings/{id}`, composed `customer_progress` |

**Gap:** Architecture puts definitive vehicle **after** estimate acceptance in separate Vehicle + Address screens; walkthrough puts **vehicle before job card** and **merges customer + address** in one Details screen.

### Customer: General + repair (add-ons + advisor)

| Step | Walkthrough ID | Architecture | API / domain |
|------|----------------|--------------|--------------|
| Repairs cart | `gpr-02-repairs` | Add-ons inside job card editor | `POST/PATCH job-card items`, repair catalog `GET /v1/repair-offerings` |
| Estimate + callback | `gpr-08-estimate` | Accept estimate then create advisor case | `POST accept`, `POST /advisor-case` |
| On call / revised | `gpr-09`–`gpr-10` | AdvisorCase states, revised estimate | Admin `POST resolve`, customer accept/reject |
| Deny → cart | `gpr-02-deny-cart` | Reject estimate → editable job card | `POST reject`, JobCard → EDITABLE |

**Gap:** Walkthrough uses **"Deny"** vs architecture **"Reject / Change job card"**. Walkthrough puts **repairs cart before vehicle picker**; architecture implies job card composition first.

### Customer: One-man job

| Step | Walkthrough ID | Architecture | Notes |
|------|----------------|--------------|-------|
| Detail → vehicle → details → slot | `om-02`–`om-06` | Service detail → auth → customer → vehicle → address → slot | WT skips standalone estimate screen (aligns with direct book). WT order: **vehicle before customer details**; architecture: **customer details before vehicle**. |

### Customer: SOS

| Step | Walkthrough ID | Architecture | Notes |
|------|----------------|--------------|-------|
| Full 4-screen dispatch | `sos-01`–`sos-04` | Future `ROADSIDE_ASSISTANCE`; MVP may be support entry only | **Major scope conflict**—walkthrough wins per god reference |

### Customer: Account (partial in walkthrough)

| Screen | Walkthrough | Architecture screens |
|--------|-------------|---------------------|
| Login | `login` | OTP auth, session restore |
| Orders | `orders` | Booking list, detail, progress |
| Profile | `profile` | Profile hub |
| Addresses | `addresses` | Saved addresses |

**Missing from walkthrough:** invoice/payment, rating, booking detail/progress, notifications, support, saved vehicles management screens.

### Technician: field visit

| Screen | Walkthrough | API |
|--------|-------------|-----|
| today, detail, map, inspect, service, parts, exception, qc, me | Full folder | `GET /v1/technician/visits`, status transitions, parts, QC, location pings, offline queue |

Architecture supports this path. Walkthrough correctly hides selling prices from technician.

### Admin: advisor revise + ops

| Walkthrough | Primary surface | API |
|-------------|-----------------|-----|
| `adm-01`–`adm-04` advisor flow | **Admin mobile** (on-call ergonomics) | `/v1/admin/advisor-cases`, estimate publish |
| `board`, `dispatch`, `override` | Admin mobile (lite) + **admin web** (full) | Admin job board, assign, override with audit |
| `inventory`, `catalog`, `people`, `money`, `more` | **Admin web** primary; mobile read/action subset | Admin namespace routes |

Walkthrough copy on `more` screen: *"Admin controls the entire company from this app"*—implies single admin mobile surface; user also requires **admin web** for desk work. Split required.

### Inspection + Repair (architecture only)

Architecture (`02-product-flows.md` §Inspection-and-repair) defines full two-visit flow. Walkthrough references `Inspect+repair` in admin inbox sample and `inspectRepairs` JS array but **no customer E2E folder**. Inspiration README maps a home tab to "Inspect + repair" but walkthrough tab is "Service + repair" (General + add-ons).

---

## 5. 🔴 Critical Inconsistencies

### C1. Vehicle collection timing

| Source | Says |
|--------|------|
| **Walkthrough** (`general`, `repair` folders) | Mandatory 4-step vehicle picker **before** job card |
| **Architecture** (`00-overview.md`, `02-product-flows.md`) | Optional early context; **definitive vehicle at finalization** after estimate acceptance |
| **Resolution** | **Walkthrough wins.** Implement early vehicle context picker as shown; still re-validate compatibility/reprice at finalization if definitive vehicle differs. Update `02-product-flows.md` and `11-screen-specifications.md`. |
| **Why it matters** | Flow coordinators, guest browse behavior, and when repricing triggers all depend on this order. |

### C2. Home navigation model

| Source | Says |
|--------|------|
| **Walkthrough** | Four top tabs: General service · Service + repair · One-man job · SOS |
| **Architecture** | Single `GENERAL_SERVICE` policy; add-ons branch via `FlowDecision`, not separate home products |
| **Inspiration README** | Tabs: General · **Inspect + repair** · One-man · SOS |
| **Resolution** | **Walkthrough wins:** implement four mode tabs as UX entry points mapping to policies: `general` tab → GENERAL_SERVICE no add-ons path; `repair` tab → GENERAL_SERVICE with add-ons path; `oneman` → ONE_MAN; `sos` → SOS. Catalog/backend still uses `flow_policy`; tabs are merchandising, not separate backends. Clarify that "Service + repair" ≠ Inspection+Repair. |
| **Why it matters** | Home component design, analytics, and catalog structure. |

### C3. Admin: three clients (docs) vs four surfaces (user)

| Source | Says |
|--------|------|
| **Architecture** | Customer Expo, technician Expo, admin **Next.js only** |
| **User + walkthrough admin face** | Admin **mobile + web** |
| **Resolution** | Add `apps/admin-mobile` (Expo). Walkthrough admin face → admin mobile MVP. Admin web carries dense ops (inventory grids, catalog editor, reports). Document split in ADR. |
| **Why it matters** | Repo structure, roadmap phases, screen ownership. |

### C4. Checkout step decomposition

| Source | Says |
|--------|------|
| **Walkthrough** | Single "Your details" (name + phone + address); slot screen confirms booking directly |
| **Architecture** (`11-screen-specifications.md`) | Separate Customer details → Vehicle details → Address → Slot → **Booking review** |
| **Resolution** | **Walkthrough wins** for screen count/composition: combined details screen for GS and one-man paths; add **booking review** only if walkthrough's slot "Confirm" is interpreted as review+confirm combined (gs-09/gpr-11). Vehicle details for GS already captured early—finalization uses snapshot, not re-picker unless edit. |
| **Why it matters** | Expo routes, finalization API sequencing. |

### C5. Inspection + Repair customer journey unspecified in god reference

| Source | Says |
|--------|------|
| **Architecture** | Full two-visit policy; Phase 6 roadmap |
| **Walkthrough** | No customer folder; admin inbox mentions Inspect+repair |
| **Resolution** | **Add walkthrough folder or explicit appendix** before Phase 6; until then, architecture spec is provisional. Do not conflate with "Service + repair" tab. |
| **Why it matters** | Major differentiator product surface with no UI spec. |

### C6. SOS scope

| Source | Says |
|--------|------|
| **Walkthrough** | Full emergency dispatch (map, pick help, calling, dispatched, ETA) |
| **Architecture** (`02-product-flows.md`) | Future policy; MVP may be support/call entry |
| **Resolution** | **Walkthrough wins** for customer SOS tab UI. Backend may stub dispatch with honest "ops will call" until operational coverage exists—but screens must exist. |
| **Why it matters** | MVP scope, location permissions, ops promises. |

### C7. Authority hierarchy in `00-overview.md`

| Source | Says |
|--------|------|
| **00-overview.md** | Walkthrough rank #4, "screen intent only" |
| **User** | Walkthrough is **god reference** |
| **Resolution** | Update `00-overview.md` hierarchy when docs are next edited. Audit and Emergent prompt use walkthrough-first rule. |

---

## 6. 🟠 Important Issues

### I1. Design system vs walkthrough visuals

**Resolved:** Product owner decision is **light blue used as a selective accent**, matching `10-design-system.md` (`brand #5DB7E8`, `brand-strong #176B9E`). The walkthrough HTML had incorrectly used green (`#0e3d2c`); that CSS is retinted. Green/amber/red remain **semantic only** (success/warning/danger). Layout density (cards) is heavier in the walkthrough than the design system prefers — prefer composition over card walls.

### I2. One-man / direct special checkout order

Walkthrough: vehicle → details. Architecture: customer details → vehicle → address. Align to walkthrough; ensure address is not dropped (walkthrough includes address in details).

### I3. Advisor flow action labeling

Walkthrough: "Submit estimate & request callback" on gpr-08; "Deny" on gpr-10. Map to: accept estimate → create advisor case; reject estimate → return to job card/cart. Same semantics, different copy.

### I4. Live estimate push during advisor call

Walkthrough implies real-time push to customer during call (`adm-04-send` → `gpr-10-revised`). Architecture mentions Supabase Realtime "narrowly" but no concrete channel spec. **Specify:** push notification + polling fallback + optional Realtime subscription on estimate version.

### I5. Post-booking customer screens absent from walkthrough

Orders list exists; missing booking detail, invoice, payment, rating. Architecture `11-screen-specifications.md` defines these—implement from architecture with walkthrough visual language.

### I6. Direct Special Services catalog

Architecture describes ~10 Direct Special offerings beyond One-man. Walkthrough only shows One-man grid. Either extend walkthrough or defer Direct Special UI to catalog-driven generic direct-book screen.

### I7. Guest browse + OTP timing

Walkthrough sample user is always "Rajesh Kumar" (authenticated). Architecture allows guest browse until advisor/booking. Implement guest path even if walkthrough doesn't show it.

### I8. Technician visit type label

Walkthrough labels JC-1042 visit as "Inspection" while it is General + repair service visit—terminology confusion. Use visit type from domain (`SERVICE` vs `INSPECTION`).

### I9. Constitution duplicate numbering

`01-product-constitution.md` has two rules numbered **20** (commercial vs customer-flow sections). Renumber on next doc edit.

---

## 7. 🟡 Minor Issues

| Issue | Location | Note |
|-------|----------|------|
| `Customer` vs `Profile` vs snapshot | Domain model | Profile = auth person; booking snapshot = point-in-time |
| `Deny` vs `Reject` | Walkthrough vs API | UI copy vs API command naming |
| `Service + repair` tab name | Walkthrough | Not Inspection+Repair; document in glossary |
| `Sales advisor` vs `AdvisorCase` | Walkthrough vs domain | Same role; admin user "Priya" is advisor |
| Historical `POSSIBLE ARCHITECTURE.MD` | Root | Multi-car on one booking, separate advisor role—superseded by BookingGroup + admin omnipotent |
| `inspectRepairs` array unused | walkthrough HTML | Dead code; Inspection+Repair merchandising not wired |
| `specialties` array unused | walkthrough HTML | Special services grid not in customer UI |

---

## 8. 🔵 Open Questions / Ambiguities

From `19-open-questions.md` plus audit:

1. Exact One-man and Special Service catalog, prices, durations, escalation rules  
2. GST/tax/rounding for launch city  
3. Operating hours, cancellation/reschedule, travel buffers  
4. Map pin mandatory vs optional at address  
5. Advisor SLA, call windows, escalation  
6. Known catalog add-ons vs inspection-only repairs  
7. Inspection fee before visit 1?  
8. Parts advance % and refund on cancel  
9. Notification channels (push/SMS/WhatsApp) and provider  
10. Privacy retention/deletion  
11. Vehicle imagery/compatibility data source  
12. Customer-facing service history health reports in MVP?  
13. Warranty terms on invoice/history  
14. SOS operational coverage vs UI-only with support handoff  
15. Admin mobile vs web exact screen split for ops folder screens  

Use `DEV_FIXTURE` defaults in development; replace before launch.

---

## 9. Missing Architecture

| Area | Status |
|------|--------|
| OpenAPI full schemas | Semantic list in `09-api-contracts.md` only |
| RLS policy definitions | Mentioned, not specified |
| Supabase Storage bucket layout | Implied, not documented |
| Realtime channel design for advisor push | Missing |
| Guest draft import after OTP | Described in flows, no idempotency contract detail |
| Deep link URL scheme | Mentioned in frontend arch, not specified |
| Technician provisioning (invite vs phone login) | Ambiguous |
| Private app distribution runbook | User requirement; not in docs |
| Inspection+Repair customer walkthrough | Missing from god reference |
| Expo Go vs EAS dev build matrix | Required for Razorpay/push |
| Admin-mobile route tree | Not in `06-frontend-architecture.md` (web admin only) |
| CORS origin list per environment | Not specified |
| SOS backend entities | If walkthrough SOS is built, need SupportTicket/dispatch model |

---

## 10. Architectural Risks

1. **Dual source of truth during build:** Engineers reading `02-product-flows.md` without walkthrough will build wrong customer journey. Mitigation: walkthrough-first coordinators; update docs.  
2. **Admin mobile + web duplication:** Building every ops screen twice. Mitigation: strict scope split.  
3. **Expo Go limits:** Razorpay, push, some native modules need EAS dev builds before Phase 7.  
4. **Private app security:** Technician/admin APK sideloading doesn't replace server role checks.  
5. **Policy tabs vs backend policies:** Four home tabs must map cleanly to `flow_policy` + add-on presence to avoid duplicate logic.  
6. **Early vehicle + late reprice:** User picks vehicle early; definitive registration at booking may still trigger reprice—UX must handle loop honestly.  
7. **SOS over-promise:** Full dispatch UI without ops capacity creates trust risk.  
8. **Monolith module boundaries:** Without discipline, FastAPI modules bypass each other to SQL tables.  
9. **Six mobile build targets:** 3 apps × 2 platforms—QA matrix cost.  
10. **Supabase Realtime scope creep:** Using Realtime as general event bus instead of targeted estimate push.

---

## 11. Assumptions

| Assumption | Type | Risk |
|------------|------|------|
| Walkthrough = build spec for all faces | Explicit (user) | Low if enforced |
| One JobCard = one vehicle | Explicit (architecture) | Low |
| UTC storage, Asia/Kolkata display | Explicit | Low |
| Admin omnipotent in MVP | Explicit | Low |
| Customer public stores only | Explicit (user) | Low |
| iOS + Android simultaneous | Explicit (user) | Low |
| Expo Go sufficient for Phases 1–5 | Implied | **Medium**—native modules |
| Light-blue accent = final brand (doc 10) | Explicit (product owner) | Low — walkthrough CSS retinted |
| Combined details = one API finalization step | Implied (walkthrough) | Medium |
| SOS backend matches walkthrough UX day one | Implied | **High**—ops dependency |
| `Service + repair` tab ≠ Inspection+Repair | Inferred | **High** if confused |
| Supabase can replace FastAPI for domain logic | Dangerous misread | **Critical**—must not |

---

## 12. Implementation Readiness

### Rating: 🟠 Significant architectural gaps

| Criterion | Assessment |
|-----------|------------|
| Product vision | Clear via walkthrough + constitution |
| Domain model | Strong |
| API surface | Semantic coverage good; schemas missing |
| Data model | Strong |
| Customer UI spec | Walkthrough strong for 4 paths; gaps post-booking |
| Technician UI spec | Walkthrough complete for MVP field path |
| Admin UI spec | Walkthrough strong for advisor; ops split with web undefined |
| Infrastructure choices | Locked (Supabase, Railway, Expo) |
| Doc coherence | **Material conflicts** walkthrough vs flows/screen specs |
| Open product decisions | 15+ items block production config |

**Phase 0 (monorepo scaffold):** Can start.  
**Phase 1 (home, catalog, auth):** Can start with walkthrough home tabs.  
**Phase 2 (General Service E2E):** Requires C1, C2, C4 resolutions documented.  
**Phase 6 (Inspection+Repair):** Blocked without customer UI spec (C5).

---

## 13. Recommended Next Steps

Prioritized **before production code** (documentation/decisions):

1. Update authority hierarchy in `00-overview.md` — walkthrough god reference  
2. Document resolved customer flow order (walkthrough sequence) in `02-product-flows.md`  
3. Add `apps/admin-mobile` to `06-frontend-architecture.md` route tree  
4. Define admin mobile vs admin web screen ownership table  
5. Add Inspection+Repair customer walkthrough folder OR defer Phase 6 with written scope cut  
6. Brand color resolved: light-blue accent (doc 10); walkthrough CSS retinted off green  
7. Specify advisor live estimate delivery (push + poll + optional Realtime)  
8. Write private distribution runbook (technician + admin-mobile)  
9. Write Expo Go vs EAS dev build matrix  
10. Answer open questions 1–5 with `DEV_FIXTURE` for dev, real values for launch  
11. Create glossary: Service+repair tab, Deny/Reject, advisor vs technician pricing authority  
12. Proceed to Emergent implementation using `EMERGENT-IMPLEMENTATION-PROMPT.md`

---

*End of audit report.*
