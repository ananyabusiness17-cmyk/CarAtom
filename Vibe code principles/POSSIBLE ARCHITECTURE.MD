# CARATOM — System Architecture (superseded)

**This draft is superseded by [`ARCHITECTURE.md`](./ARCHITECTURE.md).** Use that file for product flows, status machine, and implementation order.

**Status:** Draft (historical)  
**Audience:** Engineering  
**Scope:** Customer app, technician app, admin app, shared API, data, and paid vs self-hosted services

---

## 1. Purpose

CARATOM is a doorstep car care platform. Customers book servicing and repairs. Technicians execute jobs in the field. Admins run operations.

This document freezes:

- product surfaces
- system topology
- open-source stack
- what we pay for vs self-host
- domain model
- repo layout
- MVP vs later

**Non-goal:** forking an existing “car service” product. We assemble mature open-source libraries and write the domain ourselves.

---

## 2. Product surfaces (three faces)

| Face | Users | Primary client | Why |
| --- | --- | --- | --- |
| **Customer** | Car owners | Mobile (Expo) | Booking, job card, approvals, payments, history |
| **Technician** | Field techs | Mobile (Expo) | Dispatch, navigation, inspection photos, job status, QC |
| **Admin** | Ops, advisors, parts, finance | Web (Next.js) | Dispatch, inventory, estimates, invoices, staff, reports |

One API. Three clients. Role-based access in the backend, not three backends.

Technician is **not** a tab inside the admin website. Doorstep work needs camera, GPS, offline-tolerant queues, and push. Admin is a desk product.

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  CUSTOMER APP   │  │ TECHNICIAN APP  │  │    ADMIN WEB    │
│  Expo / RN      │  │  Expo / RN      │  │  Next.js        │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │  HTTPS + JWT
                              ▼
                    ┌───────────────────┐
                    │  FastAPI (Railway)│
                    │  modular monolith │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │  Supabase  │  │   Redis    │  │   Worker   │
       │  Postgres  │  │  cache /   │  │  (Railway) │
       │  Auth      │  │  queues    │  │            │
       │  Storage   │  │            │  │            │
       │  Realtime  │  └────────────┘  └────────────┘
       └────────────┘
```

---

## 3. Cost policy

**Pay only for things that cannot reasonably be replaced by open source:**

| Paid | Why it is necessary |
| --- | --- |
| **Railway** | Compute for API, worker, admin web |
| **Supabase** | Managed Postgres, Auth, Storage (already in use) |
| **Razorpay** | India payments, settlements, webhooks, compliance |
| **Apple / Google** | App store accounts (when you ship stores) |
| **Domain + DNS** | Public URLs, TLS |
| **SMS / WhatsApp** | OTP and booking alerts in India (Twilio / MSG91 / Gupshup — pick one later) |

**Do not add paid SaaS for:** frontend hosting, error tracking, maps tiles, feature flags, CI, object storage, auth (beyond Supabase).

| Need | Choice | Notes |
| --- | --- | --- |
| Admin frontend hosting | **Railway** (same project as API) | No Vercel bill |
| Customer / technician apps | Expo + **EAS free / local builds** | Store fees only when publishing |
| Maps | **OpenStreetMap + MapLibre** | Avoid Google Maps Platform billing |
| Error tracking | **GlitchTip** (self-host on Railway) or Railway logs in MVP | Sentry Cloud is paid; skip it |
| Feature flags | Env vars / DB flags in MVP | Unleash later, self-hosted |
| CI | **GitHub Actions** | Free for public/private at our scale |
| Email (optional) | **Resend** later, or SMTP | Not MVP-critical if WhatsApp/SMS exists |

Railway hosts **API + worker + admin web**. Supabase hosts **data plane**. That is the whole production footprint for MVP.

---

## 4. Frontend deployment decision

You already have Railway and Supabase. Use Railway for the admin web as well.

| App | Runtime | Deploy |
| --- | --- | --- |
| Customer | Expo (iOS / Android) | EAS Build or local; TestFlight / Play Internal |
| Technician | Expo (iOS / Android) | Same as customer, separate bundle IDs |
| Admin | Next.js (standalone Node) | **Railway service**, Docker, same project |

**Why not Vercel**

- Extra vendor and extra invoice
- Admin is an authenticated internal tool, not a marketing CDN problem
- Next.js `output: 'standalone'` runs cleanly as a Railway service behind the same domain (`admin.yourdomain.com`)

**Optional later:** a customer marketing site (static) on Cloudflare Pages (free). Not required for MVP if the mobile apps are the customer surface.

**Expo web:** do not ship customer/technician as Expo-web for MVP. Field and booking UX are native-first.

---

## 5. Frozen stack

All application libraries below are MIT / Apache-2.0 / BSD. Business logic is ours.

### 5.1 Customer and technician apps

```text
React Native
Expo (SDK, Router, Camera, Location, Notifications, SecureStore)
TypeScript
TanStack Query          # server state
Zustand                 # drafts / UI
React Hook Form + Zod
FlashList
react-native-calendars
MapLibre (OSM)          # not Google Maps
Razorpay RN             # customer app only
```

Shared package: `packages/ui`, `packages/api-client`, `packages/schemas`.  
Two Expo apps: `apps/customer`, `apps/technician` (different icons, permissions, store listings).

### 5.2 Admin web

```text
Next.js (App Router)
TypeScript
TanStack Query
React Hook Form + Zod
Tailwind CSS
```

Same API client and Zod schemas as mobile.

### 5.3 Backend

```text
Python 3.12
FastAPI
Pydantic v2
SQLAlchemy 2 + Alembic
Redis + ARQ or RQ         # queues (open source)
httpx
```

FastAPI owns **all business rules**. Supabase is not used as a substitute for the domain API (no “clients write job cards via PostgREST”). Clients talk only to FastAPI. FastAPI uses:

- Supabase Auth to **verify JWTs**
- Postgres (Supabase) via SQLAlchemy
- Storage for photos / invoices
- Realtime only where it is simpler than polling (job status)

### 5.4 Data

```text
PostgreSQL
PostGIS                 # service radius, tech location
Supabase Auth
Supabase Storage
pgvector                # later, not MVP
```

---

## 6. Auth and roles

Supabase Auth issues JWTs. FastAPI validates them and loads `profiles.role`.

| Role | App |
| --- | --- |
| `customer` | Customer |
| `technician` | Technician |
| `admin`, `advisor`, `parts`, `finance` | Admin web |

Rules:

- One person, one primary role for MVP
- Technician cannot hit customer payment endpoints
- Customer cannot patch job status
- Admin can impersonate support flows only via audited endpoints

OTP: Supabase phone auth **or** FastAPI + SMS provider. Pick one path in implementation; do not run two auth systems.

---

## 7. Core domain

**Job card is the aggregate root.** Booking creates a job card. Everything else hangs off it.

```text
USER
 ├── VEHICLE
 └── ADDRESS

BOOKING  →  JOB CARD
              ├── INSPECTION → FINDINGS → ESTIMATE → CUSTOMER APPROVAL
              ├── PARTS + LABOUR
              ├── QC
              ├── INVOICE → PAYMENT
              └── SERVICE HISTORY
```

Long-running flow (days, not seconds):

```text
Booking → Assign tech → Travel → Inspection → Estimate
  → Customer approval → Parts → Repair → QC → Invoice → Payment → Close
```

MVP orchestration: **Postgres status machine + Redis worker** (reminders, webhooks, notifications).  
Do **not** introduce Temporal until this machine is painful in production.

---

## 8. Logical schema (MVP tables)

Keep this list as the source of truth for Alembic. Do not copy ERPNext / RepairOS schemas.

```text
users / profiles          # role, phone, name
vehicles
vehicle_documents
addresses

service_categories
services
service_addons

technicians
technician_skills
technician_availability
technician_locations      # last ping

bookings
booking_items

job_cards
job_status_history
technician_assignments

inspections
inspection_items
inspection_findings
inspection_photos         # storage keys, not blobs in Postgres

estimates
estimate_items
repair_approvals

parts
part_inventory
job_parts
job_labour

qc_checks

invoices
invoice_items
payments
payment_transactions

reviews
notifications
audit_logs
```

Multi-car: `bookings` can have many vehicles; second-car discount is a booking-level rule, not a second checkout product.

---

## 9. Payments

India → **Razorpay** (paid, necessary).

```text
Customer app
  → POST /payments/orders   (FastAPI)
  → Razorpay order id
  → Razorpay SDK checkout
  → Razorpay webhook        (FastAPI, signature verified)
  → payment_transactions
  → invoice finalized
```

Never trust the client for “payment succeeded”. Webhook + server verification only.

---

## 10. Media

Photos and PDFs go to **Supabase Storage**. Postgres stores object keys, job id, finding id, checksum, taken_at.

```text
Technician camera → app → signed upload URL (FastAPI) → Storage
                         → inspection_photos row
```

Do not upload via unauthenticated public buckets.

---

## 11. Notifications

MVP worker jobs:

- booking confirmed
- technician assigned / ETA
- estimate ready (customer must approve)
- payment link / success
- job completed

Channels: push (Expo) first; SMS/WhatsApp for OTP and high-priority booking events.

---

## 12. Repository (monorepo)

```text
CARATOM/
├── apps/
│   ├── customer/          # Expo
│   ├── technician/        # Expo
│   └── admin/             # Next.js
├── packages/
│   ├── api-client/
│   ├── schemas/           # Zod / shared types
│   └── ui/                # only if it stays thin
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # config, security, permissions
│   │   ├── modules/       # auth, vehicles, bookings, jobs, ...
│   │   ├── integrations/  # supabase, razorpay, sms, maps
│   │   └── workers/
│   ├── tests/
│   ├── migrations/
│   └── Dockerfile
├── infrastructure/        # Railway, env samples, GlitchTip compose if used
└── docs/                  # this architecture lives here later
```

### Backend modules

`auth`, `users`, `vehicles`, `addresses`, `services`, `bookings`, `job_cards`, `inspections`, `estimates`, `approvals`, `parts`, `technicians`, `repairs`, `qc`, `invoices`, `payments`, `notifications`, `reviews`, `service_history`

Modular **monolith**. No microservices for MVP.

---

## 13. App information architecture

### 13.1 Customer

- Location + profile
- Vehicle search (make, model, year, fuel)
- Packages and specialty categories
- Job card: car, concerns, line items, add-ons
- Second car at discount
- Estimate approval
- Pay (Razorpay)
- Service history

### 13.2 Technician

- Today’s jobs / map
- Navigate to address
- Check-in / start job
- Inspection checklist + photos
- Parts used / labour notes
- Request estimate / wait for approval
- QC checklist
- Mark complete

### 13.3 Admin

- Live bookings and dispatch
- Customer / vehicle records
- Job cards and estimates
- Parts inventory
- Technician roster and skills
- Invoices and payments
- Reports
- Settings (services, prices, service radius)

---

## 14. Environments

**One environment for now:** production-shaped staging is a later split.

Use:

- `SUPABASE_*`
- `REDIS_URL`
- `RAZORPAY_*`
- `JWT` / Supabase JWT secret
- `STORAGE` bucket names

Never commit secrets. Railway + Supabase dashboards only.

---

## 15. MVP cut line

**In**

- Three clients against one API
- Auth + roles
- Vehicle + address
- Booking + job card + add-ons + second car discount
- Technician assignment (manual from admin is OK)
- Inspection photos
- Simple estimate + customer approve/reject
- Invoice + Razorpay
- Push + basic SMS OTP

**Out (later)**

- pgvector / “ask my car history”
- Temporal
- Unleash
- Live GPS tracking beyond last ping + ETA text
- Full parts procurement ERP
- AI inspection

---

## 16. Explicit non-goals

Do **not**:

- Fork OpenAuto, ERPNext, RepairOS, or Cal.com
- Mix two UI kits or two auth systems
- Let mobile talk to PostgREST for writes
- Put Google Maps, Vercel, or Sentry Cloud on the critical path
- Split into microservices before a second team exists

**Study only (domain):** OpenAuto, RepairOS (archived), Cal.com companion, ERPNext inventory concepts. GPL/abandoned code stays out of the repo.

---

## 17. Decision log

| Decision | Choice | Rationale |
| --- | --- | --- |
| Clients | 3 apps, 1 API | Different jobs, devices, and permissions |
| Backend shape | Modular FastAPI monolith | Fits one team / AI-assisted coding |
| Data / auth / files | Supabase | Already in use; OSS products, managed infra |
| API + worker + admin | Railway | One compute bill |
| Customer / tech mobile | Expo | Fastest path to stores |
| Payments | Razorpay | India; unavoidable processor |
| Maps | OSM + MapLibre | Avoid Maps Platform fees |
| Observability MVP | Railway logs; GlitchTip optional | Avoid Sentry Cloud |
| Workflow engine | Postgres + Redis worker | Temporal is premature |
| IP | Job/inspection/estimate/QC flow | Libraries are plumbing, not the product |

---

## 18. What “open source” means here

Libraries and self-hostable components are open source. **The product is not a fork of a shop-management ERP.**

Differentiating logic we write and own:

> Inspection → findings → estimate → approval → repair → QC → invoice → vehicle history, delivered at the doorstep.

Open source accelerates plumbing: auth, lists, forms, calendars, maps, queues, deploys. It does not define CARATOM.
