# PHASE 02 — Identity, Design System & Catalog

**Document ID:** `PHASE-02-identity-design-catalog.md`  
**Version:** 1.0.0  
**Status:** Execution-ready specification  
**Depends on:** [PHASE-01-monorepo-platform-foundation.md](./PHASE-01-monorepo-platform-foundation.md) (Exit Gate §24 complete)  
**Unblocks:** [PHASE-03-general-service-e2e.md](./PHASE-03-general-service-e2e.md), [PHASE-04-service-repair-advisor.md](./PHASE-04-service-repair-advisor.md), [PHASE-05-oneman-sos-account.md](./PHASE-05-oneman-sos-account.md)

**Authority chain:**

1. Walkthrough screens embedded inline in this document and [`docs/CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html) — UI/flow truth for customer surfaces.
2. [`docs/architecture/01-product-constitution.md`](../architecture/01-product-constitution.md) — commercial invariants.
3. [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md) — resolved contradictions (light-blue accent, tab semantics, vehicle timing).
4. Architecture docs **02, 08, 09, 10, 11** — visual tokens follow **doc 10** (tasteful light-blue accent, not a page-wide tint). Walkthrough layout remains UI/flow truth; its CSS is retinted to match.

---

> **Standard section index:** This document uses the mandatory 0–26 structure. Legacy subsection labels (e.g. §8) remain as internal references within sections.

## 0. Phase Summary

### Document control & reading guide

### 0.1 Purpose

Phase 02 establishes **who the user is** (Supabase phone OTP + `profiles`), **how the app looks** (doc 10 light-blue accent tokens, used tastefully), and **what they can browse** (catalog read APIs + seeded Bengaluru/Koramangala launch data). It delivers a **customer home** with four mode tabs that are **UX entry points only**; all downstream booking logic uses server `flow_policy` and `FlowDecision`, never tab name inference.

### 0.2 Audience

Cursor agent executing implementation; human reviewer validating Exit Gate §26.

### 0.3 How to use this document

Execute tasks in §8 order. Do not skip §21 security or §22 testing. Pass all four audits (§23–§26) before declaring Phase 02 complete. Embedded screen specs in §11–§12 are **normative** for layout, copy, and color on home surfaces.

### 0.4 Estimated effort

| Area | Estimate |
|------|----------|
| Design tokens + shared UI package | 1–2 days |
| Supabase OTP + profiles + JWT middleware | 1–2 days |
| Catalog migrations + seed + read APIs | 2–3 days |
| Customer home (4 tabs) + chrome | 2–3 days |
| Admin web read-only catalog (optional) | 0.5–1 day |
| Tests + audits | 1–2 days |
| **Total** | **~8–13 engineer-days** |

### 0.5 Phase 02 definition of done (summary)

- Guest and authenticated users browse home catalog from live API.
- Phone OTP login works; JWT validated on FastAPI; `profiles` row created/updated.
- Light-blue accent tokens applied tastefully; home matches walkthrough chrome and gs-01/om-01 composition.
- Four mode tabs render distinct content; tab selection does **not** set server policy.
- `GET /v1/catalog/home` and `GET /v1/services` return seeded Koramangala launch catalog.
- All §23–§26 audits pass; verification commands in §22 succeed.

---

### Executive summary

Phase 02 transforms the Phase 01 empty platform into a **credible consumer storefront**: authenticated identity, a cohesive visual system of **mostly white/neutral surfaces with tasteful light-blue accents** (`#5DB7E8` / `#176B9E`), and a server-authoritative service catalog for the **Bengaluru / Koramangala** launch geography.

The customer app home exposes four folder-style mode tabs — **General service**, **Service + repair**, **One-man job**, and **SOS** — mirroring the Swiggy-inspired density described in [`docs/inspiration/customer-home/README.md`](../inspiration/customer-home/README.md). These tabs change **presentation and default navigation targets** only. When a user eventually starts a job card or books, the backend evaluates `flow_policy` on the selected `service_offering` and returns `FlowDecision`; the client must never infer advisor requirements from which tab was active.

Backend deliverables include the `profiles` table, JWT validation middleware, catalog schema (categories, offerings, inclusions, pricing policies, service area rules, CMS blocks), read-only catalog endpoints, and deterministic seed data. Optional minimal admin web shows the same catalog read model for ops verification.

**Critical glossary rule (repeat everywhere):**

> **"Service + repair" tab** = General Service **with optional repair add-ons** and advisor callback when add-ons are present. It is **NOT** Inspection + Repair (two-visit uncertain-work product — **Phase 07**).

---

## 1. Starting State

### Prerequisites & dependencies

### 2.1 Phase 01 exit gate (must be true)

| Prerequisite | Verification |
|--------------|--------------|
| Monorepo layout: `apps/customer`, `apps/admin`, `backend`, `packages/contracts`, `packages/api-client` | Directory exists |
| FastAPI serves `GET /health` and stub `GET /v1/me` | curl returns 200 |
| Supabase project linked; Postgres connection string in Railway secrets | backend connects |
| Alembic initialized | `alembic current` runs |
| Customer Expo app launches on iOS/Android simulator | Metro bundler OK |
| Admin Next.js shell loads | browser OK |
| CI: lint + typecheck on touched packages | green pipeline |
| `.env.example` documents public vs secret vars | no secrets committed |

### 2.2 External services

| Service | Phase 02 usage |
|---------|----------------|
| Supabase Auth | Phone OTP (India +91) |
| Supabase Postgres | profiles + catalog tables |
| Railway | FastAPI deploy target |
| EAS / Expo | customer app dev builds |

### 2.3 Documentation to read before coding

| Doc | Why |
|-----|-----|
| [`02-product-flows.md`](../architecture/02-product-flows.md) | FlowDecision, tab vs policy, auth timing |
| [`08-data-model.md`](../architecture/08-data-model.md) | Table naming, UUID, minor units |
| [`09-api-contracts.md`](../architecture/09-api-contracts.md) | Catalog + profile endpoints |
| [`10-design-system.md`](../architecture/10-design-system.md) | Color tokens and tasteful accent usage (source of truth) |
| [`11-screen-specifications.md`](../architecture/11-screen-specifications.md) | Home screen purpose, states, analytics |
| [`14-security.md`](../architecture/14-security.md) | JWT, no client secrets |
| [`15-testing-strategy.md`](../architecture/15-testing-strategy.md) | Integration test expectations |

---

## 6. Exact Implementation Scope + Out of Scope

### Scope boundaries

### 3.1 In scope

| ID | Deliverable |
|----|-------------|
| P02-A | Supabase phone OTP in customer app (send, verify, session restore) |
| P02-B | `profiles` table + upsert on first authenticated API call |
| P02-C | FastAPI JWT middleware (JWKS, iss, aud, exp, sub) |
| P02-D | `GET /v1/me`, `PATCH /v1/me` (profile read/update) |
| P02-E | Design tokens package — **doc 10 light-blue accent palette** |
| P02-F | Customer home: chrome + 4 mode tabs + tab-specific body content |
| P02-G | Catalog DB migrations + Alembic revision |
| P02-H | `GET /v1/catalog/home`, `GET /v1/services`, `GET /v1/services/{slug}` |
| P02-I | Seed: Bengaluru/Koramangala service area, offerings, inclusions, CMS |
| P02-J | `packages/contracts` types for catalog + profile DTOs |
| P02-K | Admin web **optional** read-only `/catalog` page |
| P02-L | Phase 02 tests + four audits |

### 3.2 Out of scope (explicit)

| Item | Phase |
|------|-------|
| Job card create/price/book | 03–05 |
| Repair add-on cart UI (gpr-02) | 04 |
| Advisor case, estimate accept | 03–04 |
| SOS SupportTicket creation flow | 05 |
| `vehicles`, `addresses` persistence APIs | 02–03 |
| Inspection + Repair customer UI | 07 |
| Razorpay, invoices | 08 |
| Admin catalog write/edit | 09 |
| Push notifications | 11 |
| Technician/admin mobile UI | 06, 10 |

### 3.3 Assumptions

- Launch service area is **Koramangala, Bengaluru** (pin codes 560034, 560035, 560047 subset — configurable via `service_area_rules`).
- Guest users may browse catalog without login; OTP required only when profile-restricted actions occur (Phase 03+); Phase 02 implements auth screens and session but does not gate catalog reads.
- SMS OTP via Supabase Auth default provider; production SMS template is Phase 12 concern.
- Single `customer` role for all consumer profiles in Phase 02; `technician` and `admin` roles seeded for test accounts only.

---

### Glossary (repeat in all customer phases)

| Term | Definition |
|------|------------|
| **General service tab** | Home UX mode showing base General Service package without add-on funnel entry. Maps to offerings with `flow_policy = GENERAL_SERVICE`. Server path: no add-ons → no advisor. |
| **Service + repair tab** | Home UX mode for General Service **with add-ons**. User will browse repair catalog in Phase 04. **NOT** Inspection + Repair. |
| **One-man job tab** | Home UX mode listing fixed-scope small jobs (`flow_policy = ONE_MAN` or `DIRECT_SPECIAL`). |
| **SOS tab** | Emergency UX entry (`ROADSIDE_ASSISTANCE` policy stub). Phase 02 renders home shell + map placeholder; ticket API in Phase 05. |
| **flow_policy** | Server enum on `service_offerings`: `GENERAL_SERVICE`, `ONE_MAN`, `DIRECT_SPECIAL`, `INSPECTION_REPAIR`. **Authoritative** for pricing/booking behavior. |
| **FlowDecision** | Server DTO returned on pricing/state changes; client navigates from `allowed_actions[]`. See [`02-product-flows.md`](../architecture/02-product-flows.md). |
| **Home chrome** | Shared top region: location block, vehicle pill, mode tabs. |
| **Vehicle context** | Local draft selection (make/model/year/fuel) before saved `vehicles` row — Phase 03. |
| **Catalog home payload** | Aggregated read model: hero CMS, offerings by section, trust strip, service area banner. |
| **Profile** | `profiles` row keyed by Supabase `auth.users.id`. |
| **Inspection + Repair** | Separate two-visit product for uncertain scope. **Phase 07**. Do not implement or label as "Service + repair". |

### 4.1 Naming guardrails (enforce in code review)

```text
✅ Tab label:     "Service + repair"
✅ Policy enum:   GENERAL_SERVICE (with add-ons added later on job card)
✅ UI copy:       "Add repairs to your cart" (Phase 04)

❌ Never label tab "Inspect + repair"
❌ Never map SOS tab to GENERAL_SERVICE policy
❌ Never set flow_policy from active tab index in client
```

---

## 4. Source Material

## 5. Architectural Context

### Architecture references & alignment

### 5.1 Product flows ([`02-product-flows.md`](../architecture/02-product-flows.md))

Phase 02 implements **browse and identity** only. Relevant flow rules to **preserve in design** (implement in Phase 03+):

- Authentication required before finalization, slot hold, orders, payment — not for catalog browse.
- General Service without add-ons bypasses advisor (`advisor_requirement = NOT_REQUIRED`).
- General Service with add-ons requires advisor after estimate accept.
- Client renders from `FlowDecision`; must not infer advisor from route/tab.

**Phase 02 alignment:** Home tabs store `preferred_entry_mode` in local UI state for analytics only. Selecting a service passes `service_offering_id` / `slug` to detail route; detail screen reads `flow_policy` from API response.

### 5.2 Data model ([`08-data-model.md`](../architecture/08-data-model.md))

Phase 02 introduces:

```text
profiles
service_categories
service_offerings
service_offering_versions        -- optional in Phase 02 if versioning deferred; prefer included now
included_service_items
pricing_policies
service_area_rules
cms_blocks
feature_settings                 -- minimal: launch flags
```

Deferred to Phase 03+: `vehicles`, `addresses`, `repair_*`, `job_cards`.

Conventions: UUID PKs, `timestamptz` UTC, `amount_minor` integer INR, soft-disable via `is_active` / `archived_at`.

### 5.3 API contracts ([`09-api-contracts.md`](../architecture/09-api-contracts.md))

Phase 02 implements:

```text
GET   /v1/me
PATCH /v1/me
GET   /v1/catalog/home
GET   /v1/services?flow_policy=&category_slug=
GET   /v1/services/{slug}
```

Auth: Supabase JWT in `Authorization: Bearer`. Errors follow Problem Details shape.

### 5.4 Design system ([`10-design-system.md`](../architecture/10-design-system.md))

Adopt **structure** (spacing, typography scale, component types, accessibility, states) **and color tokens** from doc 10. Light blue is a **selective accent**, not a page-wide tint.

| Token | Value | Use |
|-------|-------|-----|
| `brand` | `#5DB7E8` | Active tabs, selected borders, links, icons |
| `brand-strong` | `#176B9E` | Filled primary CTAs, pressed, high-contrast text on `brand-soft` |
| `brand-soft` | `#EAF6FC` | Small selected fills and policy-note backgrounds only |
| `canvas` | `#F7FAFC` | Cool near-white page background |

Keep large surfaces white or neutral. Prices and body copy use `text-strong` / `text`, not brand. Green/amber/red are **semantic only** (success/warning/danger).

### 5.5 Screen specifications ([`11-screen-specifications.md`](../architecture/11-screen-specifications.md))

**Home screen** (Phase 02 primary):

- Purpose: discover services, location/vehicle context, urgent help entry.
- UI: location top-left, vehicle pill top-right, mode tabs, hero, offerings, trust, bottom nav.
- States: loading skeletons per section, empty catalog message, independent section retry on error.
- Analytics events: `home_viewed`, `service_selected`, `tab_changed`, `special_service_selected`.
- Accessibility: service cards as labelled buttons; tab roles; heading hierarchy.

---

## 2. Desired End State

### Goals & measurable outcomes

| Goal ID | Statement | Measure |
|---------|-----------|---------|
| G1 | User can sign in with phone OTP | E2E: send OTP → verify → `GET /v1/me` returns profile |
| G2 | Catalog is server-driven | Home renders from `GET /v1/catalog/home`; no hardcoded offering list in app |
| G3 | Visual fidelity to walkthrough | Side-by-side: chrome, tabs, gs-01, om-01 within token tolerance |
| G4 | Tab/policy separation | Unit test: tab state does not appear in job-card API payloads |
| G5 | Launch geography | Seed returns `serviceable: true` for Koramangala test coordinate |
| G6 | Security baseline | No service-role key in client; JWT rejected when expired/tampered |
| G7 | Contracts synced | `packages/contracts` matches OpenAPI for catalog + profile |

---

### Deliverables matrix

| Deliverable | Path / artifact |
|-------------|-----------------|
| Design tokens | `packages/ui-tokens/` or `apps/customer/src/theme/tokens.ts` |
| Auth screens | `apps/customer/app/(auth)/phone.tsx`, `otp.tsx` |
| Session provider | `apps/customer/src/providers/AuthProvider.tsx` |
| Home screen | `apps/customer/app/(customer)/(tabs)/home.tsx` |
| Home components | `apps/customer/src/components/home/*` |
| JWT middleware | `backend/app/core/auth.py`, `backend/app/core/deps.py` |
| Profiles module | `backend/app/modules/profiles/` |
| Catalog module | `backend/app/modules/catalog/` |
| Migrations | `backend/alembic/versions/002_profiles_catalog.py` |
| Seed script | `backend/scripts/seed_catalog_koramangala.py` |
| OpenAPI update | `/docs` reflects new routes |
| Contracts | `packages/contracts/src/catalog.ts`, `profile.ts` |
| Admin catalog page | `apps/admin/app/(ops)/catalog/page.tsx` (optional) |
| Tests | `backend/tests/test_auth.py`, `test_catalog.py`, customer RTL tests |

---

## 3. Why This Phase Exists Here

Phase 02 is the first **product-visible** slice after platform scaffolding. Without identity, design tokens, and catalog, Phase 03 cannot implement vehicle selection or job cards against real offerings. Placing auth and catalog here (not Phase 03) ensures every downstream phase shares one JWT model, the doc 10 light-blue accent system, and a server-authoritative catalog — preventing duplicate auth stubs and hardcoded service lists in customer journeys.

---

## 8. Detailed Implementation Sequence (Task X.Y)

### Work breakdown & execution order

Execute sequentially; parallelize backend/mobile only where noted.

### Wave 1 — Foundation (parallel)

1. **Design tokens** — Create shared token file; wire into customer app ThemeProvider.
2. **DB migration** — profiles + catalog tables (§16).
3. **Supabase Auth config** — Enable phone provider; document test numbers.

### Wave 2 — Backend identity

4. **JWT middleware** — JWKS fetch, cache, dependency injection (§15).
5. **Profiles router** — GET/PATCH `/v1/me`; upsert profile on first auth call.
6. **Integration tests** — valid JWT, expired JWT, missing profile creation.

### Wave 3 — Catalog backend

7. **Catalog repository + service** — read queries, active-only filter.
8. **Catalog routers** — home aggregate, services list, service by slug (§17).
9. **Seed script** — Koramangala launch data (§18).
10. **Catalog integration tests** — schema shape, inactive offerings excluded.

### Wave 4 — Customer mobile

11. **Auth UI** — phone + OTP screens; SecureStore session (§14).
12. **API client** — attach JWT; regenerate contracts types.
13. **Home chrome component** — location, vehicle pill, mode tabs (§11).
14. **Tab bodies** — general, service+repair, one-man, SOS variants (§12).
15. **Loading/empty/error states** per §11 screen spec.

### Wave 5 — Admin optional + polish

16. **Admin read-only catalog table** — fetch `/v1/catalog/home` or admin route stub (§19).
17. **Analytics hooks** — stub `home_viewed` event.
18. **Run verification commands** (§22).
19. **Complete audits** (§23–§26).

---

## 9. Mobile Implementation

### Design system & canonical tokens

### 9.1 Brand decision

**Canonical tokens come from** [`10-design-system.md`](../architecture/10-design-system.md). Light blue (`#5DB7E8`) is a **selective accent** — primary actions, active tabs, selected borders, vehicle pills, and links. Surfaces stay white or near-white. Do **not** wash the page, prices, cards, or banners in blue. Document usage (not a green override) in `packages/ui-tokens/README.md`.

Filled primary CTAs use **`brand-strong #176B9E`** + white text for contrast. Do not fill large regions with `#5DB7E8`. Green/amber/red are semantic (`success` / `warning` / `danger`) only.

### 9.2 Color tokens (implement exactly)

```text
/* Accent brand — tasteful, not page-wide */
brand              #5DB7E8   active tabs, selected borders, links, icons
brand-strong       #176B9E   filled primary CTAs, pressed, high-contrast on brand-soft
brand-soft         #EAF6FC   small selected fills and policy-note backgrounds only

/* Surfaces */
canvas             #F7FAFC   page background (cool near-white)
surface            #FFFFFF   cards, inputs, bottom nav
surface-subtle     #F1F6F9   grouped lists, inactive segments
border             #DCE8EF   structural dividers 1px

/* Text */
text-strong        #142532   headings, prices
text-body          #243744   body
text-muted         #6A7B86   secondary labels, captions

/* Semantic (never brand) */
success            #2D8A61   "Included" chips, confirmed states
success-soft       #E9F6EF   success backgrounds
warning            #B56A22   SOS accent, callback-in-progress, caution banners
warning-soft       #FFF3E5   warn policy notes
danger             #C64242   destructive, errors, SOS urgency
danger-soft        #FDECEC   error backgrounds

/* Selection */
selection-bg       #EAF6FC   selected slot/year/model cells (small regions)
selection-border   #5DB7E8   1.5px selected state
```

### 9.3 Typography

- **Font family:** DM Sans (`@expo-google-fonts/dm-sans` on mobile; Google Fonts on admin web).
- **Scale:**

```text
display-hero       26/32  700   home hero titles (short)
nav-title          17/22  700   stack navigation titles
section-title      16/22  700   "Included in service", "Why CARATOM"
body               15/22  400   default copy
body-medium        15/22  600   emphasis rows
caption            12/16  500   loc-label, durations
price              15/18  700   text-strong (not brand)
label              11/14  500   form labels, loc-label
tab-label          13/18  600   mode tabs (700 when active)
```

Sentence case everywhere. No ALL CAPS body text.

### 9.4 Spacing & geometry

Base unit **4px**.

```text
space-1   4      space-2   8      space-3  12     space-4  16
space-5  20      space-6  24      space-8  32     space-10 40
```

- Page horizontal padding: **16px**
- Section vertical rhythm: **14–18px** between blocks; **24px** before major sections
- Touch targets: minimum **44×44 pt**
- Radius: controls **10px**, cards **14px**, sheets **18–20px**, pills **999px**
- Shadow: `0 1px 2px rgba(26,26,26,0.04)` on bottom nav and sheets only

### 9.5 Core components (Phase 02 subset)

| Component | Specification |
|-----------|---------------|
| **Primary button** | Full width, `#176B9E` fill, white text, padding vertical 14px, radius 12px |
| **Secondary button** | `#EAF6FC` fill, `#176B9E` text |
| **Policy note** | `#EAF6FC` bg, `#176B9E` text, radius 10px, 12px semibold; `.warn` uses warning-soft/warning |
| **Chip ok** | success-soft bg, success text — "Included" |
| **Chip warn** | warning-soft bg, warning text — SOS, callback |
| **Search field** | white, border, radius 12px, placeholder muted |
| **Vehicle pill** | white, border, full radius, brand dot 8px, truncated label max ~150px |
| **Mode tab** | 13px semibold; inactive muted; active brand + 2px bottom border; SOS active uses warning |
| **Bottom tab bar** | height 74px, Home/Orders/Profile, active brand icon+label |
| **Hero carousel** | 16:9 media area, overlay kicker+title, pagination dots |
| **Trust strip** | horizontal scroll, photo + short label cards |
| **One-man card** | 2-col grid, icon, name, duration muted, price text-strong |

### 9.6 Platform mapping

Export tokens as:

```typescript
// packages/ui-tokens/src/colors.ts
export const colors = { brand: '#5DB7E8', brandStrong: '#176B9E', ... } as const;

// React Native: use in StyleSheet or NativeWind theme extension
// Next.js admin: CSS variables on :root OR Tailwind extend.colors
```

### 9.7 Accessibility

- WCAG AA contrast for text on canvas/surface/brand buttons (filled CTAs use `#176B9E` on white; use `brand-strong` for small text on `brand-soft`).
- Tab selection: expose `accessibilityRole="tab"`, `selected` state.
- Service cards: `accessibilityRole="button"`, label includes name + price + duration.
- Dynamic type: allow text scaling without clipping primary CTAs.

---

## 14. UI/UX Conformance

### Inspiration UX: six patterns (textual)

Source: [`docs/inspiration/customer-home/README.md`](../inspiration/customer-home/README.md). Reproduce **interaction patterns**, not third-party branding.

### Pattern 1 — Vehicle transmission & fuel (`01-vehicle-transmission-fuel.png`)

After model and year selection, show a **wide car preview photo** with caption `{Make Model · Year}`. Below: **segmented chips** for transmission (Manual | Automatic) and **selectable fuel cards** (Petrol, Diesel, CNG). Selected fuel card gets brand border + checkmark. Primary CTA: "Use this car". Teaches: vehicle context is visual and tactile, not a long form.

**Phase 02:** Vehicle pill on home opens picker in Phase 03; Phase 02 shows pill states "Add your car" vs `{Model} {Year}`.

### Pattern 2 — Brand logo grid (`02-brand-logo-grid.png`)

**"Select Your Vehicle"** screen: search bar + **3-column brand logo grid**. Each tile: logo mark + brand name. Selected: brand border, brand-soft background, checkmark. Teaches: make selection is browse-first, searchable, logo-led.

**Phase 02:** Not implemented end-to-end; home search field is placeholder linking to Phase 03 picker.

### Pattern 3 — Model photo grid (`03-model-photo-grid.png`)

After make: **3-column photo grid** of models with cutout/silhouette, model name, body type subtitle (Sedan, Hatch, SUV). Selected model highlighted. Teaches: model pick is image-led density.

**Phase 02:** Reference only for vehicle pill personalization copy.

### Pattern 4 — Swiggy-style tab density (`04-swiggy-tabs-density.png`)

**Folder-style horizontal tabs** at top (scroll if needed), active tab bold + colored underline, content fills screen without excessive whitespace. Teaches: service modes are **visible tabs**, not drawer/hamburger.

**Phase 02:** Implement as home **mode tabs** — four labels, underline selection, horizontal scroll on narrow devices.

### Pattern 5 — SOS emergency map (`05-sos-emergency-map.png`)

Map-forward layout, live location indicator, **2×2 grid of emergency tiles**, SOS distinguished in tab bar (orange/warning accent). Teaches: emergency is geographically grounded and visually separate from scheduled service.

**Phase 02:** SOS tab body with map placeholder, warning chip "Emergency · not scheduled service", amber primary CTA.

### Pattern 6 — Yellow service home composition (`06-yellow-service-home.png`)

Use **composition**, not yellow brand: address **top-left**, vehicle pill **top-right**, image-led hero, dense service cards, promotion/trust density. CARATOM interprets with **neutral surfaces + tasteful light-blue accents + real automotive imagery**.

**Phase 02:** gs-01 and om-01 follow this layout under light-blue chrome.

### CARATOM mapping summary

| Inspiration | CARATOM Phase 02 |
|-------------|------------------|
| Swiggy 3 tabs → | **4 tabs:** General service · Service + repair · One-man job · SOS |
| Brand/model grids → | Vehicle picker (Phase 03); pill + search stub now |
| Service home → | Chrome + video carousel + package cards + trust strip |
| SOS map → | SOS tab home variant |

---

### Home chrome specification (shared shell)

The chrome is **identical** across gs-01, gpr-01, om-01, sos-01 except active tab styling and scroll background (SOS may use `#FAF9F7` canvas).

### 11.1 Layout structure

```text
┌─────────────────────────────────────────────┐
│  [Status bar — system]                       │
├─────────────────────────────────────────────┤
│  Service at          ┌──────────────────┐   │
│  Koramangala ▾       │ ● Add your car   │   │
│                      └──────────────────┘   │
├─────────────────────────────────────────────┤
│ General service │ Service + repair │ ... │SOS│
│ ═══════════════                              │  ← 2px underline on active
├─────────────────────────────────────────────┤
│  {TAB BODY — §12}                            │
│                                              │
├─────────────────────────────────────────────┤
│  🏠 Home    📋 Orders    👤 Profile          │  ← bottom tab bar 74px
└─────────────────────────────────────────────┘
```

### 11.2 Location block (top-left)

| Element | Spec |
|---------|------|
| Label | "Service at" — 11px, text-muted, weight 500 |
| Value | Locality name e.g. "Koramangala" — 16px, weight 700 |
| Chevron | ▾ after name, 11px muted (indicates tappable) |
| Action | Phase 02: tap opens stub sheet "Address selection in Phase 03"; persist last locality in AsyncStorage |
| Data source | Phase 02: default from seed CMS / hardcoded launch default; Phase 03+: saved address |

### 11.3 Vehicle pill (top-right)

| State | Display |
|-------|---------|
| Empty | Brand dot 8px + "Add your car" |
| Context set | Brand dot + `{Model} {Year}` truncated |
| Action | Tap → Phase 03 vehicle picker route |

Style: white bg, 1px border `#DCE8EF`, radius 999px, padding 8px 12px, 12px semibold, max-width 150px ellipsis, subtle shadow.

### 11.4 Mode tabs

```typescript
const MODE_TABS = [
  { id: 'general', label: 'General service', sos: false },
  { id: 'repair',  label: 'Service + repair', sos: false },  // NOT "Inspect + repair"
  { id: 'oneman',  label: 'One-man job', sos: false },
  { id: 'sos',     label: 'SOS', sos: true },
] as const;
```

| Property | Value |
|----------|-------|
| Container | flex row, horizontal scroll, border-bottom 1px border |
| Tab padding | 10px 12px 12px |
| Inactive | text-muted, transparent bottom border |
| Active (normal) | brand text, 2px bottom border brand |
| Active (SOS) | warning text, 2px bottom border warning |
| Font | 13px weight 600 (700 optional when active) |

**Behavior:** Switching tabs swaps body content **without** navigation stack push. Preserve scroll position per tab in memory if feasible.

### 11.5 Bottom navigation

Three destinations: **Home** (active on this screen), **Orders**, **Profile**. Orders/Profile may be placeholder screens in Phase 02 ("Sign in to view orders" / profile stub) or minimal empty states — must exist for tab bar integrity.

Active tab: brand color icon + label 10px weight 700. Inactive: muted weight 500.

---

### Embedded screen specifications (gs-01, gpr-01, om-01, sos-01)

### 12.1 Screen `gs-01-home` — General service tab

**Walkthrough ID:** `gs-01-home`  
**Mode tab active:** `general`  
**Purpose:** Entry to General Service **without add-ons** path (Phase 03).

#### Header / chrome

- Location: Service at **Koramangala**
- Vehicle pill: **Add your car**
- Active tab: **General service** (brand underline)

#### Body content (top to bottom)

| # | Block | Copy / spec |
|---|-------|-------------|
| 1 | Hero carousel | Video/image 16:9; overlay kicker **"General service · doorstep"**; title **"Full service + health report"**; 3 pagination dots (first active) |
| 2 | Search | Placeholder: **"Search make, model or plate (optional)"** — non-submitting in Phase 02 |
| 3 | Policy note (brand-soft) | **"Estimate before slot · no add-ons · no advisor call"** |
| 4 | Section title | **"General servicing + health report"** |
| 5 | Package card (selected) | Title: **General servicing + health report**; sub: **Usually 1 visit**; price: **From ₹2,999**; brand selected border |
| 6 | Primary CTA | **"Start job card"** → Phase 03 route `/services/general-service` or disabled with toast "Available in Phase 03" if strictly enforcing phase gates |
| 7 | Section title | **"Included in service"** |
| 8 | Included list | Engine oil & filter · Air filter check · Fluid top-up · 30-point health report — each with success **Included** chip |
| 9 | Section title | **"Why CARATOM"** |
| 10 | Trust strip | Horizontal scroll: **Van at your door · Trained techs · Genuine parts · Warranty** |

#### Colors

- Primary actions: `#176B9E` (filled CTAs)
- Policy note: `#EAF6FC` / `#176B9E` (small banner only)
- Price: `text-strong` (not brand)
- Included chips: success-soft / success

#### Data binding (Phase 02)

- Package card, included items, hero, trust from `GET /v1/catalog/home` → `sections.general_service`
- `flow_policy` displayed in dev overlay only — not shown to user

#### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton: hero rect, package card, 4 list rows, trust strip |
| Empty | "Services unavailable in your area" + support link |
| Error | Inline banner + retry per section |
| Offline | Top banner; show cached catalog if TanStack Query persisted |

#### Analytics

`home_viewed`, `tab_changed`, `service_selected` (on CTA tap).

---

### 12.2 Screen `gpr-01-home` — Service + repair tab (home variant)

**Mode tab active:** `repair`  
**Glossary reminder:** This is General Service **with add-ons**, NOT Inspection + Repair.

#### Body differences from gs-01

| Block | Content |
|-------|---------|
| Hero kicker | **"General + repair/replacement"** |
| Hero title | **"Same service. Pick what to fix."** |
| Policy note **warn** | **"Add repairs → callback → accept on app before slot"** |
| Package sub | **"Base package · same as General service tab"** |
| Primary CTA | **"Select repairs / replacements"** → Phase 04 gpr-02 |

Same included list and trust strip as gs-01. Base offering **same slug** as general tab (`general-service-health-report`).

---

### 12.3 Screen `om-01-home` — One-man job tab

**Walkthrough ID:** `om-01-home`  
**Mode tab active:** `oneman`

#### Header / chrome

- Same location and vehicle pill as gs-01
- Active tab: **One-man job**

#### Body content

| # | Block | Copy / spec |
|---|-------|-------------|
| 1 | Hero | Kicker **"One-man job"**; title **"Small fixes · fixed price"** |
| 2 | Policy note | **"Direct book · no advisor for listed jobs"** |
| 3 | Job grid | **2-column grid** of compact cards (NOT full package cards) |

#### One-man grid items (seed-backed)

| Job | Price | Duration |
|-----|-------|----------|
| Bulb / headlight | ₹399 | 30 min |
| Sensor / OBD code | ₹449 | 45 min |
| Wiper blades | ₹349 | 20 min |
| Battery check | ₹299 | 30 min |
| Interior light | ₹399 | 25 min |
| Panel / clip fit | ₹449 | 40 min |

Each card: small icon, name 13px bold, duration muted, price brand 14px bold. Tap → `/services/{slug}` detail stub (Phase 05 books).

#### Colors

Same light-blue accent system; cards white with border, no full-width hero CTA until item selected.

---

### 12.4 Screen `sos-01-home` — SOS tab

**Mode tab active:** `sos`  
**Scroll background:** `#FAF9F7` optional warm tint

#### Body content

| # | Block | Spec |
|---|-------|------|
| 1 | Warning chip | **"Emergency · not scheduled service"** — warning colors |
| 2 | Map block | Upper ~40% height map placeholder (MapLibre Phase 05); pin at Koramangala |
| 3 | Location card | **"Your location"** / **"Koramangala · live GPS"** + **Live** warn chip |
| 4 | Emergency grid 2×2 | Call ops · Flat tyre · Dead battery · Tow |
| 5 | Primary CTA | **"Get help now"** — **warning fill**, not brand |

SOS tab underline: **warning** color when active.

Phase 02: CTA navigates to placeholder or disabled with copy "SOS flow completes in Phase 05".

---

### Customer mobile implementation

### 13.1 Routes (Phase 02)

```text
app/
  (auth)/
    splash.tsx          — session restore → home or phone
    phone.tsx           — enter +91 phone
    otp.tsx             — 6-digit verify
  (customer)/
    (tabs)/
      home.tsx          — §11–§12 implementation
      orders.tsx        — placeholder
      profile.tsx       — placeholder + login CTA if guest
    services/
      [slug].tsx        — minimal detail read-only (optional Phase 02)
```

### 13.2 State management

| State | Store | Persist |
|-------|-------|---------|
| Auth session | Supabase client + SecureStore | yes |
| Active home tab | React state or Zustand `homeUiStore` | optional AsyncStorage |
| Vehicle context draft | Zustand | AsyncStorage (non-sensitive) |
| Catalog | TanStack Query `['catalog','home']` | stale-while-revalidate |

**Never persist:** JWT in AsyncStorage plain text; use SecureStore.

### 13.3 Key components

```text
components/home/
  HomeChrome.tsx         — §11 location, pill, ModeTabs
  GeneralServiceHome.tsx — gs-01 body
  ServiceRepairHome.tsx  — gpr-01 body
  OneManHome.tsx         — om-01 body
  SosHome.tsx            — sos-01 body
  HeroCarousel.tsx
  PolicyNote.tsx
  TrustStrip.tsx
  OneManGrid.tsx
  PackageCard.tsx
```

### 13.4 Tab vs policy enforcement

```typescript
// ✅ CORRECT — tab is UI only
function onSelectOffering(offering: ServiceOfferingDto) {
  router.push(`/services/${offering.slug}`);
  // offering.flow_policy comes from API
}

// ❌ FORBIDDEN
function inferPolicy(activeTab: TabId): FlowPolicy {
  if (activeTab === 'repair') return 'INSPECTION_REPAIR'; // WRONG
}
```

### 13.5 Orders / Profile placeholders

- **Orders:** Empty state: "No orders yet" + browse CTA; if guest, prompt login.
- **Profile:** Guest: phone login CTA; authed: show name + phone from `/v1/me`.

---

## 10. Backend Implementation

### Supabase phone OTP (customer app)

### 14.1 Configuration

- Enable **Phone** provider in Supabase Auth dashboard.
- SMS template: OTP code for India (+91).
- Test phone numbers: configure in Supabase for dev (bypass SMS).

### 14.2 Environment variables (client-safe only)

```text
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon key ONLY
EXPO_PUBLIC_API_BASE_URL=https://api.caratom.example/v1
```

**Never in client:** `SUPABASE_SERVICE_ROLE_KEY`, database URL, Razorpay secret.

### 14.3 Auth flow

```text
1. User enters E.164 phone (+919876543210)
2. supabase.auth.signInWithOtp({ phone })
3. User enters 6-digit OTP
4. supabase.auth.verifyOtp({ phone, token, type: 'sms' })
5. Session stored; access_token sent as Bearer to FastAPI
6. On app launch: supabase.auth.getSession() → refresh if needed
```

### 14.4 UI specification — `login` screen

| Element | Copy |
|---------|------|
| Logo | 72px rounded square CARATOM mark |
| Title | **Doorstep car care** |
| Subtitle | **Genuine parts · trained technicians · warranty** |
| Phone field | Prefill demo +91 98765 43210 in dev |
| Primary | **Send OTP** |
| OTP | 6 boxes auto-advance |
| Verify | **Verify & continue** |

### 14.5 Auth timing (Phase 02 scope)

Phase 02 implements full OTP UI and session. Catalog browse remains **public** (no JWT required). Protected routes (`/v1/me`) require JWT. Phase 03 gates booking finalization on auth per [`02-product-flows.md`](../architecture/02-product-flows.md).

### 14.6 Error handling

| Error | UX |
|-------|-----|
| Invalid phone | Inline field error |
| OTP expired | "Code expired — send again" |
| Rate limited | "Too many attempts — try later" |
| Network | Retry button; preserve phone input |

---

### Backend JWT validation & profiles

### 15.1 Middleware design

```python
# backend/app/core/auth.py — conceptual

async def get_current_user(authorization: str | None) -> AuthUser | None:
    """Parse Bearer JWT, validate via Supabase JWKS, return claims."""
    
async def require_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """401 if missing/invalid."""

async def get_current_user_optional(...) -> AuthUser | None:
    """For endpoints that work guest or authed."""
```

Validation checklist:

- Signature via JWKS (`/.well-known/jwks.json`)
- `iss` matches Supabase project
- `aud` authenticated (if configured)
- `exp` not passed
- `sub` → UUID maps to `profiles.id`

Cache JWKS 1 hour; refresh on kid miss.

### 15.2 Profile upsert on first request

When `require_user` succeeds and no `profiles` row exists:

```sql
INSERT INTO profiles (id, phone, role, created_at, updated_at)
VALUES (:sub, :phone_from_claim, 'customer', now(), now())
ON CONFLICT (id) DO UPDATE SET updated_at = now();
```

Phone from JWT `phone` claim or empty until PATCH.

### 15.3 Profiles module routes

**GET `/v1/me`** — requires auth

```json
{
  "id": "uuid",
  "phone": "+919876543210",
  "full_name": "Rajesh Kumar",
  "role": "customer",
  "phone_verified": true,
  "created_at": "2026-08-29T10:00:00Z"
}
```

**PATCH `/v1/me`** — requires auth

Request:

```json
{ "full_name": "Rajesh Kumar" }
```

Validation: `full_name` 1–120 chars; strip control characters.

### 15.4 Role enforcement stub

Phase 02: all consumer profiles `role = customer`. Middleware exports `require_role('admin')` for future admin routes. Integration test: customer JWT → 403 on `/v1/admin/*` stub.

---

## 11. Database Implementation

### Database migrations

### 16.1 Migration file

`backend/alembic/versions/002_phase02_profiles_catalog.py`

### 16.2 `profiles`

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone         TEXT,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'technician', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);
```

**Note:** `auth.users` in Supabase schema — use Supabase migration or trigger; if API-only access, profiles FK may be application-enforced without DB FK to auth schema — document chosen approach in migration comment.

### 16.3 `service_categories`

```sql
CREATE TABLE service_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 16.4 `service_offerings`

```sql
CREATE TABLE service_offerings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  category_id         UUID REFERENCES service_categories(id),
  name                TEXT NOT NULL,
  short_description   TEXT,
  flow_policy         TEXT NOT NULL
                      CHECK (flow_policy IN (
                        'GENERAL_SERVICE', 'ONE_MAN', 'DIRECT_SPECIAL', 'INSPECTION_REPAIR'
                      )),
  display_price_minor INT,
  currency            TEXT NOT NULL DEFAULT 'INR',
  duration_minutes    INT,
  sort_order          INT NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  hero_media_url      TEXT,
  icon_key            TEXT,
  dev_fixture         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offerings_policy ON service_offerings(flow_policy) WHERE is_active;
CREATE INDEX idx_offerings_category ON service_offerings(category_id) WHERE is_active;
```

### 16.5 `included_service_items`

```sql
CREATE TABLE included_service_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id     UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true
);
```

### 16.6 `pricing_policies`

```sql
CREATE TABLE pricing_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  base_price_minor INT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  tax_rate_bps    INT NOT NULL DEFAULT 1800,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true
);
```

Link offering → policy via `service_offerings.pricing_policy_id` (add column FK) or join table if multiple — Phase 02: single FK column acceptable.

### 16.7 `service_area_rules`

```sql
CREATE TABLE service_area_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  locality        TEXT,
  postal_prefixes TEXT[],
  geo_bbox        JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  launch_phase    TEXT DEFAULT 'koramangala-mvp'
);
```

### 16.8 `cms_blocks`

```sql
CREATE TABLE cms_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key       TEXT NOT NULL,
  locale          TEXT NOT NULL DEFAULT 'en-IN',
  payload         JSONB NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(block_key, locale)
);
```

Example keys: `home.hero.general`, `home.trust_strip`, `home.promo_banner`.

### 16.9 `feature_settings`

```sql
CREATE TABLE feature_settings (
  key             TEXT PRIMARY KEY,
  value           JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Example: `{ "default_service_area_slug": "koramangala-bengaluru" }`.

### 16.10 RLS policy (Supabase)

- **Deny** direct PostgREST client writes to all business tables.
- Service role used by FastAPI only.
- Optionally enable RLS with no policies for anon/authenticated — forces API path.

---

## 12. API Contracts

### Catalog read API

### 17.1 `GET /v1/catalog/home`

**Auth:** optional (personalization later if JWT present)  
**Query params:** `service_area_slug` (default from feature_settings), `locale` (default `en-IN`)

**Response 200:**

```json
{
  "service_area": {
    "slug": "koramangala-bengaluru",
    "name": "Koramangala, Bengaluru",
    "serviceable": true
  },
  "hero": {
    "blocks": [
      {
        "tab": "general",
        "kicker": "General service · doorstep",
        "title": "Full service + health report",
        "media_url": "https://cdn.caratom.example/hero/general.mp4",
        "media_type": "video"
      },
      {
        "tab": "repair",
        "kicker": "General + repair/replacement",
        "title": "Same service. Pick what to fix.",
        "media_url": "https://cdn.caratom.example/hero/repair.mp4",
        "media_type": "video"
      },
      {
        "tab": "oneman",
        "kicker": "One-man job",
        "title": "Small fixes · fixed price",
        "media_url": "https://cdn.caratom.example/hero/oneman.mp4",
        "media_type": "video"
      }
    ]
  },
  "sections": {
    "general_service": {
      "offering": {
        "slug": "general-service-health-report",
        "name": "General servicing + health report",
        "flow_policy": "GENERAL_SERVICE",
        "display_price": { "amount_minor": 299900, "currency": "INR", "label": "From ₹2,999" },
        "duration_minutes": 120,
        "included_items": [
          "Engine oil & filter",
          "Air filter check",
          "Fluid top-up",
          "30-point health report"
        ],
        "policy_note": "Estimate before slot · no add-ons · no advisor call"
      }
    },
    "service_repair_entry": {
      "offering_slug": "general-service-health-report",
      "policy_note_warn": "Add repairs → callback → accept on app before slot",
      "cta_label": "Select repairs / replacements"
    },
    "one_man_jobs": [
      {
        "slug": "bulb-headlight",
        "name": "Bulb / headlight",
        "flow_policy": "ONE_MAN",
        "display_price": { "amount_minor": 39900, "currency": "INR" },
        "duration_minutes": 30,
        "icon_key": "bulb"
      }
    ],
    "sos": {
      "headline": "Emergency · not scheduled service",
      "tiles": [
        { "id": "call_ops", "label": "Call ops" },
        { "id": "flat_tyre", "label": "Flat tyre" },
        { "id": "dead_battery", "label": "Dead battery" },
        { "id": "tow", "label": "Tow" }
      ]
    }
  },
  "trust_strip": [
    { "icon_key": "van", "label": "Van at your door" },
    { "icon_key": "techs", "label": "Trained techs" },
    { "icon_key": "parts", "label": "Genuine parts" },
    { "icon_key": "warranty", "label": "Warranty" }
  ],
  "search_placeholder": "Search make, model or plate (optional)"
}
```

**Internal fields never returned:** cost_minor, margin, supplier_ids.

### 17.2 `GET /v1/services`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `flow_policy` | enum | Filter by policy |
| `category_slug` | string | Filter category |
| `page` | int | default 1 |
| `page_size` | int | default 20, max 50 |

**Response:**

```json
{
  "items": [
    {
      "slug": "general-service-health-report",
      "name": "General servicing + health report",
      "flow_policy": "GENERAL_SERVICE",
      "display_price": { "amount_minor": 299900, "currency": "INR" },
      "duration_minutes": 120,
      "short_description": "Doorstep general service with health report"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 7
}
```

### 17.3 `GET /v1/services/{slug}`

Returns full detail for service detail screen (Phase 03):

```json
{
  "slug": "general-service-health-report",
  "name": "General servicing + health report",
  "flow_policy": "GENERAL_SERVICE",
  "display_price": { "amount_minor": 299900, "currency": "INR" },
  "duration_minutes": 120,
  "included_items": [...],
  "disclosures": ["Price may vary by vehicle age and parts required."],
  "media": [{ "url": "...", "type": "image" }],
  "is_active": true
}
```

**404** if slug inactive or missing.

### 17.4 Handler implementation notes

- Read-only queries in `CatalogQueryService`; no writes in Phase 02.
- Filter `is_active = true` on all public reads.
- Cache home payload 60s in Redis optional — not required Phase 02.
- Generate OpenAPI schemas from Pydantic models; export to contracts package.

---

### Seed data: Bengaluru / Koramangala launch

### 18.1 Service area

```yaml
slug: koramangala-bengaluru
name: Koramangala, Bengaluru
city: Bengaluru
locality: Koramangala
postal_prefixes: ["560034", "560035", "560047"]
launch_phase: koramangala-mvp
```

### 18.2 General service offering

```yaml
slug: general-service-health-report
name: General servicing + health report
flow_policy: GENERAL_SERVICE
display_price_minor: 299900
duration_minutes: 120
included_items:
  - Engine oil & filter
  - Air filter check
  - Fluid top-up
  - 30-point health report
pricing_policy_slug: general-service-koramangala-2026
dev_fixture: true
```

### 18.3 One-man jobs (all `flow_policy: ONE_MAN`)

| slug | name | price_minor | duration |
|------|------|-------------|----------|
| bulb-headlight | Bulb / headlight | 39900 | 30 |
| sensor-obd | Sensor / OBD code | 44900 | 45 |
| wiper-blades | Wiper blades | 34900 | 20 |
| battery-check | Battery check | 29900 | 30 |
| interior-light | Interior light | 39900 | 25 |
| panel-clip-fit | Panel / clip fit | 44900 | 40 |

### 18.4 Repair add-ons (seed for Phase 04 list; include in DB now)

| slug | name | price_minor |
|------|------|-------------|
| ac-gas-refill | AC gas refill | 120000 |
| brake-pads-pair | Brake pads (pair) | 180000 |
| ac-condenser-oem | AC condenser OEM | 420000 |
| bumper-repaint | Bumper repaint | 250000 |
| cabin-filter | Cabin filter | 65000 |
| headlight-assembly | Headlight assembly | 140000 |

Store in `repair_offerings` if table created in Phase 02, else defer to Phase 04 migration — **prefer creating stub `repair_offerings` table now** for seed completeness per [`08-data-model.md`](../architecture/08-data-model.md).

### 18.5 CMS blocks

Seed hero payloads for tabs general/repair/oneman, trust strip labels, default locality display name **Koramangala**.

### 18.6 Vehicle brands (reference data — optional Phase 02)

For search/picker Phase 03: Maruti, Hyundai, Honda, Tata, Mahindra, Toyota, Kia, Skoda, Volkswagen — may live in separate `vehicle_makes` seed in Phase 03.

### 18.7 Seed execution

```bash
cd backend
python -m scripts.seed_catalog_koramangala --env development
```

Idempotent: use upsert on slug. Mark all rows `dev_fixture = true`.

### 18.8 Admin web: read-only catalog (optional minimal)

Allow ops to verify seeded catalog without SQL. **Optional** — Phase 02 Exit Gate does not require admin if customer home + API tests pass.

- **Route:** `apps/admin/app/(ops)/catalog/page.tsx`
- **UI:** Simple read-only table — slug, name, flow_policy, price (₹), duration, is_active; sections for General service, One-man jobs, Repair add-ons.
- **Data source:** Prefer `GET /v1/catalog/home` + `GET /v1/services` via Next.js RSC; auth may be stubbed until Phase 09.

---

## 19. Vibe Coding Principles Audit (table)

### Vibe Coding principles (load at phase exit)

Per [`docs/implementation/README.md`](./README.md), load from [`Vibe code principles/`](../../Vibe%20code%20principles/) before completing Exit Gate §26.

| File | Phase 02 application |
|------|---------------------|
| [`QUICKSTART.md`](../../Vibe%20code%20principles/QUICKSTART.md) | Agent entry checklist before first commit |
| [`GREENFIELD-PLAYBOOK.md`](../../Vibe%20code%20principles/GREENFIELD-PLAYBOOK.md) | Stage 3–5: auth, secrets, dependency scan |
| [`VIBE-CODING-ARTICLE.md`](../../Vibe%20code%20principles/VIBE-CODING-ARTICLE.md) | Review AI-generated auth middleware and home UI |
| [`AUDIT-PLAYBOOK.md`](../../Vibe%20code%20principles/AUDIT-PLAYBOOK.md) | Evidence-based pass/fail for §24–§26 audits |
| [`CONTROLS-CATALOG-1.md`](../../Vibe%20code%20principles/CONTROLS-CATALOG-1.md) | Map AUTH-JWT, AUTH-SECRET controls to §24 |
| [`LEGAL-APPLICABILITY.md`](../../Vibe%20code%20principles/LEGAL-APPLICABILITY.md) | India phone OTP / consumer data awareness (full compliance Phase 12) |

**Missing from repo** (use substitutes noted in README): `CONSTITUTION.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md`, `SCORING-AND-GATES.md`. Phase 02 audits reference present files only.

**Phase 02 vibe guardrails:**

1. Do not hardcode catalog JSON in the customer app — always fetch from API.
2. Do not expand scope into job cards, booking, or payments.
3. Centralize design tokens; reject scattered magic colors (especially doc-10 blue).
4. Verify tab/policy separation with an automated test, not assumption.
5. Run secret scan before marking phase complete.

---

### Shared contracts & OpenAPI

### 20.1 Pydantic models (backend)

```text
backend/app/modules/catalog/schemas.py
backend/app/modules/profiles/schemas.py
```

### 20.2 TypeScript contracts

```text
packages/contracts/src/
  catalog.ts      — CatalogHomeResponse, ServiceOfferingSummary, MoneyDto
  profile.ts      — ProfileResponse, ProfilePatchRequest
  common.ts       — FlowPolicy enum, ProblemDetails
```

### 20.3 FlowPolicy enum (shared)

```typescript
export type FlowPolicy =
  | 'GENERAL_SERVICE'
  | 'ONE_MAN'
  | 'DIRECT_SPECIAL'
  | 'INSPECTION_REPAIR';
```

### 20.4 Money DTO

```typescript
export interface MoneyDto {
  amount_minor: number;
  currency: 'INR';
  label?: string; // "From ₹2,999" — server-formatted display optional
}
```

### 20.5 Codegen workflow

1. FastAPI exposes `/openapi.json`
2. Script generates or hand-syncs `packages/contracts`
3. CI check: contracts drift fails build (optional Phase 02; required Phase 03)

---

## 15. Security

### Security requirements

Per [`14-security.md`](../architecture/14-security.md).

### 21.1 Authentication

- Supabase Auth phone OTP only; no custom password table.
- FastAPI validates JWT via JWKS; no trust of client-sent `user_id`.

### 21.2 Secrets

| Secret | Location |
|--------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Railway backend only |
| `DATABASE_URL` | Railway backend only |
| `SUPABASE_JWT_SECRET` | Not used if JWKS validation |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client OK |

Scan repo with gitleaks; `.env` gitignored.

### 21.3 Authorization Phase 02

- `/v1/me` PATCH: only own profile (`sub` match).
- Catalog endpoints: public read.
- No admin/technician routes exposed without role check.

### 21.4 Input validation

- Pydantic models on all requests/responses.
- PATCH profile: length limits, no HTML injection in names.

### 21.5 Rate limiting

- OTP endpoints: Supabase built-in + consider backend rate limit on `/v1/me` abuse.
- Catalog: 60 req/min/IP optional.

### 21.6 CORS

- Allow customer app origin and admin web origin only.
- No `*` in production.

### 21.7 Logging

- Do not log full JWT or OTP.
- Log `request_id`, `sub` hash optional.

---

## 16. Testing Strategy

### Testing strategy

Per [`15-testing-strategy.md`](../architecture/15-testing-strategy.md), Phase 02 minimum:

### 22.1 Backend unit tests

- JWT validation: valid, expired, malformed signature.
- Profile upsert idempotency.
- Catalog query: inactive offerings excluded.
- Money formatting helper.

### 22.2 Backend integration tests

```text
tests/test_auth_profiles.py
  - GET /v1/me without token → 401
  - GET /v1/me with valid test JWT → 200 + profile created
  - PATCH /v1/me updates full_name

tests/test_catalog.py
  - GET /v1/catalog/home → 200 + general offering present
  - GET /v1/services?flow_policy=ONE_MAN → 6 items
  - GET /v1/services/invalid-slug → 404
```

Use test JWT from Supabase test helper or mock JWKS in CI.

### 22.3 Customer mobile tests (RTL)

- Home renders 4 tabs.
- Switching tabs shows different policy notes.
- gs-01 package card displays price from mocked API.
- SOS tab uses warning color on active tab (snapshot or style assert).

### 22.4 Contract tests

- Validate response JSON against Zod schemas in `packages/contracts`.

### 22.5 Manual acceptance

See §23 verification checklist integrated in Exit Gate.

---

## 17. Verification Procedure

### Verification commands & manual checklist

### 23.1 Backend

```bash
cd backend

# Migrations
alembic upgrade head

# Seed
python -m scripts.seed_catalog_koramangala

# Tests
pytest tests/test_auth_profiles.py tests/test_catalog.py -v

# Catalog home
curl -s http://localhost:8000/v1/catalog/home | jq '.sections.general_service.offering.slug'
# Expected: "general-service-health-report"

# Services filter
curl -s "http://localhost:8000/v1/services?flow_policy=ONE_MAN" | jq '.total'
# Expected: 6

# Auth (replace TOKEN)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/v1/me | jq '.role'
# Expected: "customer"
```

### 23.2 Customer app

```bash
cd apps/customer
pnpm test -- --testPathPattern=home
npx expo start
```

Manual:

- [ ] Launch app → home loads with Koramangala locality
- [ ] All 4 tabs switch content
- [ ] General tab shows ₹2,999 and 4 included items
- [ ] One-man tab shows 6 jobs in 2-column grid
- [ ] SOS tab shows warning chip and amber CTA
- [ ] Phone OTP login completes
- [ ] Profile tab shows name after PATCH
- [ ] Light-blue accent visible on buttons/tabs (not a page-wide tint)

### 23.3 Admin optional

```bash
cd apps/admin
pnpm dev
# Open /catalog — table lists offerings
```

### 23.4 CI

```bash
# From repo root
pnpm lint && pnpm typecheck
cd backend && pytest
```

---

## 18. Full Codebase Audit

### Audit A: Security

Reference: [`14-security.md`](../architecture/14-security.md), [`CONTROLS-CATALOG-1.md`](../../Vibe%20code%20principles/CONTROLS-CATALOG-1.md).

| Control | Pass criteria | Evidence |
|---------|---------------|----------|
| AUTH-JWT-001 | FastAPI rejects tampered/expired JWT | integration test output |
| AUTH-SECRET-001 | No service role key in `apps/customer` or git history | grep + gitleaks |
| AUTHZ-001 | User cannot PATCH another user's profile | test with two tokens |
| API-VAL-001 | PATCH /v1/me validates input | pydantic test |
| DATA-RLS-001 | Anon client cannot write catalog via PostgREST | Supabase policy screenshot or doc |
| LOG-RED-001 | OTP/JWT not in application logs | log sample review |

**Fail any row → Phase 02 not complete.**

---

### Audit B: Vibe Coding (see also §19)

Reference: [`Vibe code principles/QUICKSTART.md`](../../Vibe%20code%20principles/QUICKSTART.md), [`GREENFIELD-PLAYBOOK.md`](../../Vibe%20code%20principles/GREENFIELD-PLAYBOOK.md), [`VIBE-CODING-ARTICLE.md`](../../Vibe%20code%20principles/VIBE-CODING-ARTICLE.md).

| Check | Pass criteria |
|-------|---------------|
| VIBE-01 | No hardcoded catalog offerings in customer UI — API driven |
| VIBE-02 | Tokens centralized; no magic hex scattered in components |
| VIBE-03 | AI-generated code reviewed; tab/policy separation tested |
| VIBE-04 | Scope minimal — no job card/booking implemented early |
| VIBE-05 | Conventional file layout matches Phase 01 monorepo |
| VIBE-06 | No secrets committed; `.env.example` updated |

---

## 20. Architecture Conformance Audit

### Architecture alignment

| Rule | Source | Verification |
|------|--------|--------------|
| Tab ≠ flow_policy | AUDIT-REPORT, §02 | unit test + code search: no `inferPolicy(activeTab)` |
| Service + repair ≠ Inspection + Repair | Glossary §4 | UI labels inspection; grep "Inspect + repair" forbidden in tabs |
| Server-authoritative catalog prices | Constitution | prices from API only |
| UTC timestamps in DB | 08-data-model | migration review |
| OpenAPI matches contracts | 09-api-contracts | schema diff |
| Light-blue accent matches doc 10 | AUDIT-REPORT | visual review: blue on actions/tabs/borders/links only |

## 21. Walkthrough Conformance Audit

### Walkthrough / regression fidelity

Compare running app to [`CARATOM-client-walkthrough.html`](../CARATOM-client-walkthrough.html):

| Screen | Checklist |
|--------|-----------|
| Chrome | Service at / Koramangala; vehicle pill; 4 tabs |
| gs-01 | Hero copy, policy note, package card, included list, trust strip |
| gpr-01 | Warn policy note; CTA "Select repairs / replacements" |
| om-01 | 2-col grid, 6 jobs, policy note direct book |
| sos-01 | Emergency chip, map area, 2×2 tiles, amber CTA |
| Colors | `#5DB7E8` accent / `#176B9E` CTAs; SOS warning; canvas cool near-white |

Screenshot diff optional; human sign-off acceptable.

## 22. Regression Audit

Re-run Phase 01 verification: all four app shells launch, `/health` returns 200, CI green. Phase 02 must not break monorepo scripts or env wiring from Phase 01.

---

## 23. Technical Debt Review

| Item | Accept in Phase 02? | Paydown phase |
|------|---------------------|---------------|
| Optional admin catalog read-only | Yes if timeboxed | 09 |
| Analytics events stub only | Yes | 11 |
| No push notifications | Yes | 11 |
| Guest browse without full profile | Yes | 03 (finalization requires profile) |

---

## 24. Phase Exit Gate

### Phase 02 Exit Gate (required to start Phase 03)

All must pass:

1. **Identity:** OTP login works on device/simulator; `GET /v1/me` returns profile.
2. **Catalog API:** Home and services endpoints return seeded Koramangala data.
3. **Customer home:** Four tabs functional; content from API; light-blue accent tokens applied tastefully.
4. **Glossary compliance:** No "Inspect + repair" tab label; Service + repair copy correct.
5. **Security audit (§24):** All controls pass.
6. **Vibe audit (§25):** All checks pass.
7. **Architecture audit (§26.1):** All rules verified.
8. **Walkthrough audit (§26.2):** gs-01, om-01, chrome signed off.
9. **Tests:** Backend integration + home RTL tests green in CI.
10. **No secrets in client** verified.

Optional admin catalog: if skipped, document in PR notes.

## 26. Cursor Execution Instructions

### Cursor agent execution instructions

When executing Phase 02 in Cursor:

1. **Read** this document end-to-end and [`docs/implementation/README.md`](./README.md).
2. **Confirm** Phase 01 Exit Gate — if failing, stop and complete Phase 01.
3. **Create branch** `phase-02/identity-design-catalog` (or project convention).
4. **Implement in order** per §8 waves; commit logically per wave.
5. **Use light-blue tokens** from §9 / doc 10 — selective accent, not a page-wide tint.
6. **Never infer `flow_policy` from tab id** — see §13.4.
7. **Repeat glossary** in PR description: Service + repair = add-ons, not Phase 07.
8. **Run** verification commands §23 before audits.
9. **Complete** audit checklists §24–§26; fix failures.
10. **Do not proceed** to Phase 03 until Exit Gate §26.3 is explicitly signed off.

### 26.5 Suggested PR title

```text
feat(phase-02): identity, light-blue design tokens, catalog home + Koramangala seed
```

## 25. Outputs Passed to Next Phase

### Handoff to Phase 03

Phase 03 consumes:

- Authenticated users and profile PATCH
- `/v1/services/{slug}` detail
- Home CTA "Start job card" wired to job card creation
- Vehicle picker routes from search/pill
- Design tokens and home components reused

---

## 7. Repository Changes

See Appendix A — File manifest for directories and modules touched in Phase 02.

---

## 13. Complete Data Flow

```text
Guest opens customer app
  → GET /v1/catalog/home (no auth required for browse)
  → User taps Login → Supabase OTP → JWT stored
  → GET /v1/me → profiles row created/updated
  → Home tabs render offerings from catalog API
  → User selects offering → GET /v1/services/{slug}
  → CTA "Start job card" (wired in Phase 03) receives offering slug + flow_policy from server
```

No job cards, estimates, or bookings are created in Phase 02.

---

## Appendix A — File manifest

```text
backend/alembic/versions/002_phase02_profiles_catalog.py
backend/app/core/auth.py
backend/app/core/deps.py
backend/app/modules/profiles/router.py
backend/app/modules/profiles/service.py
backend/app/modules/profiles/schemas.py
backend/app/modules/catalog/router.py
backend/app/modules/catalog/service.py
backend/app/modules/catalog/schemas.py
backend/scripts/seed_catalog_koramangala.py
backend/tests/test_auth_profiles.py
backend/tests/test_catalog.py

apps/customer/app/(auth)/phone.tsx
apps/customer/app/(auth)/otp.tsx
apps/customer/app/(customer)/(tabs)/home.tsx
apps/customer/src/components/home/*
apps/customer/src/providers/AuthProvider.tsx
apps/customer/src/theme/tokens.ts

packages/contracts/src/catalog.ts
packages/contracts/src/profile.ts
packages/ui-tokens/src/colors.ts

apps/admin/app/(ops)/catalog/page.tsx          # optional
```

---

## Appendix B — Analytics events (stub)

| Event | Properties |
|-------|------------|
| `home_viewed` | service_area_slug, auth_state |
| `tab_changed` | tab_id (general/repair/oneman/sos) |
| `service_selected` | offering_slug, flow_policy, source_tab |
| `auth_otp_sent` | — |
| `auth_otp_verified` | success boolean |

---

## Appendix C — Resolved contradictions (Phase 02)

| Topic | Winning rule |
|-------|--------------|
| Brand color | Light-blue accent `#5DB7E8` / `#176B9E` (doc 10); used tastefully |
| Home tabs | 4 mode tabs; UX only |
| Service + repair | General Service + add-ons; NOT Inspection + Repair |
| Accent usage | Blue on primary actions, active tabs, selected borders, vehicle pills, links — not page-wide |
| Catalog source | Server API; no client hardcoding |

---

*End of PHASE-02-identity-design-catalog.md*
