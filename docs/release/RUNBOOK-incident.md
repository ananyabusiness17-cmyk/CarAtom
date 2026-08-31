# RUNBOOK — Incident

Timezone for comms: **Asia/Kolkata**. Do not paste secrets, JWTs, or raw phone numbers into chat or tickets.

## Severity

| Sev | Example | Response |
|-----|---------|----------|
| SEV1 | Payments broken; suspected data leak | Immediate; all-hands |
| SEV2 | Worker down >15 min; bookings blocked | 30 minutes |
| SEV3 | Push delayed; non-critical UI | Next business day |
| SEV4 | Cosmetic | Backlog |

## First 15 minutes

1. Declare severity in the ops channel
2. Check `https://api.caratom.in/health` (or staging equivalent)
3. Railway: api logs, worker logs, Redis connected
4. Razorpay dashboard: webhook delivery failures
5. Admin undelivered notifications queue (`/notifications/undelivered`)
6. Decide: rollback ([RUNBOOK-rollback.md](./RUNBOOK-rollback.md)) vs forward fix

## Razorpay outage

- Customers: “Payment is delayed. Your booking is held. We will confirm when the bank responds.”
- Do not retry client checkout in a loop; server orders are idempotent
- When Razorpay recovers: replay webhooks ([RUNBOOK-payment-webhook-replay.md](./RUNBOOK-payment-webhook-replay.md))
- Reconcile ledger vs Razorpay dashboard before closing SEV1

## Worker down

- API continues to accept bookings; outbox rows accumulate
- Restart worker service; confirm cron `outbox_dispatcher` runs
- If Redis is down, worker cannot claim outbox — restore Redis first

## Database unreachable

- Health `"database":"unavailable"` — do not migrate
- Check Supabase status and pooler URL (`?sslmode=require`)
- Fail closed: no stub auth in production (`ENV=production`)

## Suspected breach (India DPDP)

- SEV1. Preserve logs; do not wipe
- Internal decision SLA: **72 hours** from detection ([LEGAL-india-launch-pack.md](./LEGAL-india-launch-pack.md))
- Notify Data Protection Board and affected principals only after legal counsel
- Template customer mail is in the legal pack — **engage counsel before sending**

## On-call

Org process (names not stored in git):

| Role | Coverage |
|------|----------|
| Primary | Assigned in ops wiki |
| Secondary | Assigned in ops wiki |

Tabletop: walk this document with engineering + ops before first production traffic.

| Date | Tabletop done | Notes |
|------|---------------|-------|
| | pending | |
