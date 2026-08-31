# ADR-011 — Notification providers

- **Status:** Accepted
- **Date:** 2026-08-31
- **Phase:** 11 — Notifications, integrations & platform hardening
- **Resolves:** Open question 10 in [`docs/architecture/19-open-questions.md`](../19-open-questions.md)

## Decision

| Channel | Provider | Runtime |
|---------|----------|---------|
| Push | Expo Push API v2 | Worker only |
| SMS | MSG91 | Worker only; fake in development/CI |
| WhatsApp | Twilio WhatsApp API (sandbox) | Worker only; fake in development/CI |
| In-app | `notifications` table | API transaction |

Default local/CI: `SMS_PROVIDER=fake`, `WHATSAPP_PROVIDER=fake`. Real providers require `FORCE_REAL_MESSAGING=true` (or non-development `ENV`) plus secrets.

## Context

Phase 11 must deliver durable push, SMS, and WhatsApp without calling providers from FastAPI routers. India (+91) is the launch geography. WhatsApp production template approval and SMS DLT registration at scale are Phase 12.

## Environment variables

| Name | Where | Notes |
|------|-------|-------|
| `EXPO_ACCESS_TOKEN` | Worker + API (optional) | Higher Expo Push rate limits |
| `SMS_PROVIDER` | Worker | `fake` or `msg91` |
| `SMS_API_KEY` | Worker only | MSG91 auth key |
| `SMS_SENDER_ID` | Worker | DLT-approved sender (6 chars) |
| `SMS_TEMPLATE_ID` | Worker | Optional DLT template id |
| `WHATSAPP_PROVIDER` | Worker | `fake` or `twilio` |
| `WHATSAPP_TWILIO_ACCOUNT_SID` | Worker only | |
| `WHATSAPP_TWILIO_AUTH_TOKEN` | Worker only | |
| `WHATSAPP_TWILIO_FROM` | Worker | `whatsapp:+1415…` sandbox number |
| `FORCE_REAL_MESSAGING` | Worker | `true` to use real adapters in development |
| `FAKE_MESSAGING_FAIL_RATE` | Tests | `0.0`–`1.0` retryable failure injection |
| `NOTIFICATION_MAX_ATTEMPTS` | Worker | Default `8` |
| `OUTBOX_BATCH_SIZE` | Worker | Default `50` |

Never commit secrets. Never expose SMS/WhatsApp keys to Expo or Next.js clients.

## India SMS (DLT)

MSG91 is the SMS vendor because DLT sender IDs and template IDs are required before production SMS at scale in India. Phase 11 uses sandbox/fake SMS. Phase 12 documents DLT registration in `docs/release/LEGAL-india-launch-pack.md`. **Until DLT entity + templates are registered, production stays `SMS_PROVIDER=fake` and `WHATSAPP_PROVIDER=fake` (push + in-app only).** Do not send production SMS without DLT.

## WhatsApp fallback

If Twilio WhatsApp sandbox is unavailable, deliver `advisor_revised` and `payment_due` on **push + SMS only**. Channel policy already allows this by omitting WhatsApp when `WHATSAPP_PROVIDER=fake`.

## Retention (Phase 12 worker job `retention_purge`)

| Table | Proposed retention |
|-------|-------------------|
| `notifications` | 90 days read; 180 days unread |
| `outbox_events` | 30 days after SUCCEEDED; 1 year DEAD_LETTER |
| `device_push_tokens` | Revoke unused 90 days |
| `analytics_events` | 90 days (warehouse export post-MVP) |

## Alternatives considered

- Twilio SMS: extra India DLT friction vs MSG91.
- Meta Cloud API for WhatsApp: heavier app-review path; Twilio sandbox is enough for Phase 11.
- Firebase Cloud Messaging parallel to Expo Push: forbidden by Phase 11 scope.

## Consequences

- Domain code calls `NotificationService.enqueue_intent()` only.
- Worker is the only runtime that calls Expo, MSG91, or Twilio.
- Production SMS without DLT registration is not authorized (Phase 12).
