# CARATOM Technician

Field execution app (`fieldVisit`): today queue, read-only job card, navigate/check-in, inspection or service, parts, exception, QC, and offline sync.

```powershell
pnpm --filter @caratom/technician start
```

Metro runs on port **8082**. Scan the QR with Expo Go (SDK 52).

Copy `.env.example` to `.env`. Never put `SUPABASE_SERVICE_ROLE_KEY` in this app. iOS push needs an EAS development build; Expo Go is enough for most field flows. `eas.json` channels: development / preview / production. Do not run live `eas update` until an Expo project ID exists.

Demo technician: **Imran** · `+91 99000 11001`. Seed first:

```powershell
cd backend
uv run python scripts/seed_phase06_demo.py
```
