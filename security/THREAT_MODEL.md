# CARATOM threat model

Dated: 2026-08-30. Scope: repository through Phase 7 (including customer Inspection+Repair).

## Assets

- Customer PII: phone, name, addresses, vehicle details, symptoms, inspection photos
- Job-card and visit records, estimates (customer-visible prices vs technician cost)
- Parts-advance payments (`payment_id`, Razorpay order ids)
- Technician evidence photos and location pings
- Admin/advisor notes (must not leak to customers)
- Supabase service-role key, JWT signing (Supabase JWKS), Razorpay secrets
- AI-agent tooling in-repo (Cursor skills, GitHub Actions) that can read the working tree

## Trust boundaries

```
Expo / Next clients  --HTTPS JWT-->  FastAPI
FastAPI               --SQLAlchemy-->  Postgres (no RLS in Alembic)
FastAPI               --service role-->  Supabase Storage (signed upload mint only)
FastAPI               --Nominatim---->  nominatim.openstreetmap.org (fixed URLs)
Clients               --OTP only---->  Supabase Auth (no PostgREST domain queries)
```

Roles live in `profiles.role`, **not** in the JWT `role` claim (`backend/app/core/deps.py`).

Unauthenticated: `/health`, catalog, geo (rate-limited), OpenAPI (development only).
Optional auth: guest job-card UUID flow (GS).
Role-gated: `/v1/technician/*`, `/v1/admin/*`.

## Phase 7 IR surfaces

- Customer: offering, symptoms, photos, findings, parts-advance, visit-1/visit-2 slots
- Backend: `inspection_repair` (findings read, parts-advance orders, **dev** payment capture)
- Threats: IDOR on findings/photos/payment_id; visit-2 booking skipping parts-ready; service-role leak on photo upload

## Threats (STRIDE-style)

| Threat | Example | Mitigation |
|--------|---------|------------|
| Spoofing | Forged JWT | JWKS RS256; audience/issuer checks |
| Tampering | Estimate total mismatch | Server-side amount checks; content hash |
| Repudiation | Missing audit | Job-card events / outbox |
| Information disclosure | Service-role in upload headers | Signed upload URL; never return Bearer service key |
| Denial of service | Unauthenticated Nominatim hammer | Rate limits on `/v1/geo/*` |
| Elevation | Guest minting `role=admin` via `/v1/dev/*` | Env gate + admin JWT; 404 in production |
| Agent tooling | Skills/workflows leaking secrets into logs | Redacted scanners; no secret paste in `security/` |

## Out of scope for this gate

- Replacing application-layer authz with Postgres RLS
- Breaking guest GS UUID access (gs-01→gs-10)
- Blind Expo SDK 52 / FastAPI upgrades
- DAST against production
