# API latency smoke

Measures p50/p95 over 100 iterations for:

- `GET /v1/catalog/home` (public; target p95 &lt; 500ms per architecture doc 17)
- `GET /v1/job-cards/{id}` and `GET /v1/job-cards/{id}/slots` when `SMOKE_TOKEN` and `SMOKE_JOB_CARD_ID` are set

```powershell
node scripts/perf/smoke-api-latency.mjs
```

Optional env: `API_BASE_URL`, `SMOKE_ITERS`, `SMOKE_TOKEN`, `SMOKE_JOB_CARD_ID`.

The catalog pricing path must remain zero external HTTP. This script only times the API from the client.
