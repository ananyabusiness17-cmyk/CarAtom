# CARATOM Admin Mobile

Expo Router app for sales advisor callbacks (`adm-01`–`adm-04`) and Phase 10 field ops lite: Jobs board, dispatch assign, override lite, people, and admin-web deeplinks.

Phone OTP must resolve to `profiles.role = admin`. A customer or technician token is rejected at the ops gate (fail closed).

```powershell
pnpm --filter @caratom/admin-mobile start
```

Metro runs on port **8083**. Scan the QR code with Expo Go (SDK 52).

Copy `.env.example` to `.env`. Never put `SUPABASE_SERVICE_ROLE_KEY` in this app. Notifications live on a separate screen from the advisor inbox. iOS push needs an EAS development build. `eas.json` channels: development / preview / production.

Public env (names as used in code):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | FastAPI origin |
| `EXPO_PUBLIC_SUPABASE_URL` | Auth |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Auth |
| `EXPO_PUBLIC_ADMIN_WEB_URL` | Allowlisted “Open in web” base |

Backend demo rows (JC-1015 unassigned, JC-1042 Inspecting/Imran, JC-0991 Kavya, Dev off duty):

```powershell
cd backend
uv run python -m app.scripts.seed_phase10_demo
```

Without a real admin Supabase user, inbox and board stay empty until you sign in. The customer Service + repair path still completes via `POST /v1/dev/job-cards/{id}/simulate-advisor-estimate`.
