# Reconnaissance (from source)

## Trust boundaries

- Public: customer app, Razorpay webhooks (HMAC), admin login
- Railway edge: FastAPI + Next admin; worker not exposed
- Data: Supabase Postgres via backend; no client PostgREST financial writes

## Externally intended hosts (after DNS)

`api.caratom.in`, `admin.caratom.in`, `app.caratom.in` (universal links)

## Mobile distribution

- Customer: public stores
- Technician `in.caratom.technician` and admin-mobile `in.caratom.adminmobile`: internal EAS only

## Auth

Supabase phone OTP → JWT. FastAPI JWKS. Production disables `/docs`. Dev simulate gated by `ENV` + `ENABLE_DEV_SIMULATE`.

## Attack-surface notes vs docs

Phase 12 spec named webhook `POST /v1/webhooks/razorpay`. Implemented path remains `POST /v1/payments/webhook/razorpay`. Runbooks use the implemented path.
