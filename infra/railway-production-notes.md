# Railway production notes

Operator creates project `caratom-prod` **after** Phase 12 in-repo work. Do not put tokens here.

## Services

| Service | Image / start | Public domain | Health |
|---------|---------------|---------------|--------|
| api | `backend/Dockerfile` → `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `api.caratom.in` | `GET /health` 30s |
| worker | same image, `uv run arq app.worker.main.WorkerSettings` | none | process up; Redis |
| redis | Railway Redis plugin | none (private) | plugin |
| admin | `apps/admin/Dockerfile` standalone | `admin.caratom.in` | HTTP 200 `/login` |

Replicas: 1 each at MVP. Restart policy `ON_FAILURE`.

## Deploy order

`alembic upgrade head` (direct DB URL) → api → worker → admin.

Zero-downtime: do not run Alembic inside the API process.

## Custom domains

CNAME `api` and `admin` to Railway. TLS via Railway. Verify:

```powershell
curl -I https://api.caratom.in/health
curl -s -o NUL -w "%{http_code}" https://admin.caratom.in/
```

`app.caratom.in` should serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`. MVP: CNAME `app` to the **admin** service (those routes ship with admin web).

## Monitoring (MVP = Railway logs)

Configure (operator):

- Deploy notifications on failed deploy
- Healthcheck failure → restart + notify
- Alert if worker not connected to Redis
- Admin undelivered outbox / dead-letter: check `/notifications/undelivered` daily; threshold is an ops wiki number (e.g. >20 DEAD_LETTER)

GlitchTip/Sentry is post-MVP debt.

## Nixpacks fallback

If Docker is not used, set start commands above in the Railway UI. Prefer the Dockerfiles in this repo.
