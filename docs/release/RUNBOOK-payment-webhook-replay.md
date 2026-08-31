# RUNBOOK — Razorpay webhook replay

Production webhook URL (do not invent a second path):

`https://api.caratom.in/v1/payments/webhook/razorpay`

Staging equivalent: `https://api-staging.caratom.in/v1/payments/webhook/razorpay`

## Rules

- HMAC signature required. Invalid signature → 401. Do not process the body.
- Duplicate `payment.captured` events must insert **one** `payment_events` row (idempotent).
- Replay from Razorpay dashboard after a 5xx or missed delivery.
- Live keys stay in Railway only. Client may hold `RAZORPAY_KEY_ID` for checkout, never the secret.

## Replay on staging (before live)

1. Razorpay dashboard (test mode) → Webhooks → send the failed event again
2. Confirm API 200
3. Confirm no second captured payment / no double invoice allocation
4. Admin payments page totals match Razorpay

## After live cutover

Finance signs a **₹1** capture + refund. File a redacted receipt in `audit-evidence/` (mask PAN/phone). **BLOCKED until Razorpay live account exists.**

## IP allowlist

Document Razorpay webhook source IPs in [PRODUCTION-env-inventory.md](./PRODUCTION-env-inventory.md) when live mode is enabled. Railway must not expose Redis.
