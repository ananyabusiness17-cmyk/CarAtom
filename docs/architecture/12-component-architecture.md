# 12 — Component architecture

## Ownership rule

Components own presentation and local interaction. Hooks own query/mutation wiring. Coordinators own flow navigation. Backend application services own product rules. Do not let a reusable component call arbitrary APIs or decide lifecycle policy.

## Customer/technician primitives

Foundational primitives are small and semantic:

- `Screen`, `SafeAreaScreen`, `ScrollScreen`;
- `Text`, `Heading`, `Label`, `MoneyText`;
- `Button`, `IconButton`, `LinkButton`;
- `TextField`, `TextArea`, `SelectField`, `SegmentedControl`;
- `InlineError`, `Banner`, `Skeleton`, `EmptyState`, `RetryState`;
- `Section`, `Divider`, `ListRow`, `BottomSheet`, `Modal`;
- `StatusBadge`, `ProgressStep`, `Avatar/VehicleThumbnail`.

These consume design tokens and accessibility props. Do not expose arbitrary style escape hatches that undermine the visual system.

## Domain components

Create a domain component only when it has a stable meaning and at least one credible reuse case:

- `ServiceModeTabs`: renders policy/catalog choices, not navigation rules.
- `ServiceOfferingCard`: image, name, description, price presentation, duration, action.
- `SpecialServiceTile`: compact direct-bookable service item.
- `VehicleContextPill`, `VehiclePicker`, `VehicleSummary`.
- `ConcernComposer`: text and optional concern attachments.
- `RepairCatalogSearch`, `RepairCategoryList`, `RepairOfferingRow`, `SelectedRepairList`.
- `IncludedItemList` and `ScopeSummary`.
- `EstimateSummary`, `EstimateLineItem`, `EstimateVersionBanner`, `AcceptanceControls`.
- `AdvisorStatusCard` and `AdvisorChangeSummary`.
- `CustomerDetailsForm`, `VehicleDetailsForm`, `AddressForm`.
- `SlotCalendar`, `SlotOption`, `SlotHoldBanner`.
- `BookingReview`, `BookingProgress`, `InvoiceSummary`, `PaymentStatus`.
- `VisitTimeline`, `TechnicianEvidencePicker`, `InspectionChecklist`, `FittedPartEntry`, `QCChecklist`.

## Composition boundaries

Screen components compose domain components and query hooks. A screen may provide copy and layout context, but a child component receives typed data and callbacks. A child must not silently mutate global draft state unless that is its explicit contract.

## Hooks

Name hooks after queries or commands (`useHomeCatalog`, `usePriceJobCard`, `useAcceptEstimate`, `useSlotOptions`, `useConfirmBooking`). Hooks normalize loading/error/problem details. They do not navigate.

## Admin components

Admin may use a separate web component set: data table, filter bar, timeline, audit drawer, command dialog, bulk-safe action controls. Reuse contracts and tokens, not necessarily mobile markup.

## State and testability

Components receive stable fixtures in tests. Flow coordinators are pure functions where possible: `(resource, action) -> route/command`. Financial and transition logic is never unit-tested only through rendered text.

