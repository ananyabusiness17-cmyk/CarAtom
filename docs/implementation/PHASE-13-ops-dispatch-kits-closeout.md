# PHASE 13 — Ops dispatch, kits, and closeout

**Document ID:** `PHASE-13-ops-dispatch-kits-closeout.md`  
**Version:** 1.0.0  
**Status:** Executable specification — **post-Phase-12 product work**  
**Depends on:** [PHASE-12-production-release-operations.md](./PHASE-12-production-release-operations.md) (platform already shippable)  
**Unblocks:** Desk + field ops density (dispatch board, kits, closeout) without rewriting Phases 1–12  
**Source of ideas (not source code):** [docs/audit/OSS-WHAT-TO-BRING.md](../audit/OSS-WHAT-TO-BRING.md) — P0–P2 constitution-safe items only. Do not copy AGPL/LGPL.

**Authority chain:**

1. This document (slices 0–7).
2. [`01-product-constitution.md`](../architecture/01-product-constitution.md) and [`docs/AUDIT-REPORT.md`](../AUDIT-REPORT.md).
3. `Vibe code principles/` — security and AI-verification; wins over external skills.
4. [`10-design-system.md`](../architecture/10-design-system.md) — tasteful light-blue accent `#5DB7E8` / `#176B9E`.
5. Skills: `caratom-phase-frontend`, `caratom-security-gate`.

---

## 0. Phase summary

Reimplement constitution-safe Bring items as **additive** Car Atom workflows. Slot holds, separate lifecycle machines, existing assign/parts APIs, customer booking, and admin-mobile dispatch stay intact.

| ID | Deliverable |
|----|-------------|
| P13-0 | Optional problem `details`; additive Zod (dispatch lanes, kits, closeout, actuals, mileage) |
| P13-1 | Named `SCHEDULE_OVERLAP` payload; enriched `GET /v1/admin/dispatch` lanes; admin web board |
| P13-2 | Server closeout queues; labour/parts rollup; IR % billed (read-only) |
| P13-3 | `catalog_kit_lines` + demo SKU seed; admin kit editor; customer catalog unchanged |
| P13-4 | Visit kit read model; technician picker on existing `POST .../parts`; short-van **warn**; optional FIT/REMOVE/RECYCLE |
| P13-5 | Nullable `actual_start_at` / `actual_finish_at` |
| P13-6 | Admin day grid, static job-pin map, mass assign via existing assign |
| P13-7 | Expose `mileage_km`; optional odometer; append-only `vehicle_service_logs` |

---

## Out of scope (do not implement)

Never-bring + risky P3 from the OSS audit:

- Live GPS, auto-dispatch, Gantt, rrule recurrence, AMC contracts
- Soft stock reserve, estimate option packages, “next GS” auto-hold
- ERP pickings / Stock Entry / DN / PO, flattened `job_status`, typed `signatureName`
- Shrinking the technician app; replacing slot holds; changing customer `FlowDecision`
- New Frappe/Odoo-style second SPA
- P1 signature capture (estimate accept already records version + hash + total)

---

## Compatibility rules (do not break)

- **Holds stay truth.** Calendar/board DnD calls existing `POST /v1/admin/jobs/{id}/assign`. Never PATCH visit datetimes as the booking.
- Keep error code `SCHEDULE_OVERLAP`. Only add optional `details`.
- Extend `GET /v1/admin/dispatch` with optional lane/visit fields; keep `technicians` + `unassigned_jobs`.
- Catalog labels stay. Kits are a **new table**, not a replace of `IncludedServiceItem.label`.
- Parts happy path is a picker; **free-text remains** for unknown SKUs.
- Short-van is **warn, not block**. No kit → assign behaves as today.
- Do not change visit status machine, auto-invoice on complete, or technician price ban.
- Additive Alembic only. Admin **web** = dense board; admin **mobile** = lite assign; same APIs.

---

## Slices

### Slice 0 — Contracts and problem details

`DomainProblem` / `problem()` optional `details: dict`. Zod: optional keys on `DispatchBoardReadModelSchema` (`.strict()` must not reject extras). Existing dispatch e2e and assign tests still pass.

### Slice 1 — Overlap payload + web dispatch lanes

Overlap 409 `details`: `conflicting_visit_id`, `conflicting_public_ref`, `technician_id`, `technician_name`, `scheduled_start_at`, `scheduled_end_at`.

`board()`: per technician, today’s assigned visits (id, job ref, window, status, vehicle, `job_card_id`, optional geo + actuals).

Admin web `/dispatch`: unassigned rail + one lane per tech (on-duty first). Client overlap preview uses the same interval as `VisitRepository.overlapping`. DnD **only changes technician**. Admin mobile: parse `details` for a clearer toast; no layout rewrite.

### Slice 2 — Closeout worklist

`GET /v1/admin/closeout?queue=` computed server-side:

1. Visit `COMPLETED` and latest estimate unpublished / superseded
2. Estimate accepted, no invoice
3. Invoice open, payment missing
4. `JobPart` with no `inventory_movement_id`
5. Visit in `QC_PENDING` / failed QC

Admin `/closeout` table + deep links. Do **not** change `should_auto_issue_invoice`. Labour vs parts rollup and IR `% billed` are display-only on the job Money tab.

### Slice 3 — Catalog ↔ SKU kits

Table `catalog_kit_lines`: `owner_type` (`SERVICE_OFFERING` | `REPAIR_OFFERING`), `owner_id`, optional `sku_id`, `quantity`, `line_kind` (`LABOUR` | `PART`). Labour lines have `sku_id` null — never CONSUME.

Seed demo SKUs (`CF-HON-01`, `R134A-250`, `COND-CITY`) onto matching repair offerings **without** renaming catalog labels. Admin kit editor on offering page + “used by offerings” on SKU detail.

### Slice 4 — Visit kit, van picker, CONSUME, short-van warn

`GET /v1/admin/visits/{id}/kit` and technician visit extra `kit`: expected SKU/qty, van qty, WH qty, status `ON_VAN` | `IN_WH` | `SHORT` | `LABOUR`.

Technician picker lists kit + van stock; submit still `POST .../parts` with `sku_code`. CONSUME only for PART kit lines with intent `FIT`. Extra field parts remain free-text.

Assign response: optional `kit_availability` / `warnings[]`. Never 409 for short van.

Optional `intent` on `JobPart` (`FIT` | `REMOVE` | `RECYCLE`) default `FIT`.

### Slice 5 — Actual start / finish

Nullable `actual_start_at` / `actual_finish_at` on `Visit`. Set start on first of check-in / start inspection / start service (do not reset). Set finish in `complete()`. Admin Visits tab: scheduled vs actual, late-start hint.

### Slice 6 — Density: day grid, static map, mass assign

Admin web on top of Slice 1:

- Day grid of visits × techs (read from enriched board). Click → existing job page.
- Static map: pins from booking address `latitude`/`longitude`. Missing coords → list-only. **Not** technician live location.
- Mass assign: selected unassigned visits → one tech; sequential existing assign; partial success + overlap `details` list.

### Slice 7 — Vehicle history (customer car)

Expose existing `mileage_km` on vehicle read DTOs. Technician complete/check-in: optional odometer (reject empty/zero if sent). Append-only `vehicle_service_logs` on visit complete. Customer + admin + tech read surfaces; **not** Odoo company fleet.

---

## APIs (additive)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/admin/dispatch` | Extra `assigned_visits` on technicians |
| POST | `/v1/admin/jobs/{id}/assign` | Unchanged required body; optional `warnings` + `kit` |
| POST | `/v1/admin/dispatch/mass-assign` | Partial success |
| GET | `/v1/admin/closeout?queue=` | Server queues |
| GET/PUT | `/v1/admin/catalog/kits` | Kit editor |
| GET | `/v1/admin/visits/{id}/kit`, `/v1/admin/jobs/{id}/kit` | Read model |
| GET | `/v1/me/vehicles/{id}/history`, `/v1/admin/vehicles/{id}/history` | Service logs |
| POST | `/v1/technician/visits/{id}/complete` | Optional `{ odometer_km }` |

Alembic: `0013_ops_bring` revises `0010_phase11_outbox`.

---

## Frontend / security closeout (mandatory)

After the last UI slice:

1. Full-app audit per `caratom-phase-frontend` (admin web dispatch/closeout/catalog/kit + technician picker + customer history).
2. `pnpm security` entire repo; fix CRITICAL/HIGH.
3. Regression: GS/IR/one-man e2e, slot holds, dispatch assign, technician parts, catalog browse, admin-mobile assign.

Do not scan only the diff. Do not point DAST at production. Never paste live secrets.

---

## Exit gate

- [ ] Slices 0–7 implemented as additive APIs/schema
- [ ] `SCHEDULE_OVERLAP` integration test with named `details`
- [ ] Existing `test_admin_mobile_dispatch_e2e.py` and `test_dispatch_assign.py` pass
- [ ] Slot holds remain booking truth (no visit datetime PATCH as booking)
- [ ] Customer catalog still returns labels, not kit SKUs
- [ ] Short-van never 409s assign
- [ ] Full frontend audit + `pnpm security`
