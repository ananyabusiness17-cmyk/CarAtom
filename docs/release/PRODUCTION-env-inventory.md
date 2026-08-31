# Production environment inventory

Names only. **No secret values in git.** Rotate from staging; never reuse staging secrets in production.

Webhook URL: `https://api.caratom.in/v1/payments/webhook/razorpay`

OTP rate limits are configured in the **Supabase Auth** dashboard (phone OTP). FastAPI does not expose `/v1/auth/*`.

## Backend (Railway api + worker)

| Variable | Service | Store | Owner | Rotation |
|----------|---------|-------|-------|----------|
| `ENV` | both | Railway | Eng | n/a (`production`) |
| `API_VERSION` | api | Railway | Eng | release |
| `DATABASE_URL` | both | Railway | Eng | with project |
| `REDIS_URL` | both | Railway (internal) | Eng | with plugin |
| `SUPABASE_URL` | both | Railway | Eng | project |
| `SUPABASE_ANON_KEY` | api | Railway | Eng | dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | both | Railway | Eng | 90 days |
| `SUPABASE_JWT_AUDIENCE` | api | Railway | Eng | n/a (`authenticated`) |
| `CORS_ORIGINS` | api | Railway | Eng | when admin host changes |
| `RAZORPAY_KEY_ID` | api | Railway | Finance | live vs test |
| `RAZORPAY_KEY_SECRET` | api | Railway | Finance | 90 days |
| `RAZORPAY_WEBHOOK_SECRET` | api | Railway | Finance | on live switch |
| `RAZORPAY_MODE` | api | Railway | Finance | `live` after sign-off |
| `INVOICE_GSTIN` | api/worker | Railway | Finance | if GSTIN changes |
| `INVOICE_LEGAL_NAME` | api/worker | Railway | Finance | if entity changes |
| `INVOICE_SAC` | api/worker | Railway | Finance | if SAC changes |
| `EXPO_ACCESS_TOKEN` | worker | Railway | Eng | Expo account |
| `SMS_PROVIDER` | worker | Railway | Eng | `fake` until DLT |
| `SMS_API_KEY` | worker | Railway | Eng | 90 days |
| `SMS_SENDER_ID` | worker | Railway | Eng | DLT |
| `SMS_TEMPLATE_ID` | worker | Railway | Eng | DLT |
| `WHATSAPP_PROVIDER` | worker | Railway | Eng | `fake` until templates |
| `WHATSAPP_*` | worker | Railway | Eng | Twilio |
| `LOG_LEVEL` | both | Railway | Eng | `info` |
| `STAGING_LINK_BASE` | worker | Railway | Eng | prod: `https://app.caratom.in/l` |

## Clients (EAS / Next)

| Variable | App | Store | Notes |
|----------|-----|-------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | mobile | EAS profile env | `https://api.caratom.in` at production build |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | EAS secrets | prod project |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | EAS secrets | public by design |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | customer | EAS secrets | key id only |
| `EXPO_PUBLIC_LEGAL_BASE_URL` | customer | EAS / example | `https://admin.caratom.in` |
| `NEXT_PUBLIC_API_BASE_URL` | admin | Railway | `https://api.caratom.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | admin | Railway | prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | admin | Railway | public |
| `NEXT_PUBLIC_ENV` | admin | Railway | `production` (no STAGING banner) |

## Razorpay webhook IPs

Fill after live mode (Razorpay docs, verify current list): ________

## Gitleaks

`gitleaks detect --source . --verbose` on `main` must be clean. Service role must never appear in mobile/web bundles (`pre-store-build-check.mjs` greps source).
