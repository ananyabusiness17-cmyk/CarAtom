# Walkthrough E2E

Customer native apps have no Expo web target. These specs hit the **API** (`E2E_BASE_URL`) plus admin web (mocked, same as `e2e/admin`). Technician and admin-mobile use the device sheets in this folder.

```powershell
# API must be up for authenticated journeys:
$env:E2E_BASE_URL = "http://127.0.0.1:8000"
# Optional JWT from staging/prod Supabase:
# $env:E2E_TOKEN = "..."
pnpm test:e2e:walkthrough
```

Staging:

```powershell
$env:E2E_BASE_URL = "https://api-staging.caratom.in"
$env:E2E_ADMIN_URL = "https://admin-staging.caratom.in"
$env:E2E_TOKEN = "<staging customer JWT>"
pnpm test:e2e:walkthrough
```

Without a running API, health checks skip. Without `E2E_TOKEN`, booking posts skip. Catalog/home still runs when the API is up.

Backend pytest remains the full GS / repair / one-man / SOS contract suite (`backend/tests/integration/`).
