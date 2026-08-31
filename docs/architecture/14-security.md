# 14 — Security and privacy

## Authentication

Use Supabase Auth phone OTP/session. FastAPI validates JWT signature, issuer, audience, expiry, and subject through cached JWKS. The backend creates/updates a Profile after verified identity. No second auth database or password flow.

## Authorization

Every protected handler checks role and resource ownership/assignment in an application service:

- customers can read/write only their own permitted resources;
- technicians can access only assigned visits and their own field evidence/location;
- admins can operate all resources but audited actions remain visible;
- webhook endpoints use provider signature verification rather than user JWT.

Do not rely on hidden routes, client role flags, or Supabase table exposure for authorization.

## Financial integrity

- Prices/totals/discounts/taxes are recomputed server-side.
- Estimate acceptance uses version/hash and expected total.
- Booking requires a current accepted estimate and valid hold.
- Razorpay signatures/events are verified, deduplicated, and reconciled.
- No card credentials or secrets are stored.
- Offline payments identify method, actor, reference/note, and audit reason.

## Data protection

Private Storage buckets and signed URLs protect media/PDFs. Apply MIME, size, checksum, and ownership checks. Redact phone, address, registration number, concerns, provider payloads, and media paths from ordinary logs. Restrict admin exports and record export activity.

## Input and API security

Use Pydantic validation, SQL parameterization through SQLAlchemy, request-size limits, rate limits on OTP/preview/search/payment endpoints, idempotency keys, CORS allowlists, HTTPS, and secure headers. Validate uploaded files and never trust client filenames.

## Admin safety

Overrides, refund/void, user disable, inventory adjustment, invoice edits, and booking cancellation inside policy cutoff require confirmation plus non-empty reason. Audit stores actor, role, resource, command, before/after summary, reason, request id, and timestamp.

## Secrets and operations

Secrets exist only in Railway/Supabase/EAS secret stores. Rotate provider keys. Separate public app config from secrets. Use least-privilege database/storage keys; service-role credentials never ship in clients.

## Privacy lifecycle

Define retention and deletion behavior for account data, media, location pings, notifications, support notes, and financial records before production. Financial/audit obligations may require retention after account deletion; anonymize personal fields where legally permitted.

