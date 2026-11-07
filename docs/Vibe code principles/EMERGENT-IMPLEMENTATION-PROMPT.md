# EMERGENT IMPLEMENTATION PROMPT — CARATOM Customer App

**Copy this entire document into Emergent. Emergent has NO access to any repository, HTML prototype, or image files. Everything required to build is contained below.**

---

## 1. MISSION

Build the **CARATOM customer mobile app** and a **shared backend** for a doorstep automotive-service company in India (Bengaluru launch area: Koramangala as sample locality).

**What Emergent builds now:**
- Customer Expo app (iOS + Android, single codebase)
- FastAPI backend + database schema + seed data
- Shared API contracts package consumed by the customer app

**What Emergent does NOT build now (but must architect for plug-and-play later):**
- Technician mobile app
- Admin mobile app
- Admin web dashboard

The backend, auth roles, and API must be complete enough that technician and admin clients can be added later **without rewriting domain logic**—only new UI surfaces calling existing `/v1/technician/*` and `/v1/admin/*` routes.

**Success criteria:**
- Customer completes all four booking journeys below on iOS and Android (Expo Go for dev)
- All prices, slot availability, flow branching, and booking confirmation are **server-authoritative**
- Backend enforces `customer` / `technician` / `admin` roles even though only customer UI exists
- Public release path: App Store + Google Play (customer app only)

**You are NOT building:** a marketplace, workshop ERP, microservices, or letting the mobile app write job/financial data directly to the database bypassing the API.

---

## 2. PRODUCT OVERVIEW

CARATOM lets car owners book doorstep servicing and repairs. A van comes to their address. The customer:

1. Picks a service mode from the home screen
2. Optionally describes what's wrong with the car
3. Gets a server-calculated estimate (and sometimes a sales-advisor phone call)
4. Enters contact/address details and picks a time slot
5. Tracks the booking and pays after service

**Four customer journeys (all must work end-to-end):**

| Journey | Home tab | Advisor call? | Key steps |
|---------|----------|---------------|-----------|
| **General service** | General service | No | Vehicle picker → job card → estimate → accept → details → slot → confirmed |
| **Service + repair** | Service + repair | Yes (phone) | Repairs cart → vehicle picker → job card → estimate → callback → accept/deny on app → slot → confirmed |
| **One-man job** | One-man job | No | Job grid → job detail → vehicle → details → slot → confirmed |
| **SOS** | SOS | Ops calls you | Emergency map → pick issue → calling → help dispatched |

**Critical naming rule:** The tab **"Service + repair"** means General Service **with optional repair add-ons** and an advisor callback. It is **NOT** the same as "Inspection + Repair" (a separate two-visit product for uncertain work—that is out of scope for this build).

---

## 3. VISUAL & UX STYLE REFERENCE

Emergent cannot see inspiration screenshots. Follow this written style guide exactly. It combines CARATOM's intended production design with the approved phone prototype aesthetic.

### 3.1 Design character

- **Feel:** Bright, calm, practical, premium, automotive, trustworthy—not a generic SaaS app
- **Density:** Consumer-app dense (think Swiggy-style information density on home), not sparse enterprise UI
- **Surfaces:** Mostly white and warm neutral backgrounds; real automotive photography carries visual richness
- **NOT allowed:** excessive gradients, glassmorphism, blur effects, floating decorative cards, emoji icons, giant hero typography, fake dashboard widgets, generic AI car illustrations

### 3.2 Inspiration references (what each teaches—reproduce the pattern, not another company's branding)

**Reference A — Service home layout (like a food-delivery home, but for car care):**
- Service location address pinned **top-left** ("Service at" label + locality name, tappable)
- Selected vehicle shown as a **pill top-right** ("Add your car" when empty)
- **Folder-style horizontal tabs** below chrome for service modes (not hidden hamburger menu)
- Image-led **video/photo hero carousel** below tabs
- Service package cards with price, duration, and one clear CTA
- Horizontal **trust strip** (van photo, trained techs, genuine parts, warranty)
- Persistent **bottom navigation** (Home, Orders, Profile)

**Reference B — Brand logo grid (vehicle make selection):**
- Title: "Select make" or "Select Your Vehicle"
- Search bar at top
- **3-column grid** of brand tiles: logo mark + brand name (Maruti, Hyundai, Honda, Tata, etc.)
- Selected tile: green border + soft green background + checkmark
- Tappable tiles, not dropdown

**Reference C — Model photo grid:**
- After selecting make, show **3-column photo grid** of car models/silhouettes
- Each tile: car cutout image + model name + body type subtitle (Sedan, Hatch, SUV)
- Selected model gets border + checkmark

**Reference D — Fuel & transmission (after year selection):**
- Large **car preview photo** spanning width
- Caption under photo: "Honda City · 2019"
- **Segmented chips** for transmission: Manual | Automatic
- **Selectable fuel cards**: Petrol, Diesel, CNG (Petrol selected by default in demo)
- Primary button: "Use this car"

**Reference E — Swiggy-style tab density:**
- Mode tabs scroll horizontally if needed
- Active tab: bold text + colored underline (green for normal tabs, **orange/amber for SOS tab**)
- Home content fills screen without excessive whitespace

**Reference F — SOS emergency screen:**
- Map occupies upper portion of screen
- Live location indicator
- Grid of emergency help tiles (flat tyre, dead battery, tow, call ops)
- Orange/amber accent for SOS CTAs (not brand)
- Clearly labeled "Emergency · not scheduled service"

### 3.3 Color tokens (use these exact values)

```text
/* Accent brand — tasteful light blue, not a page-wide tint */
brand              #5DB7E8   active tabs, selected borders, links, icons
brand-strong       #176B9E   filled primary CTAs, pressed, high-contrast on brand-soft
brand-soft         #EAF6FC   small selected fills and policy-note backgrounds only

/* Surfaces */
canvas             #F7FAFC   page background (cool near-white)
surface            #FFFFFF   cards, inputs, bottom nav
border             #DCE8EF   structural dividers

/* Text */
text-strong        #142532   headings, prices
text-body          #243744   body
text-muted         #6A7B86   secondary descriptions, labels

/* Semantic (never brand) */
success            #2D8A61   "Included" chips, confirmed states
success-soft       #E9F6EF   success backgrounds
warning            #B56A22   SOS accent, callback-in-progress, caution banners
danger             #C64242   destructive actions, errors, SOS urgency

/* Selection highlight */
selection-bg       #EAF6FC   selected slot, selected year cell (small regions)
```

**Note:** Light blue is a **selective accent** (primary actions, active tabs, selected borders, vehicle pills, links). Surfaces stay white or near-white. Do not wash the app in blue. Green/amber/red are semantic only.

### 3.4 Typography

- **Font:** DM Sans (load via Google Fonts or `@expo-google-fonts/dm-sans`); fallback System/Segoe UI
- **Scale:**
  - Screen titles (nav bar): 17px, weight 700
  - Section titles: 16px, weight 700
  - Hero title on home: 18–26px, weight 700
  - Body: 15px, weight 400–600
  - Captions/labels: 11–13px, weight 500–600, muted color
  - Prices: 15–18px, weight 700, text-strong (not brand)
- Sentence case everywhere. No ALL CAPS body text.

### 3.5 Spacing & geometry

- Base unit: 4px
- Page horizontal padding: 16px
- Section vertical rhythm: 14–18px between sections, 24px before major sections
- Touch targets: minimum 44×44pt
- Border radius: controls 10px, cards 14px, bottom sheets 18–20px, pills 999px
- Borders: 1px solid `#DCE8EF`; selected state 1.5px solid `#5DB7E8`
- Shadow: very subtle only on bottom nav and sheets—`0 1px 2px rgba(26,26,26,0.04)`. Do not shadow every card.

### 3.6 Core components

| Component | Spec |
|-----------|------|
| **Primary button** | Full width, `#176B9E` fill, white text, 14px vertical padding, 12px radius, concise verb label |
| **Secondary button** | `#EAF6FC` fill, `#176B9E` text, or white with border |
| **Ghost/destructive** | White with red border/text for cancel/logout |
| **Policy note** | Rounded banner, `#EAF6FC` bg + `#176B9E` text; warn variant uses warning-soft + warning |
| **Chip (status)** | Pill, small: ok=success-soft, warn=amber soft, neutral=gray |
| **Flow progress rail** | Horizontal numbered dots (1–N) connected by lines; current=brand-strong filled, done=brand-soft, upcoming=gray |
| **Segmented control** | Make/Model/Year/Fuel step indicator; active segment white on gray track |
| **List row** | White card group, rows separated by 1px border, chevron right for navigation |
| **Bottom tab bar** | 74px height, Home / Orders / Profile; active tab brand icon + label |
| **Search field** | White, bordered, 12px radius, placeholder muted |
| **Vehicle pill** | White, bordered, rounded full, small brand dot + truncated text |

### 3.7 States (required on every data screen)

- **Loading:** Section skeletons preserving layout; never flash wrong prices
- **Empty:** Explain why empty + one action (e.g. "Browse services")
- **Error:** Inline message + retry; preserve user's form input
- **Offline:** Banner at top; allow local draft edits; block booking/payment with explanation
- **Success:** Confirmation screen with checkmark icon (48px green circle)

### 3.8 Sample catalog content (use in UI and seed data)

**General service package:**
- Name: "General servicing + health report"
- Price: From ₹2,999
- Duration: Usually 1 visit (~2 hr on site)
- Included items: Engine oil & filter · Air filter check · Fluid top-up · 30-point health report

**One-man jobs (grid):**
| Job | Price | Duration |
|-----|-------|----------|
| Bulb / headlight | ₹399 | 30 min |
| Sensor / OBD code | ₹449 | 45 min |
| Wiper blades | ₹349 | 20 min |
| Battery check | ₹299 | 30 min |
| Interior light | ₹399 | 25 min |
| Panel / clip fit | ₹449 | 40 min |

**Repair add-ons (Service + repair cart):**
| Repair | Price |
|--------|-------|
| AC gas refill | ₹1,200 |
| Brake pads (pair) | ₹1,800 |
| AC condenser OEM | ₹4,200 |
| Bumper repaint | ₹2,500 |
| Cabin filter | ₹650 |
| Headlight assembly | ₹1,400 |

**Vehicle brands (make grid):** Maruti, Hyundai, Honda, Tata, Mahindra, Toyota, Kia, Skoda, Volkswagen

**Honda models (demo):** Amaze, City, Jazz, WR-V, Elevate, Civic

**Trust strip items:** Van at your door · Trained techs · Genuine parts · Warranty

**Sample user (demo):** Rajesh Kumar · +91 98765 43210 · Koramangala 5th Block, Bengaluru

---

## 4. CUSTOMER APP — NAVIGATION STRUCTURE

### Bottom tabs (always visible except full-screen modals)
- **Home** — service discovery and booking flows
- **Orders** — active and completed bookings
- **Profile** — account, addresses, logout

### Home mode tabs (top of Home screen only)
1. **General service** — base package, no add-ons, no advisor
2. **Service + repair** — same base + optional repair add-ons + advisor callback
3. **One-man job** — fixed-price small jobs grid
4. **SOS** — emergency (orange accent, not green)

### Flow coordinators (implement as pure TypeScript modules)

Do NOT hardcode navigation in individual screens. Each journey has a coordinator that reads server `FlowDecision.allowed_actions[]` and returns the next route.

```text
generalServiceCoordinator
generalRepairCoordinator
oneManCoordinator
sosCoordinator
```

---

## 5. CUSTOMER SCREENS — COMPLETE SPEC

Each screen lists: **ID**, **title**, **layout**, **copy**, **actions**, **API**, **states**.

### 5.1 Auth — `login`

**Layout:** Logo (72px rounded square) · Title "Doorstep car care" · subtitle "Genuine parts · trained technicians · warranty" · Phone field · "Send OTP" · 6-digit OTP boxes · "Verify & continue"

**Behavior:** Supabase phone OTP. Auth required before booking finalization, advisor callback, orders history, payment. Guest may browse home and start job card locally before OTP.

**API:** Supabase Auth SDK (not custom OTP endpoint)

---

### 5.2 GENERAL SERVICE FLOW (10 screens)

**Sequence:** gs-01 → gs-02 → gs-03 → gs-04 → gs-05 → gs-06 → gs-07 → gs-08 → gs-09 → gs-10

#### `gs-01-home`
- **Mode tab active:** General service
- **Chrome:** Service at "Koramangala" · vehicle pill "Add your car"
- **Hero:** Video/image carousel, overlay text "General service · doorstep" / "Full service + health report", pagination dots
- **Search:** "Search make, model or plate (optional)"
- **Policy note (brand-soft):** "Estimate before slot · no add-ons · no advisor call"
- **Package card (selected):** General servicing + health report · Usually 1 visit · From ₹2,999
- **CTA:** "Start job card"
- **Included list:** 4 items each with green "Included" chip
- **Trust strip:** horizontal scroll of 4 trust cards
- **Action → gs-02**

#### `gs-02-make` through `gs-05-fuel` — Vehicle picker
- **Flow rail:** dots 2–5 of 10 active
- **Nav title:** Select make / model / year / Fuel & transmission
- **Segment:** Make | Model | Year | Fuel (current step highlighted)
- **Make:** 3-col logo grid, search "Search company", Honda selected in demo
- **Model:** 3-col photo grid under "Honda", City selected
- **Year:** 3-col grid 2016–2024, 2019 selected
- **Fuel:** Car preview photo, "Honda City · 2019", Manual/Automatic chips, Petrol card selected
- **CTA:** "Use this car" → saves **vehicle context** to local draft (make, model, year, fuel, transmission)—not necessarily a saved garage vehicle yet

#### `gs-06-jobcard`
- Vehicle summary card: "Honda City 2019 · Petrol"
- Concerns card: label "What's wrong with the car?" — editable text area. Demo: "Want full service and a health report. AC feels weak on idle."
- Line item: General servicing + health report · ₹2,999
- Note: "No repair add-ons on this flow."
- **CTA:** "Review estimate" → triggers server pricing

#### `gs-07-estimate`
- Policy note: "Indicative total · accept to continue booking"
- Lines: General servicing ₹2,999 · Included fluids check (Included chip) · **Total ₹2,999**
- **Primary:** "Accept estimate"
- **Secondary:** "Change job card" (returns to gs-06 without losing data)
- **API:** `POST /v1/job-cards/{id}/estimates/{id}/accept`

#### `gs-08-details`
- Combined form (single screen—not split):
  - Name (Rajesh Kumar)
  - Phone (+91 98765 43210)
  - Address (12, 5th Cross, Koramangala 5th Block)
  - Map placeholder below address
- **CTA:** "Continue to slot"
- Trigger OTP login here if not authenticated
- **API:** `POST /v1/job-cards/{id}/finalization` with customer + address payload

#### `gs-09-slot`
- Subtitle: "General service · ~2 hr visit"
- Date strip: Tue 18 | **Wed 19** | Thu 20
- Time grid (2 cols): 9–11, **11–13** (selected), 14–16, 16–18
- **CTA:** "Confirm 11:00 – 13:00" — creates slot hold then confirms booking
- **API:** `GET slots` → `POST slot-holds` → `POST book`

#### `gs-10-confirmed`
- Green checkmark (48px)
- Title: "Booking confirmed"
- Note: "We'll assign a van before your visit."
- Summary list: Reference JC-1050 · When Wed 19 · 11:00–13:00 · Vehicle Honda City 2019 · Address Koramangala
- **CTA:** "View booking"

---

### 5.3 SERVICE + REPAIR FLOW (12 screens + deny branch)

**Sequence:** gpr-01 → gpr-02 → gpr-03…06 → gpr-07 → gpr-08 → gpr-09 → gpr-10 → gpr-11 → gpr-12

#### `gpr-01-home`
- Tab: Service + repair
- Hero: "General + repair/replacement" / "Same service. Pick what to fix."
- **Warn policy note:** "Add repairs → callback → accept on app before slot"
- Same base package card as general
- **CTA:** "Select repairs / replacements" → gpr-02

#### `gpr-02-repairs` — Repairs cart
- Copy: "Add repairs to your cart. You'll review the full estimate before requesting a callback."
- **2-column add-on tile grid** (part icon + name + price). Pre-selected in demo: AC gas refill ₹1,200 · Brake pads ₹1,800
- Cart summary card: "In cart: AC gas refill · Brake pads (pair)"
- **CTA:** "Continue with 2 repairs"

#### `gpr-02-deny-cart` — After customer denies revised estimate
- Red/warn banner: "Estimate declined on ⑩ — adjust your cart and go back through the steps."
- Same tile grid with "Remove" on selected items
- **CTAs:** "Back to ⑦ Job card" · "Continue with updated cart"

#### `gpr-03-make` … `gpr-06-fuel`
- Same vehicle picker as general flow (steps 3–6 of 12)

#### `gpr-07-jobcard`
- Vehicle + concerns ("AC weak · brakes feel soft")
- Lines: General service ₹2,999 · AC gas refill ₹1,200 · Brake pads ₹1,800
- **CTA:** "Review estimate"

#### `gpr-08-estimate`
- Copy: "Review your cart total. A sales advisor will call to confirm scope on the app."
- Indicative total **₹5,999**
- **Single CTA:** "Submit estimate & request callback"
- Semantics: accept estimate version + create advisor case (server decides advisor required because add-ons present)

#### `gpr-09-call` — On call (waiting)
- Center: call icon, amber chip "Callback in progress"
- Title: "Priya is calling you"
- Body: advisor may change repairs during call; estimate will appear on app
- Submitted total ₹5,999 · Status "On call"
- Footer hint: "Watch for ⑩ on your app — Accept or Deny when the estimate arrives"
- **Poll** advisor case status or listen for push notification

#### `gpr-10-revised` — Accept / Deny (estimate arrived during call)
- Green chip: "Sent during your call"
- Lines may show revisions:
  - Brake pads: was ₹1,800 → **₹2,200**
  - **Added:** Brake fluid flush ₹450
  - Total on app: **₹6,849**
- **Primary:** "Accept" → gpr-11 slot
- **Secondary:** "Deny" → gpr-02-deny-cart
- **Important:** Field technician never changes this bill—only sales advisor via admin (built later)

#### `gpr-11-slot` · `gpr-12-confirmed`
- Same slot/confirm pattern as general; reference **JC-1042** in demo

**Simulate advisor push for MVP:** When customer reaches gpr-09, backend exposes a **dev-only endpoint** or admin can trigger revised estimate via API/DB so gpr-10 can be tested without admin UI.

---

### 5.4 ONE-MAN JOB FLOW (6 screens)

**Sequence:** om-01 → om-02 → om-03 → om-04 → om-05 → om-06

#### `om-01-home`
- Tab: One-man job
- Hero: "One-man job" / "Small fixes · fixed price"
- Policy note: "Direct book · no advisor for listed jobs"
- **2-column grid** of job cards (icon + name + duration + price)—NOT full package cards
- Tap any job → om-02

#### `om-02-detail` (example: Bulb / headlight)
- Selected job card: Bulb/headlight replacement · ~30 min · 1 technician · **₹399**
- Photo + copy: "Fit H4 / LED bulb at your doorstep. Parts priced if non-standard."
- **CTA:** "Book this job"

#### `om-03-vehicle`
- Subtitle: "Bulb / headlight · Honda City 2019"
- Car preview photo + caption
- **Secondary:** "Change vehicle" · **Primary:** "Continue"

#### `om-04-details`
- Name, phone, address (same combined pattern as gs-08)
- **CTA:** "Pick a slot"

#### `om-05-slot`
- "Short visit · ~30 min"
- Time slots in 30-min windows e.g. 14:00–14:30, **16:00–16:30**
- **CTA:** "Confirm 16:00"

#### `om-06-confirmed`
- Reference JC-0991 · Wed 19 · 16:00 · "One-man job confirmed. Tech arrives with basic parts."

**No estimate acceptance screen.** Price shown is server catalog price; confirmed at booking review implicitly.

---

### 5.5 SOS FLOW (4 screens — NOT a normal booking)

**Sequence:** sos-01 → sos-02 → sos-03 → sos-04

#### `sos-01-home`
- Tab: SOS (orange underline)
- Amber chip: "Emergency · not scheduled service"
- **Map** with live GPS indicator
- Location card: "Your location · Koramangala · live GPS" + Live badge
- 2×2 emergency tiles: Call ops · Flat tyre · Dead battery · Tow
- **Orange CTA:** "Get help now"

#### `sos-02-pick`
- Issue list: Flat tyre · Dead battery · Need a tow · Out of fuel (each with subtitle)
- **CTA:** "Call with this issue"

#### `sos-03-active`
- "Calling CARATOM ops" · sharing location + issue type
- Map · **Secondary:** "Cancel call"

#### `sos-04-dispatched`
- Green chip "Help dispatched"
- Map · Partner card "Roadside partner · ETA ~25 min · tyre assist"
- Issue + location summary · "Call ops again"

**Backend:** Create `SupportTicket` with type ROADSIDE, location, issue—do NOT create a JobCard/Booking. For MVP without dispatch integration, honestly show "Ops will call you" and allow status updates via API stub.

---

### 5.6 ACCOUNT SCREENS

#### `orders`
- Cards: JC-1042 Scheduled "General + repairs · Wed 11:00" · JC-0991 Completed "One-man · lighting"
- Tap → booking detail (build even though not in prototype—see §5.7)

#### `profile`
- Avatar + Rajesh Kumar + phone
- Row: Your orders →
- **Ghost button:** Log out

#### `addresses`
- Saved address cards with map pin icon
- **Secondary:** "Add address"

---

### 5.7 SCREENS REQUIRED BUT NOT IN PROTOTYPE (build anyway)

These complete the customer product and connect to the shared backend:

| Screen | Purpose |
|--------|---------|
| **Booking detail / progress** | Step progress, vehicle, address, next action, contact support |
| **Invoice & payment** | Razorpay checkout, "verification pending" state, never mark paid from client alone |
| **Review / rating** | Star rating + optional comment after completed visit |
| **Notifications** | Estimate ready, advisor calling, slot confirmed, payment due |
| **Support / help** | Ticket form linked to booking context |
| **Saved vehicles** | Profile sub-screen to manage garage |

Use same visual system as screens above.

---

## 6. BACKEND — PLUG-AND-PLAY ARCHITECTURE

Build the **full domain backend now** even though only customer UI ships. Technician and admin apps will call the same API later.

### 6.1 Stack

- **FastAPI** (Python 3.12) modular monolith on Railway
- **SQLAlchemy 2 + Alembic** migrations
- **Supabase PostgreSQL** (connection string; API owns all writes)
- **Supabase Auth** — phone OTP; FastAPI validates JWT via JWKS
- **Supabase Storage** — private buckets; FastAPI issues signed URLs
- **Redis + ARQ worker** on Railway — notifications, outbox (stub OK for MVP)
- **Razorpay** — payment orders + webhook (Phase 7; stub until then)

### 6.2 Monorepo layout (create all folders; only customer app gets UI now)

```text
apps/customer/              ← BUILD THIS
apps/technician/            ← empty Expo shell + README "future"
apps/admin-mobile/          ← empty Expo shell + README "future"
apps/admin/                 ← empty Next.js shell + README "future"
packages/contracts/         ← shared TypeScript types + Zod schemas FROM OpenAPI
packages/api-client/        ← typed fetch wrapper used by customer app
backend/
  app/modules/              ← all domain modules (see below)
  alembic/
  tests/
```

### 6.3 Domain modules (implement fully in backend)

`auth`, `profiles`, `vehicles`, `addresses`, `catalog`, `job_cards`, `pricing`, `advisor`, `bookings`, `slots`, `visits`, `technicians`, `inspections`, `parts`, `inventory`, `estimates`, `invoices`, `payments`, `notifications`, `reviews`, `support`, `admin`, `audit`

### 6.4 Core aggregates

- **JobCard** — commercial scope (one vehicle, one flow_policy)
- **Estimate** — versioned; IMMUTABLE once version published
- **AdvisorCase** — phone clarification workflow
- **Booking** — confirmed slot + snapshots of customer/address/vehicle
- **Visit** — field execution unit (customer sees progress via read model)
- **Invoice** / **Payment**
- **SupportTicket** — SOS requests

### 6.5 Flow policies (server-owned enum on ServiceOffering)

```text
GENERAL_SERVICE    — job card, optional add-ons, estimate, conditional advisor
ONE_MAN            — direct book
DIRECT_SPECIAL     — direct book (same UX as one-man; catalog-driven)
INSPECTION_REPAIR  — stub API only; no customer UI in this build
```

### 6.6 FlowDecision (return on every pricing/state response)

```json
{
  "policy": "GENERAL_SERVICE",
  "advisor_requirement": "NOT_REQUIRED | REQUIRED_NOW",
  "estimate_requirement": "PRE_BOOKING",
  "required_next_action": "ACCEPT_ESTIMATE | CREATE_ADVISOR_CASE | FINALIZE | SELECT_SLOT",
  "allowed_actions": ["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"],
  "blocking_reasons": [],
  "estimate_version_id": "uuid",
  "expires_at": "ISO8601"
}
```

Customer app navigates **only** from this object—not from which home tab was tapped.

### 6.7 Advisor rules (critical business logic)

- General Service **without** add-ons → `advisor_requirement = NOT_REQUIRED`
- General Service **with** one or more add-ons → `advisor_requirement = REQUIRED_NOW` after estimate accept
- One-man fixed-scope jobs → NOT_REQUIRED unless escalation flag set
- Technician **never** sets selling prices—only records parts/labour (enforce in `/v1/technician/*` even if unused)

### 6.8 Money rules (non-negotiable)

- All totals calculated server-side in integer **paise**
- Client displays server snapshots only; never computes tax/discount
- Estimate accept records version ID + amount + timestamp
- Razorpay webhook is sole authority for payment captured (when implemented)

### 6.9 Role-based API surface (implement all; customer app uses subset)

**Customer (`role=customer`):**
```text
GET  /v1/me, PATCH /v1/me
GET/POST/PATCH /v1/me/vehicles, /v1/me/addresses
GET  /v1/catalog/home
GET  /v1/services/{slug}
GET  /v1/repair-offerings
GET  /v1/one-man-jobs
POST /v1/job-cards/preview
POST /v1/job-cards
PATCH /v1/job-cards/{id}
POST /v1/job-cards/{id}/price
POST /v1/job-cards/{id}/estimates/{id}/accept
POST /v1/job-cards/{id}/estimates/{id}/reject
POST /v1/job-cards/{id}/advisor-case
GET  /v1/job-cards/{id}/advisor-case
POST /v1/job-cards/{id}/finalization
GET  /v1/job-cards/{id}/slots
POST /v1/job-cards/{id}/slot-holds
POST /v1/job-cards/{id}/book
GET  /v1/bookings/{id}
POST /v1/bookings/{id}/cancel
GET  /v1/bookings/{id}/invoice
POST /v1/invoices/{id}/payment-order
POST /v1/reviews
POST /v1/support-tickets
GET  /v1/me/notifications
```

**Technician (`role=technician`) — implement routes, test with API client/Postman, no UI:**
```text
GET  /v1/technician/visits
POST /v1/technician/visits/{id}/en-route|check-in|start-service|parts|labour|qc|complete
POST /v1/technician/location-pings
POST /v1/media/signed-upload
```

**Admin (`role=admin`) — implement routes, no UI:**
```text
GET/POST/PATCH /v1/admin/advisor-cases
GET/PATCH /v1/admin/job-cards/{id}
POST /v1/admin/job-cards/{id}/estimate
POST /v1/admin/jobs/{id}/assign
GET /v1/admin/dispatch
... (catalog, inventory, payments, audit)
```

**Dev helper for advisor flow testing (customer build):**
```text
POST /v1/dev/job-cards/{id}/simulate-advisor-estimate   # only when ENV=development
```
Publishes revised estimate to trigger customer gpr-10 screen without admin UI.

### 6.10 Database essentials

- UUID primary keys; human refs like `JC-1042`
- UTC timestamps; INR minor units
- Booking snapshots (customer, address, vehicle, policy) immutable after confirm
- Partial unique index: one current estimate per job card
- Idempotency keys on book, accept, payment
- `profiles.role` in (`customer`, `technician`, `admin`)

Seed catalog with all sample content from §3.8.

### 6.11 Error responses (Problem Details shape)

```json
{
  "code": "SLOT_UNAVAILABLE",
  "message": "That time was just taken.",
  "retryable": true,
  "current_state": "HOLD_EXPIRED",
  "allowed_actions": ["LIST_SLOTS"],
  "request_id": "..."
}
```

Handle gracefully in UI: stale slot → reload times; estimate expired → reprice; auth required → OTP screen with draft preserved.

---

## 7. CUSTOMER APP — TECHNICAL ARCHITECTURE

### 7.1 Stack

- **Expo** (current stable SDK) + **Expo Router** + TypeScript
- **TanStack Query** — server state
- **Zustand** — job card draft, vehicle context, flow step (persist locally, non-sensitive only)
- **React Hook Form + Zod** — forms
- **Expo SecureStore** — auth tokens
- **FlashList** — long lists
- **MapLibre** — maps (SOS, address pin)
- **@supabase/supabase-js** — auth only (domain data via FastAPI, not PostgREST)

### 7.2 Expo Router routes

```text
app/(auth)/splash.tsx
app/(auth)/phone.tsx
app/(auth)/otp.tsx
app/(tabs)/home.tsx
app/(tabs)/orders.tsx
app/(tabs)/profile.tsx
app/vehicle/make.tsx
app/vehicle/model.tsx
app/vehicle/year.tsx
app/vehicle/fuel.tsx
app/job-card/[id]/index.tsx
app/job-card/[id]/repairs-cart.tsx
app/job-card/[id]/estimate.tsx
app/job-card/[id]/advisor-waiting.tsx
app/job-card/[id]/advisor-revised.tsx
app/checkout/details.tsx
app/checkout/slot.tsx
app/booking/[id]/index.tsx
app/booking/[id]/invoice.tsx
app/booking/[id]/review.tsx
app/one-man/[slug].tsx
app/sos/index.tsx
app/sos/pick.tsx
app/sos/active.tsx
app/sos/dispatched.tsx
app/addresses/index.tsx
app/notifications.tsx
app/support.tsx
```

### 7.3 Environment variables (customer app)

```text
EXPO_PUBLIC_API_URL=https://your-api.railway.app
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

**Dev tip:** Physical phone on Expo Go cannot reach `localhost`—use Railway dev URL or ngrok.

### 7.4 Plug-and-play contracts package

Generate TypeScript types from FastAPI OpenAPI into `packages/contracts`. Customer app imports:

```typescript
import type { FlowDecision, JobCard, Estimate, Booking } from '@caratom/contracts';
import { apiClient } from '@caratom/api-client';
```

When technician/admin apps are built later, they import the **same packages**—no API redesign.

---

## 8. IMPLEMENTATION PHASES (CUSTOMER BUILD)

### Phase A — Foundation
- Monorepo scaffold (all app folders; only customer populated)
- FastAPI health + Supabase connection + Alembic init
- Supabase Auth phone OTP on customer app
- JWT verification middleware + `profiles.role`
- CI: lint, typecheck, basic tests

### Phase B — Catalog + Home
- Seed catalog + `GET /v1/catalog/home`
- Customer home with 4 mode tabs, hero, trust strip, bottom nav
- Match §3 visual spec exactly

### Phase C — General service E2E (gs-01 → gs-10)
- Vehicle picker, job card, estimate, details, slot, confirm
- Full backend pricing + booking transaction

### Phase D — Service + repair E2E (gpr-01 → gpr-12)
- Repair catalog, advisor case, dev simulate revised estimate, accept/deny loop

### Phase E — One-man E2E (om-01 → om-06)

### Phase F — SOS (sos-01 → sos-04) + SupportTicket API

### Phase G — Account + post-booking
- Orders, booking detail, profile, addresses
- Invoice/payment (Razorpay — requires EAS dev build, not Expo Go)
- Review, notifications

### Phase H — Backend completeness for future clients
- All `/v1/technician/*` and `/v1/admin/*` routes implemented + integration tests
- OpenAPI spec exported; contracts package generated
- Document in README: "Technician/admin UI not built; API ready"

---

## 9. DEV FIXTURES (replace before production launch)

```text
GENERAL_SERVICE_PRICE_PAISE=299900
ONE_MAN_BULB_PRICE_PAISE=39900
SERVICE_AREA=koramangala-bengaluru
GST_RATE=0.18                    # placeholder
PARTS_ADVANCE_PERCENT=0.50
SLOT_HOLD_MINUTES=15
OPERATING_HOURS=09:00-18:00 IST
```

Mark seeded rows `dev_fixture=true` in migration.

---

## 10. EXPLICIT NON-GOALS (THIS BUILD)

- Technician mobile UI
- Admin mobile UI
- Admin web UI
- Inspection + Repair customer journey (API stub only)
- Microservices
- Direct database writes from mobile app
- Public store listing for anything except customer app
- AI inspection, live GPS tracking for customers, automatic dispatch optimization

---

## 11. TESTING MINIMUM

Before calling the build complete:

1. **API tests:** General service books without advisor; repair path requires advisor; slot idempotency; role enforcement (customer cannot call admin routes)
2. **UI tests:** Coordinators route correctly from `FlowDecision`
3. **Manual E2E on Expo Go (iOS + Android):** All four customer journeys
4. **Simulate:** gpr-09 → gpr-10 revised estimate via dev endpoint

---

## 12. DEFINITION OF DONE

- [ ] Customer app matches visual spec (§3) and all screen specs (§5)
- [ ] All four booking journeys work against Railway API
- [ ] Supabase OTP login works
- [ ] Backend OpenAPI documents all customer + technician + admin routes
- [ ] `packages/contracts` generated; customer app uses typed client
- [ ] Empty technician/admin app shells exist with README pointing to API
- [ ] No prices or booking states originate from client logic
- [ ] App runs on Expo Go on iOS and Android

---

## 13. GLOSSARY

| Term | Meaning |
|------|---------|
| Job card | Customer's commercial request: service + concerns + optional repairs |
| Service + repair tab | General Service WITH add-ons—not Inspection+Repair |
| Vehicle context | Early make/model/year/fuel from picker; may differ from saved profile vehicle |
| Deny | Customer rejects advisor's revised estimate; returns to repairs cart |
| Sales advisor | Ops staff who calls customer and edits estimate (admin API—UI later) |
| Flow policy | Server enum determining business rules |
| Plug-and-play | Backend + contracts ready for future apps without rewrite |

---

**END OF PROMPT — paste everything above into Emergent.**
