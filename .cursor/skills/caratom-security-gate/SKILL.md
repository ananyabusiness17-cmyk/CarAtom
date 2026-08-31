---
name: caratom-security-gate
description: Mandatory Phase 8+ security gate for CARATOM. Run the full-repo suite (pnpm security), fix CRITICAL/HIGH (and practical MEDIUM) findings, then rerun. Points agents at security/ and Trail of Bits review skills. Use at the end of every phase that ships code, including UI-only phases.
---

# CARATOM security gate

From **Phase 8 onward**, a phase is not complete until the full-repository security suite has been run and remaining CRITICAL/HIGH findings are fixed or explicitly accepted in `security/SECURITY_BASELINE.md`.

Do **not** scan only the diff. Do **not** point DAST at production.

## Command

```text
IMPLEMENT PHASE → tests → typecheck → lint → pnpm security (entire repo)
→ fix CRITICAL/HIGH (MEDIUM practical) → rerun suite → then phase complete
```

`pnpm security` runs `scripts/security/run.mjs` (Semgrep, Gitleaks, OSV-Scanner, optional ZAP against local `http://127.0.0.1:8000` only). If the API is down, ZAP is skipped and recorded — that is not a fake pass.

## Documents

- `security/README.md` — how to run the suite
- `security/THREAT_MODEL.md` — assets and trust boundaries
- `security/SECURITY_AUDIT.md` — dated findings
- `security/SECURITY_BASELINE.md` — accepted risks and tool versions

Never paste live secrets into these files or into chat.

## Review skills (Trail of Bits)

Use in this order when auditing:

1. `audit-context-building`
2. `insecure-defaults` and `sharp-edges`
3. `variant-analysis` on authz (job-card UUID, payment_id, media visit_id, IR findings)
4. `fp-check` before treating scanner hits as bugs
5. `static-analysis` / `semgrep-rule-creator` if a CARATOM-specific rule is missing
6. `supply-chain-risk-auditor` and `agentic-actions-auditor` for lockfiles and GitHub Actions

## Product constraints

- Do not rewrite FastAPI application-layer authz into Postgres RLS as part of this gate.
- Do not break guest GS job-card UUID access (gs-01→gs-10); that risk is accepted with claim-at-finalization.
- Do not blindly bump Expo SDK 52 or FastAPI pins.
