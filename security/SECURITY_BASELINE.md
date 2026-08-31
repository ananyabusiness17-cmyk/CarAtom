# CARATOM security baseline

Dated: 2026-08-30.

## Tooling

| Tool | How it runs | Notes |
|------|-------------|--------|
| Semgrep | `pnpm security` / CI `security` job | `--metrics=off`; configs in `.semgrep.yml` plus `p/owasp-top-ten`, `p/python`, `p/javascript`, `p/react`, `p/jwt`, `p/secrets`. Vendor skills under `.cursor/skills` and `.agents/skills` are excluded. |
| Gitleaks | CLI locally; `gitleaks-action` also in CI history | `gitleaks.toml`; `--redact` |
| OSV-Scanner | lockfiles only | Do not blindly bump Expo 52 or FastAPI |
| OWASP ZAP | Optional, local API only | Skip if `/health` is down |
| Trail of Bits skills | `.cursor/skills/` and `.agents/skills/` | Filtered list only (see `skills-lock.json`) |

## Authz model

- Domain data goes through FastAPI only. Supabase JS is OTP/session.
- `profiles.role` is authoritative. JWT `role` is `authenticated`.
- Guest job cards (`profile_id is None`) are reachable by UUID until claimed at finalization.
- Technicians see assigned visits only. Customers see owned (or guest) job cards.
- Media `visit_id`: technician must be assigned; customer must own the job card; admin allowed.
- Parts-advance `payment_id` is resolved then checked with `JobCardService.get_accessible`.

## Secrets model

- `SUPABASE_SERVICE_ROLE_KEY` stays on the backend. Storage signed URLs are minted server-side.
- Expo/Next public env must never include service-role or Razorpay secret.
- `.gitignore` ignores `.env` / `.env.*` except `*.example`.
- Scanners and docs must not print live secret values.

## GitHub Actions

- Workflow `permissions: contents: read` by default.
- Security job uses full checkout (`fetch-depth: 0`) for Gitleaks history.
- Third-party actions are pinned to full commit SHAs (ToB agentic-actions-auditor).
- Do not grant `pull-requests: write` unless a later phase needs it.

## Accepted risks

| ID | Risk | Why accepted | Revisit |
|----|------|--------------|---------|
| ACC-GUEST-UUID | Anyone with a guest job-card UUID can read/update that card until claim | Product-required GS flow (gs-01→gs-10). UUIDs are unguessable; claim at finalization. | If guest window is abused |
| ACC-NO-RLS | Alembic does not enable Postgres RLS | Domain access is FastAPI-only. Never expose PostgREST. Optional later deny-all RLS is defense in depth, not a Phase 9 inventory rewrite. | If PostgREST is ever enabled |
| ACC-OFFLINE-QUEUE | Technician offline queue in AsyncStorage | Not JWTs; operational notes only. Encrypt only if a scanner finding is HIGH. | Phase 6+ offline hardening |
| ACC-GEO-OPTIONAL-AUTH | `/v1/geo/*` remains usable without JWT | Maps must work before login. Mitigated with IP rate limits. | If Nominatim abuse continues |
| ACC-DEV-CAPTURE | `POST /v1/dev/payments/{id}/capture` exists | Development/e2e only. **404 in production.** Caller must still own the job card. | Phase 8 Razorpay webhooks replace this |
| ACC-NPM-RELEASE-AGE | `.npmrc` / `pnpm-workspace.yaml` omit pnpm 10+ trust settings | Package manager is frozen at pnpm 9.15. Those keys are pnpm 10+. Lockfile is committed. | When pnpm is upgraded |
| ACC-UV-COOLDOWN | `backend/pyproject.toml` has no uv `exclude-newer` | uv 0.9.17+ feature; not required by the current uv pin used in CI. | When uv is upgraded |
| ACC-OSV-FREEZE | OSV reports on Next 15.1.7, Expo-transitive npm (postcss, sharp, tar, uuid, xmldom, image-size), cryptography 44, Starlette 0.46, pytest 8.3 | Not blindly bumping Expo SDK 52 or FastAPI 0.115. Patches need postcss 8.5.23, sharp 0.35, tar 7.x, uuid 11+. See `security/osv-config.toml`. | Dedicated upgrade phase |

## Version freeze

Do not bump Expo SDK 52, React Native, or FastAPI pins solely because OSV lists an advisory. Upgrade only if the advisory is exploitable **and** compatible. Ignored packages (dated 2026-08-30) are listed in `security/osv-config.toml`.

## OpenAPI

OpenAPI / Swagger / ReDoc are disabled when `ENV=production`.
