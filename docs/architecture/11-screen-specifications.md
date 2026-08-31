# 11 — Screen specifications

This document specifies the MVP screens. A screen may render different content by flow policy, but its purpose and recovery behavior remain explicit.

## Customer mobile

### Splash / session restore

Purpose: establish session and route to the correct surface. Entry: app launch/deep link. Exit: Home, OTP, or booking/estimate target after auth. Data: session, app version, pending local draft. Loading: branded neutral screen with brief progress. Error: retry and offline explanation. Persistence: local draft remains. Analytics: `app_opened`, `session_restored`. Accessibility: announce loading only if longer than a short threshold.

### Home

Purpose: discover services, show location/vehicle context, and expose urgent help. Entry: authenticated or guest launch. Exit: service detail, vehicle context, address/location, orders, profile, support/SOS. Data: catalog home payload, saved location/vehicle summary, CMS blocks, serviceability. UI: location top-left, optional vehicle pill top-right, visible service-mode tabs, image-led hero, service offerings, special-service grid, trust strip, offers, bottom navigation. Primary action: select a service. Loading: preserve chrome and show section skeletons. Empty: explain unavailable catalog and offer support. Error: retry sections independently. Persistence: last chosen location/vehicle context locally. Analytics: `home_viewed`, `service_selected`, `special_service_selected`. Accessibility: semantic headings, service cards as labelled buttons.

### Service detail

Purpose: explain scope, inclusions, pricing presentation, expected duration, and policy before starting. Entry: Home/catalog/search. Exit: Start Job Card, Book this service, or back. Data: offering version, media, inclusions, disclosures, flow policy. Primary action depends on policy. Loading/error/empty: standard query states. Validation: service must be active and serviceable. Analytics: `service_detail_viewed`, `service_started`. Back: return to previous catalog context.

For One-man Job, this screen must show the focused task, fixed/starting price, expected duration, likely parts disclosure, compatibility, and whether the request can be booked directly. Primary action is “Book this job.” If the API returns an escalation decision, replace direct booking with a clear advisor or Inspection + Repair next step; do not pretend the small job remains fixed-scope.

### Vehicle context picker (optional browse)

Purpose: personalize compatibility without forcing account/vehicle creation. Entry: Home vehicle pill, service detail compatibility prompt. Exit: save context, skip, or back. Data: makes/models/years/fuel/transmission. UI: searchable make grid, photo model grid, year grid, fuel/transmission controls modeled after references. Loading: progressive catalog. Error: search retry. Persistence: local draft only until finalization. Analytics: `vehicle_context_started`, `vehicle_context_completed`. Accessibility: selected state announced independently of image.

### Job Card editor — General Service

Purpose: capture included scope, concerns, and optional add-on repairs. Entry: Start General Service or resume draft. Exit: Add Repairs, Estimate, back, discard. Data: Job Card draft, concern list, requested items, current flow decision. UI: vehicle/context summary, included items, “What’s wrong with the car?”, add-on section, clear price disclaimer, sticky proceed action. Primary: Review estimate. Validation: service exists; concerns may be optional but prompt should be intentional. Loading: save/pricing status. Error: retain edits and explain retry. Persistence: debounced local; authenticated server draft when available. Analytics: `job_card_started`, `concern_added`, `job_card_proceeded`. Accessibility: field label and character guidance.

### Add-on repair discovery

Purpose: browse/search and add multiple known repairs. Entry: Job Card. Exit: add selection, return to Job Card, search/category filters. Data: repair catalog, compatibility, price presentation, advisor flag. UI: search, categories, result rows/cards, detail sheet, quantity where allowed, selected summary. Loading: list skeleton. Empty: explain no match and suggest adding a concern or support. Error: retry without losing selected items. Validation: inactive/incompatible item cannot be added. Analytics: `addon_search_used`, `addon_added`, `addon_removed`. Accessibility: result names, price and selection exposed.

### Estimate

Purpose: make expected scope and cost understandable and accept/reject explicit. Entry: priced Job Card, inspection result, or revised advisor estimate. Exit: Accept, Change Job Card, advisor status, back. Data: immutable Estimate version, line items, tax/discount disclosure, expiry, flow decision. UI: base service, included items, repairs, parts, labour, subtotal, discounts/tax, total, uncertainty note. Primary: Accept estimate. Secondary: Change job card/Reject. Loading: calculation/progress; never display guessed total as final. Error: retry pricing. Empty: impossible—route to error/support if no estimate. Analytics: `estimate_viewed`, `estimate_accepted`, `estimate_rejected`. Accessibility: totals read in order, line descriptions not color-only.

### Advisor status / call

Purpose: explain why clarification is needed and keep the customer moving. Entry: accepted General Service estimate with add-ons, configured inspection case. Exit: revised estimate, confirmed scope, reschedule contact, cancel/support. Data: AdvisorCase safe status, expected response window, verified phone, last customer action. UI: concise explanation, callback status, call scheduling/request action, changed-scope summary when relevant. Loading: status refresh. Empty: not rendered when advisor is not required. Error: retry status and support. Persistence: server case. Analytics: `advisor_required`, `advisor_status_viewed`, `advisor_call_rescheduled`. Accessibility: status announced; do not expose internal notes.

### Customer details

Purpose: collect or confirm name and reachable phone for fulfillment. Entry: accepted scope/direct special service. Exit: vehicle, address, back. Data: profile, phone verification status. UI: name, E.164 phone, consent/contact copy. Validation: Indian phone format and verified phone when advisor needed. Loading: profile save. Error: field-specific and retryable. Persistence: profile only after explicit save; booking snapshot later. Analytics: `customer_details_completed`. Accessibility: proper phone keyboard, error association.

### Vehicle details — final

Purpose: create/select the definitive vehicle used for eligibility, duration, and history. Entry: customer details. Exit: address/slot, back. Data: saved vehicles, draft context. UI: saved vehicle list plus create/edit form: registration, make, model, variant, year, fuel, transmission, mileage. Validation: required fields per offering; registration format normalized, not over-restricted. Loading: compatibility/pricing validation. Error: explain estimate reprice or incompatibility. Persistence: explicit save; booking snapshot. Analytics: `vehicle_finalized`, `vehicle_added`. Accessibility: grouped labels, image not required to identify.

### Address / service location

Purpose: confirm where the van will work. Entry: checkout. Exit: slot, back, add address. Data: saved addresses, service-area result, map pin. UI: address cards, locality/postal fields, optional map confirmation. Validation: serviceability and reachable contact. Loading: geocode/service-area check. Error: unsupported area with support/alternate address. Persistence: explicit saved address; booking snapshot. Analytics: `address_selected`, `serviceability_failed`. Accessibility: address fields read in logical order.

### Slot picker

Purpose: choose a capacity-backed doorstep visit. Entry: finalization after scope/details. Exit: review, back, refresh. Data: offering duration, visit type, slots, hold state, timezone. UI: date strip/calendar, grouped times, duration/disclosure, hold countdown only after hold. Loading: progressive dates. Empty: “No times on this date” with alternatives. Error: retry and preserve details. Stale hold: release and select again. Analytics: `slot_viewed`, `slot_selected`, `slot_hold_expired`. Accessibility: dates and availability labels, not color alone.

### Booking review and confirmation

Purpose: final legal/operational review before booking. Entry: valid slot hold. Exit: Confirm booking, edit relevant section, back. Data: accepted estimate, advisor resolution, customer/vehicle/address snapshots, slot hold, cancellation policy. UI: concise scope/price, address, vehicle, date/time, payment disclosure, confirm button. Loading: confirmation transaction. Error: duplicate/idempotent success lookup, stale slot recovery, estimate reaccept flow. Success: booking reference and next status. Analytics: `booking_reviewed`, `booking_confirmed`, `booking_failed`. Accessibility: confirmation CTA states exactly what will happen.

### Booking/order list

Purpose: show active and historical jobs. Entry: bottom Orders/profile. Exit: booking detail, invoice/payment, support. Data: paginated booking summaries and progress. Loading/empty/error: useful explanation and browse-services action. Analytics: `orders_viewed`, `booking_opened`. Accessibility: status and next action in row label.

### Booking detail / progress

Purpose: show operational truth and next customer action. Entry: order list/deep link/notification. Data: composed customer progress, visits, technician/ETA when safe, estimate/invoice/payment actions, evidence. UI: progress step, service/vehicle/address summary, next action, contact/support. Loading: refresh. Error: last-known status with retry. Analytics: `booking_detail_viewed`, `booking_action_started`. Accessibility: progress has textual state.

### Invoice and payment

Purpose: review final invoice and settle due amount. Entry: booking detail/notification. Data: Invoice, payment allocations, Razorpay order or offline note. UI: line items, tax, paid/balance, download/share, pay CTA. Loading: order creation/verification pending. Error: failed payment with retry/new order; never mark paid locally. Success: verified receipt/status. Analytics: `invoice_viewed`, `payment_started`, `payment_verified`, `payment_failed`. Accessibility: currency and total spoken clearly.

### Review/rating

Purpose: capture service feedback after completion. Entry: completed booking prompt/order detail. Exit: submit, skip, support. Data: completed visits, existing review. Validation: rating required; comment optional. Loading: submit. Error: retry without duplicate. Success: thank-you and history. Analytics: `review_started`, `review_submitted`. Accessibility: star controls have numeric labels.

### Profile

Purpose: account maintenance and recovery. Entry: Profile tab or deep link. Exit: edit/save/back to the profile hub. Data: profile summary and links to vehicles, addresses, notifications, support, settings, and logout. Loading/empty/error: scoped and recoverable. Destructive actions require confirmation. Analytics: `profile_viewed`, meaningful saves, notification preference changes, and logout. Accessibility: labelled menu rows, focus management, no hidden destructive action.

### Saved vehicles

Purpose: manage reusable vehicles outside an active checkout. Entry: Profile. Exit: add/edit/delete with confirmation, or back. Data: paginated saved vehicles and service history summary. Empty: explain why saving a vehicle helps and offer Add vehicle. Error: retry without losing unsaved form. Analytics: `saved_vehicles_viewed`, `vehicle_added`, `vehicle_updated`, `vehicle_archived`. Accessibility: vehicle identity spoken without relying on photo.

### Saved addresses

Purpose: manage reusable service locations. Entry: Profile. Exit: add/edit/archive or back. Data: address list and serviceability hints. Empty: offer Add address. Error: retry. Persistence: explicit save. Accessibility: address labels and locality are announced before actions.

### Notifications

Purpose: show important booking, estimate, advisor, payment, and visit updates. Entry: Home/profile/deep link. Exit: open linked resource or back. Data: cursor-paginated notification intents and read state. Empty: concise explanation. Error: retry. Analytics: `notifications_viewed`, `notification_opened`.

### Support/help

Purpose: recover from uncertainty or operational exceptions. Entry: profile, booking detail, SOS/support entry. Exit: ticket submitted, call/WhatsApp handoff, or back. Data: booking/job context, allowed support topics. Validation: concise description and safe contact. Error: retain draft and offer retry. Analytics: `support_opened`, `support_ticket_created`. Accessibility: clear urgency and contact method labels.

## Technician mobile

### Today / assigned visits

Shows only assigned work, grouped by operational day and visit type. Primary actions open a visit. Empty state explains no assignment and refresh/support. Offline banner is persistent but non-blocking. Analytics: `tech_today_viewed`, `visit_opened`.

### Visit detail

Read-only job scope, customer contact for this visit, vehicle, address, notes, visit type, and allowed actions. Selling-price editing is never present. Error preserves cached assignment with clear stale marker.

### Navigate / check-in

Shows address/map adapter, contact action, en-route/check-in controls, location permission handling, and offline queue state. Check-in is server-authoritative when online and queued with event id offline.

### Inspection visit

Checklist, concerns, findings, severity, photos, recommendations, save-draft, submit inspection. Camera/media failures are recoverable. Technician can recommend parts but not price them.

### Service/repair visit

Approved scope summary, fitted parts, labour performed, notes, evidence, and start/complete controls. If actual work diverges, create an exception for admin rather than silently changing selling price.

### QC and completion

Required checklist, exceptions, customer acknowledgement if adopted, and completion. Failed QC routes to follow-up or rework; it does not fabricate invoice paid state.

### Technician profile/offline queue

Shows account, shift/on-duty state, app sync status, queued events, and support. No customer/admin data beyond assigned work.

## Admin web

Admin screens are dense, keyboard/mouse-friendly operations surfaces with tables, filters, split views, explicit confirmation, and audit visibility.

### Inbox

Default advisor queue: pending cases, next attempt, customer contact, requested repairs, current estimate, and action buttons. Every outcome records note/actor.

### Job board and job detail

Filter all jobs by state, policy, area, technician, date, and payment. Detail includes full editor, state history, estimate versions, advisor case, visits, parts used, invoice, communication, and audit. Admin can override with reason.

### Estimate/advisor/dispatch/slots

Admin can revise commercial lines, record calls, publish estimates, assign technicians, inspect capacity, move/cancel visits, and book on behalf. Each mutation returns updated read model and audit reference.

### Inventory and technician dossier

Inventory shows stock, low-stock, movement, job usage, customer usage, and receive/adjust flows. Technician dossier shows identity, skills, duty, current/last ping, today/history, ratings, time, and fitted parts.

### People, payments, catalog, content, reports, settings

These are conventional operational screens but must expose server state, validation, permissions, audit, and meaningful empty/error states. Avoid creating dashboard widgets that do not answer an operational question.
