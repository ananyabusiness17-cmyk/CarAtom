# What to bring from open-source FSM / ERP references

Read-only comparative audit of **Car Atom** against three Desktop references. This file lists **concepts, workflows, and UX patterns to reimplement** inside Car Atom. It is **not** a license to copy source.

| Reference | Path on this machine | License | Role in this audit |
|-----------|----------------------|---------|--------------------|
| OpenFieldPro (OFP) | `c:\Users\nanda\OneDrive\Desktop\openfieldpro-ofp-monorepo` | AGPL-3.0-only | Best dispatcher lanes, overlap UX, closeout queues |
| Beveren FSM | `c:\Users\nanda\OneDrive\Desktop\Field_Service_Management-develop` | AGPL-3 (`license.txt`; ignore `hooks.py` MIT / `package.json` ISC claims) | Service vs spare split, actual start/finish, schedule SPA views, AMC budget sketch |
| Odoo 19 Community | `c:\Users\nanda\OneDrive\Desktop\odoo-19.0` | LGPLv3 | Repair line types, parts availability / reserve **ideas**, vehicle service log fields. **No** `industry_fsm` addon in this tree |

Car Atom remains a **doorstep automotive OS** (customer / technician / admin-mobile Expo + admin Next.js + FastAPI), not a generic FSM or workshop ERP.

---

## 1. How to read this document

- **Bring** means: describe the workflow in Car Atom language, then implement it on Car Atom models, APIs, tokens, and apps.
- **Do not bring** means: do not vendor, paste, or translate AGPL/LGPL source; do not adopt ERP objects that fight the constitution.
- Each bring item names **source path** (evidence), **Car Atom equivalent**, **who uses it**, and **complexity** (S / M / L).
- Inventory for **General Service kits and repair parts is in scope.** “Never: ERP stock/pickings” means do not copy Odoo `stock.picking` / ERPNext Stock Entry / WMS — not “no inventory.”
- Improve scheduling and job cards **only when it helps users.** Slot holds + capacity stay source of truth. JobCard / Estimate / Advisor / Booking / Visit / Invoice / Payment stay **separate machines**.

---

## 2. What Car Atom already owns (do not replace)

These are product authority, not gaps.

| Area | Car Atom today | Do not replace with |
|------|----------------|---------------------|
| Product identity | Doorstep automotive OS; four apps; `FlowDecision`; constitution in `docs/architecture/01-product-constitution.md` | Generic FSM job board as the customer product |
| Scheduling truth | Slot holds + capacity; booking consumes hold transactionally | OFP datetime drag as source of truth; Beveren appointment as the only calendar |
| Overlap | `VisitRepository.overlapping` — `scheduled_start_at < end AND scheduled_end_at > start`, exclude COMPLETED/CANCELLED | Copying OFP/Beveren SQL; the **algorithm** is already the same family |
| Job lifecycle | Separate JobCard / Estimate / Advisor / Booking / Visit / Invoice / Payment | OFP `lead → scheduled → in_progress → completed` collapse |
| Estimates | Immutable versions, advisor supersede, customer accept | OFP typed `signatureName` as consent |
| Inventory ledger | `WH` / `VAN_*`; `RECEIVE` / `CONSUME` / `TRANSFER` / `ADJUST`; admin grid `apps/admin/app/(ops)/inventory/page.tsx` | Odoo pickings UI; ERPNext Stock Entry / DN / PO / PR / PI |
| Technician app | Visit screens including parts, QC, photos — far ahead of OFP mobile | OFP `App.tsx` Today + diagnostic-only sync |
| Consumer flows | GS / One-man / Special / Inspection+Repair; advisor policy | Odoo `sale_project` task spawning as the booking funnel |

**Known Car Atom gaps** (documented in §6, not “bring ERP”):

- `IncludedServiceItem` is **label-only** (no `sku_id`).
- `RepairOffering` has **no `sku_id`**. Catalog seed `icon_key` values like `part-ac` are merchandising, not stock.
- Inventory demo SKUs (`CF-HON-01`, `R134A-250`, …) live in a **disconnected** grid.
- Technician `apps/technician/app/(tech)/visits/[id]/parts.tsx` is **free-text SKU**.
- Dispatch map is a placeholder; SOS is `DISPATCHED_STUB`; `DIRECT_SPECIAL` enum is unused; QC AC items are hardcoded; constitution defers live GPS / auto-dispatch.

---

## 3. Bring from OpenFieldPro

License: **AGPL-3.0-only**. Reimplement ideas only.

### 3.1 Dispatcher board: unassigned lane + per-technician lanes + conflict banners

| | |
|--|--|
| **Source** | `apps/web/app/dispatch/page.tsx`; client preview `apps/web/lib/dispatch-conflicts.ts` (`appointmentsOverlap`, `buildConflictMap`, `countConflictPairs`); 409 formatting `dispatch-api.ts` |
| **Car Atom** | Admin ops dispatch surface over **Visits** (not Jobs). Unassigned = visits with no technician; one lane per on-duty tech. Overlap check already exists in `VisitRepository.overlapping` — **expose it on assign/hold APIs** and show banners before save |
| **Who** | Admin dispatcher (web + admin-mobile later) |
| **Complexity** | L (UX + wiring holds; medium if board-only without DnD) |
| **Constraint** | Drop onto a lane must call **assign + hold/capacity APIs**, not PATCH datetime on a flattened job. Block assign if overlap, same as OFP client guard |

### 3.2 Server overlap rejection with named conflict payload

| | |
|--|--|
| **Source** | `apps/api/src/routes/appointments.ts` `findTechnicianConflict` — `startsAt < endsAt AND endsAt > startsAt`; HTTP 409 with conflicting appointment times |
| **Car Atom** | Return 409 from visit assign / reschedule / hold-consume with **conflicting visit id, technician, window**. Window semantics: OFP validation uses half-open `[start,end)` (`appointment-validation.ts`). Align Car Atom docs with existing overlap predicate so UI and API match |
| **Who** | Admin, later technician self-assign if allowed |
| **Complexity** | S–M (API shape + admin toast; overlap query exists) |

### 3.3 Calendar / board drag as *operation*, not as truth

| | |
|--|--|
| **Source** | Dispatch page DnD; `ScheduleCalendar.tsx` (~1754 lines) day/week/month/tech views, `api.patchJob` for schedule/assign/status. Calendar overlap is **weaker** than appointment overlap API |
| **Car Atom** | Optional week/day tech calendar **on top of** visits + slot holds. Prefer OFP **dispatch lanes** over the giant calendar first. Recurrence (`rrule` expand) is P3 unless GS needs it |
| **Who** | Admin dispatcher |
| **Complexity** | L for full calendar; M for lane DnD only |
| **Constraint** | Do not make job-level schedule the source of truth. Do not skip hold consumption |

### 3.4 Closeout queues (office after the van)

| | |
|--|--|
| **Source** | `closeout/page.tsx` client filters: `scheduled` / `in_progress` / `completed && total>0 && no invoice` / `completed && total===0` (needs-pricing) |
| **Car Atom** | Admin queues in **Car Atom states**, not OFP `job_status`: (1) visit completed, estimate unpublished / superseded; (2) estimate accepted, invoice missing; (3) invoice open, payment missing; (4) parts consumed with no movement; (5) QC incomplete. “Needs pricing” ≈ zero commercial total after field close — map to unpublished estimate or zero invoice, not OFP `total===0` |
| **Who** | Admin ops / billing |
| **Complexity** | M |
| **Why this helps** | Technician finished in the field; office still owes the customer a number. Car Atom already has the machines; it lacks a **single office worklist** |

### 3.5 Technician write scope (pattern, not OFP’s thin app)

| | |
|--|--|
| **Source** | `jobs.ts`: tech list scoped to `assignedTo`; tech PATCH only `scheduled→in_progress` and `in_progress→completed`. `operational-authorization.ts`: office writes owner+dispatcher; tech `technicianJobPatchAllowed` = **status only**; sync cannot touch invoices/payments/estimates |
| **Car Atom** | Keep constitution: techs record labour/parts **without selling prices**; cannot originate invoice totals. Use OFP as a reminder to **lock admin-only routes** on estimates/invoices/payments. Do **not** shrink the technician app to OFP’s Today + diagnostic outbox |
| **Who** | API authorization |
| **Complexity** | S (audit existing FastAPI deps; tighten if any leak) |

### 3.6 Estimate options + send-before-approve

| | |
|--|--|
| **Source** | Estimates: draft → sent → approved/declined/expired; **options**; approve requires send first; `copy-approved-to-job`; deposit invoice |
| **Car Atom** | Already stronger (immutable versions, advisor supersede). Optional bring: **option packages** on an estimate version (good/better/best parts) if GS add-ons need it. **Do not** treat typed `signatureName` as consent — build real acceptance (version id, amount, timestamp) which Car Atom already has |
| **Who** | Customer + advisor + admin |
| **Complexity** | M for options; skip signature-name |

### 3.7 Explicitly skip from OFP

- Flattened `job_status` as the product model.
- Mobile as diagnostic-field-package sync only (`App.tsx` / `service.ts` outbox) — Car Atom tech app is the target, not OFP mobile.
- **No parts inventory in OFP schema** — do not “bring inventory from OFP”; there is none.
- Recurring appointments / rrule as MVP.
- Typed name as legal signature.

---

## 4. Bring from Beveren FSM

License: **AGPL-3**. Reimplement ideas only. Treat Desk + SPA as two products; Car Atom should not grow a Frappe Desk.

### 4.1 Line split: service labour vs spare parts totals

| | |
|--|--|
| **Source** | `beveren_fsm/field_service_management/doctype/service_order/service_order.py` `calculate_service_totals` — `is_service` / item_group `service` vs spare; separate `service_total` and `spareparts_total` |
| **Car Atom** | Estimate and invoice line types already distinguish labour vs parts in spirit. **Bring the display and admin rollup**: kit labour vs kit parts vs add-on parts vs extra field parts. Skip `make_stock_entry` / Delivery Note / Purchase Order / Receipt / Invoice that **skip service lines** — that is ERPNext WMS |
| **Who** | Admin inventory + billing; customer estimate (already server-authoritative) |
| **Complexity** | S–M (schema flags + admin columns if missing) |

### 4.2 Actual start / actual finish timestamps on the visit

| | |
|--|--|
| **Source** | `service_appointment.js` `start_work` / `complete_work` set `actual_start_datetime` / `actual_finish_datetime` to now; Desk **Dispatch** action. SPA does **not** own start/complete |
| **Car Atom** | Visit already has scheduled window. Persist **actual_start_at / actual_finish_at** from technician start/complete (already likely on visit mutations). Surface on admin job card and closeout: scheduled vs actual, late start. `prompt_movement` (product location dialog) is **workshop tracking** — map to Car Atom **van CONSUME**, not Product Location master |
| **Who** | Technician (write), admin (read), customer progress label (composed read model) |
| **Complexity** | S if timestamps exist; M to show variance on admin card |

### 4.3 Appointment overlap with named technicians

| | |
|--|--|
| **Source** | `service_appointment.py` `validate_overlap` — same interval predicate; error names appointment + technician full names. Statuses Open / Scheduled / Dispatched / In Progress / Completed / Cancelled map onto order status |
| **Car Atom** | Same as OFP §3.2. Multi-tech on one visit is optional (doorstep is usually one van). **Do not** copy Open→Scheduled auto-status that fights Visit machine |
| **Who** | Admin dispatcher |
| **Complexity** | S |

### 4.4 Unassigned work list + create appointment from order

| | |
|--|--|
| **Source** | `api/schedule.py` `get_unassigned_service_orders` (submitted orders with no appointment); `create_appointment_from_api` (window + technicians + items; optional Dispatched) |
| **Car Atom** | Unassigned **visits** (or bookings awaiting visit) in the left rail of the dispatch board. Creating a visit from a booking already exists conceptually — expose “queue without technician” as first-class |
| **Who** | Admin dispatcher |
| **Complexity** | M (board UI) |

### 4.5 Schedule SPA: four views + mass assign

| | |
|--|--|
| **Source** | `schedule/src/pages/schedule/schedule.tsx`; store `schedule-store.ts` viewType `gantt` \| `grid` \| `maps` \| `calendar`; `mass-actions-dropdown.tsx` bulk assign/remove technicians; `maps-view.tsx` Leaflet pins from **appointment lat/lng** (static, not live GPS); `api/geocoding.py` Nominatim proxy with rate limit |
| **Car Atom** | **Bring view switching** only if dispatch lanes are not enough: grid for dense day, map for **job pins** (customer address), not technician live location. Mass assign is useful for “this afternoon’s GS run.” Geocoding: keep behind existing maps port; constitution already wants vendor swap |
| **Who** | Admin dispatcher |
| **Complexity** | Gantt L; grid M; static map M; mass assign M |
| **Constraint** | Maps are **job location**, not live GPS. Constitution defers live tracking / auto-dispatch |

### 4.6 AMC / contract budget as a *sketch* only

| | |
|--|--|
| **Source** | `check_amc_budget` / `is_over_budget`; `update_amc_contract_utilization` splits service vs spare utilization |
| **Car Atom** | Not MVP for consumer GS. Optional later: **fleet / corporate** prepaid buckets. Do not build AMC Contract doctype |
| **Who** | Admin (future B2B) |
| **Complexity** | L — **P3** |

### 4.7 Invoice proportion billed

| | |
|--|--|
| **Source** | `fsm_utils.py` `create_service_invoice`; `update_per_billed_status` qty-proportion billed |
| **Car Atom** | Partial billing is already an Invoice machine concern. Bring **progress % billed** on admin job card if IR two-visit needs a deposit vs remainder. Do not copy ERPNext invoice wizard |
| **Who** | Admin billing |
| **Complexity** | M — **P2** |

### 4.8 Explicitly skip from Beveren

- `make_stock_entry`, Delivery Note, Purchase Order / Receipt / Invoice from service order.
- `record_product_movement` as workshop/vendor location master.
- Frappe Desk forms, `print("OVERLAP ERROR")` debug, dual overlap-check dead code.
- SPA as a second product with Zustand + Frappe session.
- Live GPS (they do not have it; Nominatim + Leaflet pins only).

---

## 5. Bring from Odoo 19 Community

License: **LGPLv3**. Do not vendor addons. This tree has **no** `industry_fsm` (Enterprise). Community **repair + stock + fleet + sale_project + maintenance** only.

### 5.1 Repair line types: add / remove / recycle — as *intent*, not stock moves

| | |
|--|--|
| **Source** | `addons/repair/models/stock_move.py` `repair_line_type`: `add` / `remove` / `recycle`; location map `MAP_REPAIR_LINE_TYPE_TO_MOVE_LOCATIONS_FROM_REPAIR`. `repair.py` states draft → confirmed → under_repair → done |
| **Car Atom** | Field parts: **fit (CONSUME from van)**, **remove from vehicle** (customer keep / scrap / return-to-WH), optional recycle. Implement as **movement reason + destination**, not `stock.move`. Skip `picking_type_id` / repair locations warehouse graph |
| **Who** | Technician (record), admin (stock + audit) |
| **Complexity** | M |

### 5.2 Parts availability before the visit (reserve idea)

| | |
|--|--|
| **Source** | `repair.py` `_compute_parts_availability`: for confirmed/under_repair, compare `forecast_availability` vs qty → Available / Not Available / Exp date; `late` if forecast after `schedule_date`. `action_assign` → `move_ids._action_assign()` (reservation). `under_warranty` zeros customer sale on add lines |
| **Car Atom** | On **assign technician / confirm booking**: for GS included SKUs + repair add-on SKUs, check **van qty** (and WH if transfer-before-dispatch). States: **on van / in WH (transfer needed) / short**. Optional **soft reserve** on `VAN_*` until visit cancel — **not** Odoo quant reservation / picking. Warranty: Car Atom commercial policy, not `under_warranty` float |
| **Who** | Admin dispatcher (block or warn); technician (see kit vs van) |
| **Complexity** | M–L (needs catalog↔SKU link in §6 first) |

### 5.3 Vehicle service history fields (customer car, not company fleet HR)

| | |
|--|--|
| **Source** | `addons/fleet/models/fleet_vehicle_log_services.py`: vehicle, service type, date, amount, vendor, notes, **odometer** (cannot empty), states new/running/done/cancelled |
| **Car Atom** | Append-only **vehicle history** on garage vehicle: odometer at visit, service type (GS / repair slug), cost from invoice, notes. Odoo fleet is **company cars + fleet manager** — remap to **customer vehicle**, not HR fleet |
| **Who** | Technician (odometer), customer (history), admin |
| **Complexity** | M |

### 5.4 Catalog “what this SKU does in the flow” vs spawning projects

| | |
|--|--|
| **Source** | `addons/sale_project/models/product_template.py` `service_tracking`: Task / Project & Task / Project / no — **spawns project.task** |
| **Car Atom** | Already have `flow_policy` on offerings. Bring only the **idea**: offering config drives JobCard/Advisor/Visit shape. **Do not** spawn Odoo projects/tasks |
| **Who** | Catalog admin |
| **Complexity** | S (documentation / CMS; code exists) |

### 5.5 Preventive copy-on-done (not GS booking)

| | |
|--|--|
| **Source** | `addons/maintenance/models/maintenance.py` `write`: when stage is done and `maintenance_type == preventive` and `recurring_maintenance`, `copy()` next `schedule_date` |
| **Car Atom** | **P3** reminder for “next GS in 6 months” — customer notification + optional hold, not internal asset PM kanban |
| **Who** | Customer + admin CRM later |
| **Complexity** | L — **P3** |

### 5.6 Explicitly skip from Odoo

- Entire `stock.picking` / WMS / lots-as-warehouse-UI / `_action_assign` as product UX.
- Repair order as a parallel lifecycle next to JobCard.
- Enterprise FSM (`industry_fsm` absent here anyway).
- Company fleet module as the garage.
- `service_tracking` project spawning.

---

## 6. General Service and repair parts inventory (in scope)

Admin inventory for **GS included parts** and **repair add-on parts** is a first-class product need. The OSS refs supply **ideas**; Car Atom already has the **ledger**.

### 6.1 The gap (Car Atom)

| Layer | What exists | What is missing |
|-------|-------------|-----------------|
| Catalog GS | `IncludedServiceItem.label` only (`backend/app/db/models.py`) | `sku_id` (or kit table: offering → qty per SKU) |
| Catalog repair | `RepairOffering` price + `icon_key`; seed tuples like `("cabin-filter", …, "part-filter")` | FK to `inventory_skus` |
| Inventory | `InventorySku` + locations `WH`/`VAN_*`; movements RECEIVE/CONSUME/TRANSFER/ADJUST | Wiring from offering → SKU |
| Admin UI | `apps/admin/app/(ops)/inventory/page.tsx` SKU grid | **Job kit view**: for this GS / repair, expected SKUs, WH vs van, short list |
| Technician | `parts.tsx` free-text `sku_code` | Picker from visit kit + van qty; CONSUME on confirm |

Demo SKUs in `backend/app/modules/inventory/seed.py` (`CF-HON-01` Cabin filter, `R134A-250`, `COND-CITY`, `PAG-250`) sit next to catalog “Cabin filter” / “AC gas refill” with **no join**.

### 6.2 What to bring (composite)

| Idea | From | Reimplement as |
|------|------|----------------|
| Labour vs parts on the same order | Beveren `is_service` vs spare | Kit lines: labour (no stock) vs part lines (SKU + qty) |
| Skip service lines in stock | Beveren `make_stock_entry` skips `is_service` | CONSUME only SKU lines; never “consume” labour |
| Add / remove / recycle | Odoo `repair_line_type` | Movement reason on CONSUME / return / scrap |
| Available / expected / late | Odoo `parts_availability_state` | Van vs WH vs short **before dispatch** |
| Reserve | Odoo `action_assign` | Soft hold qty on van until visit cancel — optional P1 |
| Field consume | Constitution §35 + existing CONSUME | Tech picker posts CONSUME; admin sees movement on job |
| OFP | — | **Nothing** for stock (no schema) |

### 6.3 Admin screens to add (product, not ERP)

1. **SKU master** (exists) — keep; add “used by offerings” column.
2. **Offering kit editor** — GS included items and repair offerings: SKU, qty, optional alternate SKU.
3. **Job / visit kit** — expected vs consumed vs short; WH vs assigned van.
4. **Dispatch short-van** — warn or block assign when kit not on van (Odoo availability idea).
5. **Transfer WH → VAN** before the run (already TRANSFER; needs a “stage this visit’s kit” action).

### 6.4 What “never ERP stock” still allows

Allowed: locations, qty, movements, job traceability, van picker, short-van on assign.

Not allowed: pickings, backorders, putaway, lots-as-WMS, Stock Entry / DN / PO pipelines, repair order warehouse graph.

---

## 7. Scheduling and job cards (improve only if it helps)

### Keep

- Slot = **capacity** (constitution §29–32). Hold, then transactional consume.
- Separate machines; composed customer progress label.
- Visit overlap predicate; extend with 409 + named techs (OFP/Beveren UX).

### Bring if it helps users

| Change | Helps | Source pattern |
|--------|-------|----------------|
| Dispatch lanes + unassigned | Dispatcher sees the afternoon | OFP board + Beveren unassigned orders |
| DnD assign onto **hold/assign API** | Faster board without lying about capacity | OFP DnD **on** Car Atom APIs |
| Closeout worklist | Office finishes after van | OFP closeout filters, remapped |
| Actual vs scheduled times on card | Ops coaching, customer “on the way” honesty | Beveren actual start/finish |
| Kit availability on card | Don’t send a van without filters | Odoo availability, Car Atom stock |
| Week calendar | Optional density | OFP/Beveren calendar — **after** lanes |

### Do not bring

- Replacing holds with “the bar is the booking.”
- Flattening JobCard into OFP `lead/scheduled/in_progress`.
- Auto-dispatch / live GPS (constitution deferral; Beveren map is static pins).
- Recurring PM copy-on-done as the GS booker (Odoo maintenance).

---

## 8. Technician help and admin tracking of technicians

User intent: help technicians in the field; let admin see who is doing what. Not live GPS unless constitution changes.

| Bring | Source | Car Atom shape |
|-------|--------|----------------|
| Today list = assigned visits only | OFP tech job list `assignedTo` | Already visit-scoped; keep |
| Start / complete as explicit actions | Beveren Desk start_work/complete_work; OFP status PATCH | Technician visit actions + actual timestamps |
| Kit picker vs free-text | Gap + Odoo add-lines | Van SKUs for this visit’s kit |
| On-duty / ping | Car Atom dossier already has ping/on_duty/van | Surface on dispatch board (not a new ERP HR module) |
| Conflict banners on board | OFP | Admin sees double-book before save |
| Static job map | Beveren Leaflet | Pins at customer addresses; placeholder replacement for `DispatchMapPlaceholder` |
| Do not bring OFP mobile as the tech product | OFP `App.tsx` has no start/complete/photo/parts UI | Car Atom technician Expo stays the execution app |

SOS remains stub until a real dispatch protocol exists — do not copy OFP/Beveren emergency models blindly.

---

## 9. Never bring (license + product)

### License / legal

- Any verbatim or translated copy of AGPL (OFP, Beveren) or LGPL (Odoo) source into Car Atom.
- Vendoring Odoo addons or Frappe apps.
- “Clean room” paste of `ScheduleCalendar.tsx` (1754 lines) or `service_order.py` stock helpers.

### Product / architecture

- Generic FSM as the customer app.
- ERPNext / Odoo **stock picking, Stock Entry, DN, PO, PR, PI**.
- Workshop Product Location / vendor movement as the van model.
- Flattened job status machine.
- Typed name as signature / consent.
- Live GPS tracking and auto-dispatch (deferred by constitution).
- Company fleet HR as customer garage.
- Odoo project/task spawning from `service_tracking`.
- AMC Contract / over-budget as consumer GS MVP.
- Second Desk (Frappe) or second SPA (Beveren schedule) as a Car Atom app — fold ideas into existing admin Next.js.

### Implementation anti-patterns seen in refs

- Debug `print` overlap handlers (Beveren).
- Client-only closeout filters without server lists (OFP) — Car Atom should **query** machines.
- Calendar PATCH that sets `jobs.status=scheduled` without capacity (OFP) — would break holds.

---

## 10. Suggested order (when product work starts)

This audit does **not** implement these. Order is for a later phase.

### P0 — dispatcher and office (highest leverage vs refs)

1. Dispatch board: unassigned + per-tech lanes; overlap 409 + banners; assign via existing visit/hold APIs.
2. Closeout worklist: completed visit / unpublished estimate / missing invoice / missing payment / missing consume.
3. Catalog ↔ SKU for GS included items and repair offerings (unlocks everything in §6).

### P1 — field parts and honest times

4. Visit kit on admin + technician van picker; CONSUME on confirm (no free-text as the happy path).
5. Short-van warning on assign (Odoo availability idea).
6. Actual start/finish on admin job card; scheduled vs actual.
7. Real consent already exists — add **drawn/typed signature capture** only if legal/ops need evidence beyond estimate accept (do not copy OFP `signatureName`).

### P2 — density and maps

8. Grid / day calendar **on** holds (not instead of).
9. Static job-pin map for the day’s visits.
10. Mass assign for a time window (Beveren mass-actions), still per-visit overlap + capacity.
11. Add/remove/recycle reasons on part lines.
12. Vehicle odometer + service history on garage vehicle.

### P3 — later / maybe never

13. Soft stock reserve until visit cancel.
14. Estimate option packages.
15. Recurring “next GS” reminder (maintenance copy-on-done idea).
16. Corporate AMC budgets.
17. Live GPS / auto-dispatch (needs constitution ADR).
18. Gantt as a third schedule view.

---

## 11. Pass 1 conclusions (still valid)

| Question | Answer |
|----------|--------|
| Best dispatcher UX to learn from | **OFP** lanes + conflict + closeout |
| Best parts-on-order thinking | **Beveren** service vs spare; **Odoo** add/remove/availability — both as ideas on Car Atom CONSUME/TRANSFER |
| Best vehicle history fields | **Odoo fleet log** remapped to customer cars |
| Who already wins consumer + estimates + holds + tech app | **Car Atom** |
| Who has field parts stock | **Car Atom ledger** (disconnected from catalog). OFP: none. Beveren/Odoo: ERP WMS — do not copy |

---

## 12. Evidence index (for later implementers)

| Topic | Path |
|-------|------|
| OFP overlap API | `openfieldpro-ofp-monorepo/apps/api/src/routes/appointments.ts` |
| OFP client conflicts | `apps/web/lib/dispatch-conflicts.ts` |
| OFP dispatch board | `apps/web/app/dispatch/page.tsx` |
| OFP calendar | `apps/web/.../ScheduleCalendar.tsx` |
| OFP closeout | `apps/web/app/closeout/page.tsx` |
| OFP tech auth | `apps/api/src/.../operational-authorization.ts`, `jobs.ts` |
| Beveren totals | `.../doctype/service_order/service_order.py` `calculate_service_totals` |
| Beveren overlap / status | `.../doctype/service_appointment/service_appointment.py` |
| Beveren start/complete | `.../service_appointment.js` |
| Beveren SPA | `schedule/src/pages/schedule/schedule.tsx`, `maps-view.tsx`, `mass-actions-dropdown.tsx` |
| Beveren unassigned | `.../api/schedule.py` |
| Odoo line types | `odoo-19.0/addons/repair/models/stock_move.py` |
| Odoo availability | `addons/repair/models/repair.py` `_compute_parts_availability`, `action_assign` |
| Odoo fleet log | `addons/fleet/models/fleet_vehicle_log_services.py` |
| Odoo service_tracking | `addons/sale_project/models/product_template.py` |
| Odoo PM copy | `addons/maintenance/models/maintenance.py` `write` |
| Car Atom overlap | `backend/app/modules/visits/repository.py` `overlapping` |
| Car Atom inventory | `backend/app/modules/inventory/` |
| Car Atom catalog gap | `IncludedServiceItem`, `RepairOffering` in `backend/app/db/models.py` |
| Car Atom tech parts | `apps/technician/app/(tech)/visits/[id]/parts.tsx` |
