# CARATOM release operations

Phase 12 in-repo production readiness. **Live cloud projects, store submission, and git tag `v1.0.0` are operator steps after accounts exist.** This folder is the ops onboarding index.

Read order for ops:

1. This README
2. [RUNBOOK-incident.md](./RUNBOOK-incident.md)
3. [RUNBOOK-private-app-distribution.md](./RUNBOOK-private-app-distribution.md)
4. [PRODUCTION-env-inventory.md](./PRODUCTION-env-inventory.md) (access-controlled in production)
5. [LEGAL-india-launch-pack.md](./LEGAL-india-launch-pack.md)

## Launch split

| Surface | Distribution |
|---------|----------------|
| Customer app | Public App Store + Google Play |
| Technician app | Private only (EAS internal / ad hoc). Never a public store listing. |
| Admin-mobile | Private only. Ops devices. |
| Admin web + API + worker | Railway + Supabase (operator creates projects after this phase) |

## Runbooks

| Document | When to use |
|----------|-------------|
| [RUNBOOK-deploy.md](./RUNBOOK-deploy.md) | Promote staging → production |
| [RUNBOOK-rollback.md](./RUNBOOK-rollback.md) | Railway / Alembic rollback |
| [RUNBOOK-incident.md](./RUNBOOK-incident.md) | SEV1–SEV4, Razorpay outage, worker down |
| [RUNBOOK-backup-restore.md](./RUNBOOK-backup-restore.md) | Supabase backup drill |
| [RUNBOOK-payment-webhook-replay.md](./RUNBOOK-payment-webhook-replay.md) | Razorpay webhook replay |
| [RUNBOOK-eas-update-rollback.md](./RUNBOOK-eas-update-rollback.md) | OTA JS rollback |
| [RUNBOOK-private-app-distribution.md](./RUNBOOK-private-app-distribution.md) | Technician + admin-mobile install |

## Store and legal

| Document | When to use |
|----------|-------------|
| [STORE-app-store-checklist.md](./STORE-app-store-checklist.md) | Apple submission |
| [STORE-play-store-checklist.md](./STORE-play-store-checklist.md) | Google Play submission |
| [LEGAL-india-launch-pack.md](./LEGAL-india-launch-pack.md) | DPDP notice, terms, grievance, GST |

## Environment

- Names only: [PRODUCTION-env-inventory.md](./PRODUCTION-env-inventory.md)
- Examples: root [`.env.production.example`](../../.env.production.example), [`backend/.env.production.example`](../../backend/.env.production.example)
- Railway notes: [`infra/railway-production-notes.md`](../../infra/railway-production-notes.md)

**Never commit production `.env` values.** Secrets live in Railway / Supabase / EAS secret stores.

## Production URLs (after DNS)

| Surface | URL |
|---------|-----|
| API | `https://api.caratom.in` |
| Health | `https://api.caratom.in/health` |
| Admin web | `https://admin.caratom.in` |
| Legal | `https://admin.caratom.in/legal/privacy` |
| Razorpay webhook | `https://api.caratom.in/v1/payments/webhook/razorpay` |
| Universal links | `https://app.caratom.in/.well-known/apple-app-site-association` |

Until DNS exists, use the staging hostnames in the inventory.

## Messaging launch fallback

Until India DLT templates and WhatsApp production templates are approved: **push + in-app only**. Keep `SMS_PROVIDER=fake` and `WHATSAPP_PROVIDER=fake` (see [ADR-011](../architecture/decisions/ADR-011-notification-providers.md)).

## Sign-off template

Copy into `audit-evidence/` when live cutover is done. Do not fabricate signatures.

```markdown
## Production cutover — [DATE TIME IST]

**Scope:** Alembic migrate + Railway deploy api/worker/admin
**Rollback owner:** [name]
**Backup timestamp:** [T0]
**Staging E2E:** [pass/fail + link]
**Expected downtime:** [none / X min]
**Verification:** node scripts/release/prod-smoke.mjs + manual OTP login

Engineering: ________  Product/Ops: ________  Finance: ________
```

## Audit evidence

Templates in [audit-evidence/](./audit-evidence/). Live TLS, store “Ready for Sale”, backup drill, and ₹1 Razorpay live tests are **BLOCKED** until operator accounts exist. Do not store PII in this folder.
