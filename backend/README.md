# CARATOM Backend

FastAPI API + ARQ worker. Phase 03: General Service booking (job cards, estimates, slots, bookings) on top of Phase 02 identity and catalog.

## Environment

Copy `.env.example` to `.env`. `SUPABASE_SERVICE_ROLE_KEY` belongs here only — never in client apps.

Identity requires a valid Supabase JWT (`Authorization: Bearer <access_token>`). The Phase 01 `Bearer stub` token is rejected.

Catalog, job cards, estimates, and bookings are read/written through FastAPI only. Do not grant anon PostgREST writes.

Phase 03 slot config:

| Variable | Default | Meaning |
|----------|---------|---------|
| `SLOT_HOLD_MINUTES` | `15` | Hold TTL before `HOLD_EXPIRED` |
| `SLOT_CAPACITY` | `3` | Concurrent bookings per window (global, not per-tech) |
| `OPERATING_HOURS` | `09:00-18:00` | IST windows 9–11 / 11–13 / 14–16 / 16–18 |
| `API_VERSION` | `0.11.0-phase11` | OpenAPI version string |

Rate limiting is a documented stub in this phase (full limits in Phase 12). Idempotency on accept / finalization / slot-holds / book is enforced for 24 hours.

## General Service E2E (gs-01 → gs-10)

Authenticated (or guest until finalization):

1. `POST /v1/job-cards` — `flow_policy=GENERAL_SERVICE`, vehicle context, concerns
2. `POST /v1/job-cards/{id}/price` — total **299900** paise, `advisor_requirement=NOT_REQUIRED`
3. `POST /v1/job-cards/{id}/estimates/{estimateId}/accept` — `Idempotency-Key`
4. `POST /v1/job-cards/{id}/finalization` — JWT required (`401 AUTH_REQUIRED` if guest)
5. `GET /v1/job-cards/{id}/slots?from=&to=`
6. `POST /v1/job-cards/{id}/slot-holds` then `POST /v1/job-cards/{id}/book`
7. `GET /v1/bookings/{id}` — confirmation payload

Repair items are rejected. `CREATE_ADVISOR_CASE` is never emitted on this path.

## Commands

```powershell
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed_catalog_koramangala
uv run python -m app.scripts.seed_phase10_demo
uv run uvicorn app.main:app --reload --port 8000
uv run arq app.worker.main.WorkerSettings
uv run pytest tests/ -v
uv run ruff check .
uv run ruff format --check .
```

The ARQ worker (`uv run arq app.worker.main.WorkerSettings`) runs:

- `health_ping`
- `generate_invoice_pdf`
- `outbox_dispatcher` every 30s (claim `FOR UPDATE SKIP LOCKED`, Expo/SMS/WhatsApp via adapters)
- `notification_reminders` hourly (T-24h / T-2h slot, payment due T+24h)
- `push_receipt_poll` at :05 and :35

Set `SMS_PROVIDER=fake` and `WHATSAPP_PROVIDER=fake` in development. Real MSG91/Twilio/Expo credentials stay in `backend/.env` only. Domain routers never call providers.

Optional admin `POST /v1/admin/dev/simulate-notification` is blocked when `ENV=production`.

Phase 10 admin-mobile demo (JC-1015 unassigned Honda i20, JC-1042 Inspecting/Imran, JC-0991 parts advance/Kavya, Dev off duty):

```powershell
uv run python -m app.scripts.seed_phase10_demo
```

Health always returns HTTP 200 if the process is alive. `database` is `ok` or `unavailable` depending on `SELECT 1`.
