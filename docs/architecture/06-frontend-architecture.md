# 06 — Frontend architecture

## Shared approach

Customer and technician apps use Expo React Native + TypeScript + Expo Router. Admin uses Next.js App Router + TypeScript + Tailwind. All clients consume the same versioned API contracts and naming.

Use TanStack Query for server state and cache; Zustand for bounded local workflow state; React Hook Form + Zod for forms; SecureStore/Keychain/Keystore-backed storage for tokens; FlashList for long lists.

Do not create a cross-platform UI mega-library before at least two real consumers exist. Share primitives and tokens, not every screen.

## Customer app route structure

```text
app/
  (auth)/splash
  (auth)/phone
  (auth)/otp
  (customer)/(tabs)/home
  (customer)/(tabs)/orders
  (customer)/(tabs)/profile
  (customer)/services/index
  (customer)/services/[serviceSlug]
  (customer)/job-card/[id]/edit
  (customer)/job-card/[id]/add-ons
  (customer)/job-card/[id]/estimate
  (customer)/job-card/[id]/advisor
  (customer)/checkout/details
  (customer)/checkout/vehicle
  (customer)/checkout/address
  (customer)/checkout/slot
  (customer)/checkout/review
  (customer)/bookings/[id]
  (customer)/bookings/[id]/invoice
  (customer)/bookings/[id]/payment
  (customer)/bookings/[id]/review
  (customer)/vehicles
  (customer)/addresses
  (customer)/notifications
  (customer)/support
```

Routes are navigation surfaces, not business policy. The flow coordinator consumes `FlowDecision` and chooses the next route.

## Technician route structure

```text
app/
  (auth)/phone-or-provisioned-login
  (tech)/(tabs)/today
  (tech)/(tabs)/map
  (tech)/(tabs)/profile
  (tech)/visits/[id]
  (tech)/visits/[id]/navigate
  (tech)/visits/[id]/check-in
  (tech)/visits/[id]/inspection
  (tech)/visits/[id]/service
  (tech)/visits/[id]/parts
  (tech)/visits/[id]/qc
  (tech)/offline-queue
```

## Admin route structure

```text
app/
  (auth)/login
  (ops)/inbox
  (ops)/jobs
  (ops)/jobs/[id]
  (ops)/jobs/[id]/estimate
  (ops)/jobs/[id]/advisor
  (ops)/dispatch
  (ops)/slots
  (ops)/customers/[id]
  (ops)/technicians/[id]
  (ops)/inventory
  (ops)/inventory/usage
  (ops)/payments
  (ops)/catalog
  (ops)/content
  (ops)/reports
  (ops)/settings
```

## State ownership

### TanStack Query

Catalog, service detail, add-on search, profile, saved vehicles/addresses, estimates, advisor status, slots, bookings, invoices, payment status, technician assignments, and admin boards.

### Zustand customer draft

Selected service, concerns, requested add-ons, optional early vehicle context, current local step, unsaved form values, last server pricing token, and draft timestamps. Persist only non-sensitive draft data. Clear on discard/sign-out according to policy.

### Zustand technician offline queue

Status commands, check-in/out, evidence upload intents, parts/labour entries, and QC responses with client-generated event ids. Queue entries are encrypted/local-only where platform support allows.

## Flow coordinator

Implement one explicit coordinator per customer policy:

- `generalServiceCoordinator`: job-card edit -> pricing -> estimate acceptance -> advisor branch -> finalization.
- `directSpecialCoordinator`: service detail -> finalization.
- `inspectionRepairCoordinator`: inspection booking -> visit/estimate/approval/parts/repair booking.

Each coordinator maps API `allowed_actions` to routes and copy. Screens do not contain cross-flow policy decisions.

## Networking

The API client adds auth, request id, app version, timeout, JSON parsing, and problem-details normalization. Mutating hooks accept an idempotency key. On 401, refresh once; if refresh fails, clear session and preserve a safe local draft for re-login.

## Persistence and recovery

Persist customer draft and technician queue with schema versioning. Migrate or discard incompatible local data safely. On app start, fetch current account and active jobs; reconcile local draft against server versions. Never replay payment or booking confirmation blindly.

## Forms and validation

Zod schemas validate shape and afford immediate field feedback. Server validation remains authoritative for compatibility, serviceability, pricing, and state. Forms use keyboard-aware scroll, correct input types, explicit labels, and focus to the first invalid field.

## Mobile platform behavior

- Respect safe-area insets and Android gesture/navigation bars.
- Use native date/time pickers or a well-tested calendar abstraction; disclose timezone.
- Use bottom sheets for small choice sets and full screens for substantial forms.
- Ask location, camera, notification, and photo-library permissions at the moment of need with rationale and a settings recovery path.
- Support deep links to booking, estimate, payment, and advisor status; require authentication and re-fetch on open.
- Avoid long blocking animations. Use reduced-motion behavior.

## Frontend testing and quality gates

Unit-test selectors, flow coordinators, validation, and formatting. Component-test loading/error/empty states. Use React Native Testing Library for customer/technician flows and Playwright for admin. Critical paths receive device/simulator E2E coverage.

