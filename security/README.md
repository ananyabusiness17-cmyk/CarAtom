# CARATOM security suite

This folder is the source of truth for security engineering on this repo. From **Phase 8 onward**, a phase is not complete until the full-repository suite has been run and remaining CRITICAL/HIGH findings are fixed or accepted in `SECURITY_BASELINE.md`.

UI-only phases still run the **full** suite. Do not scan only the diff.

Never paste live secrets into these files or into chat.

## How to run

```bash
pnpm security
```

That runs `scripts/security/run.mjs`:

| Tool | What it covers |
|------|----------------|
| Semgrep | SAST across the whole repo (`p/owasp-top-ten`, `p/python`, `p/javascript`, `p/javascriptreact`, `p/jwt`, `p/secrets`) plus CARATOM rules in `.semgrep.yml` |
| Gitleaks | Secret scan (`gitleaks.toml`). Output is redacted. Uses `--no-git` when the workspace has no `.git` (zip/export). CI checks out full history. |
| OSV-Scanner | `pnpm-lock.yaml` and `backend/uv.lock` |
| OWASP ZAP | Optional baseline against **local** `http://127.0.0.1:8000` only. If `GET /health` is down, ZAP is **skipped and recorded** — that is not a pass. |

Never point ZAP at production Railway or Supabase.

## Local tool install (Windows)

- Semgrep: `pipx install semgrep` or `uv add --dev semgrep` in `backend/`
- Gitleaks: install the CLI on PATH, or place `gitleaks.exe` in gitignored `scripts/security/bin/`
- OSV-Scanner: [install](https://google.github.io/osv-scanner/) on PATH, or place `osv-scanner.exe` in `scripts/security/bin/` (Windows lockfile paths must be relative; the runner already does this)
- ZAP: Docker, and the API running on port 8000

CI installs these and runs the same `pnpm security` command.

## Phase 8+ gate

```text
IMPLEMENT PHASE → tests → typecheck → lint → pnpm security (entire repo)
→ fix CRITICAL/HIGH (MEDIUM practical) → rerun suite → then phase complete
```

Load skill `caratom-security-gate`. Cursor rule: `.cursor/rules/caratom-security-gate.mdc`.

## Documents

- `THREAT_MODEL.md` — assets, trust boundaries, threats
- `SECURITY_AUDIT.md` — dated findings from the Phase 1–7 audit
- `SECURITY_BASELINE.md` — tool versions, authz model, accepted risks
