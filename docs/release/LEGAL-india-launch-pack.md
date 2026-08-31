# India legal launch pack

**Not legal advice.** Replace bracketed placeholders with the registered entity before publishing. Engage counsel before launch (Phase 12 §24). Primary jurisdiction: India (Karnataka first). See [`Vibe code principles/LEGAL-APPLICABILITY.md`](../../Vibe%20code%20principles/LEGAL-APPLICABILITY.md) §7 (DPDP Act 2023).

Published routes (admin web, unauthenticated):

- `/legal/privacy`
- `/legal/terms`
- `/legal/grievance`

Customer app links these via `EXPO_PUBLIC_LEGAL_BASE_URL` (production: `https://admin.caratom.in`).

## Entity placeholders (operator)

| Field | Placeholder until counsel fills |
|-------|--------------------------------|
| Legal name | `[LEGAL ENTITY NAME]` |
| Registered office | `[REGISTERED OFFICE, BENGALURU]` |
| GSTIN | Set `INVOICE_GSTIN` in Railway — never invent a GSTIN in git |
| SAC (motor vehicle maintenance, verify) | `INVOICE_SAC` default `998729` pending finance |
| Grievance officer | `[NAME]`, `grievance@caratom.in` |
| Support | `support@caratom.in` |

## DPDP collection notice (OTP)

Shown on the customer login screen before OTP is sent:

> By continuing, you agree to our Terms and Privacy Policy.

Lawful basis: consent for account + service fulfilment. +91 only at MVP. Children: CARATOM is not directed at persons under 18.

## Data we process (honest inventory)

| Data | Why | Retention (production jobs) |
|------|-----|------------------------------|
| Phone | Account, OTP, job contact | Account life; erasure request via grievance mail |
| Name, address, vehicle | Fulfil doorstep service | Account / job life |
| Location pings (technician app) | Arrival / routing | 90 days (worker retention job) |
| Notifications | Service messages | 180 days |
| Payments | Razorpay; we do not store PAN | Financial records 7 years (invoices/audit) |
| Visit media | Evidence | 2 years post job closure (Storage lifecycle — operator) |

Clients never write financial tables via PostgREST. Service role is backend/worker only.

## Data principal rights (MVP path)

Access / correction: in-app profile + support.  
Erasure: Profile → Request account deletion → mailto grievance (ops fulfils; not an automated hard-delete of financial invoices).  
Grievance: `/legal/grievance` — acknowledge within a reasonable period.

## Breach

Internal decision SLA **72 hours** from detection. Contacts for the Data Protection Board live in the ops wiki, not git. Customer notification template:

```text
Subject: CARATOM — important notice about your account
We recently detected [high-level description, no exploit detail].
What you should do: [if anything].
Contact: grievance@caratom.in
```

## GST invoice checklist (finance)

- [ ] Legal name on PDF matches GST registration
- [ ] GSTIN from `INVOICE_GSTIN` (not `[TBD]`)
- [ ] SAC/HSN on footer from `INVOICE_SAC`
- [ ] Tax line GST 18% matches implemented `round_tax`
- [ ] IST issue date
- [ ] Place of supply Karnataka at MVP
- [ ] Sample PDF signed by finance (operator; do not commit PII)

**Finance sign-off:** ________  date: ________  **or** documented risk acceptance: ________

## Counsel review

- [ ] Counsel reviewed privacy/terms vs implemented practices
- [ ] **or** documented risk acceptance by engineering lead

## SMS DLT / WhatsApp

Until DLT entity + templates are registered: **push-only / fake SMS-WhatsApp providers** (ADR-011). Do not send production promotional SMS without DLT.
