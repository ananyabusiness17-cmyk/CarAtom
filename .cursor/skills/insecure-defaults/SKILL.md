---
name: insecure-defaults
description: Audit a codebase for insecure default configuration — fallback secrets, default credentials, fail-open switches, weak crypto, permissive access, and debug leakage. Trace each candidate to a security decision before reporting it. Use during CARATOM security gates and full-repo audits.
---

# Insecure defaults audit (Trail of Bits)

This skill is the Cursor/agents port of Trail of Bits `insecure-defaults`. The Claude Workflow runner is not used here. Follow the same discriminators in `references/*.md`.

## When to use

Load this skill when auditing CARATOM for insecure defaults, reviewing `ENABLE_*` flags, CORS, OpenAPI, debug routes, or fallback secrets.

## How to run

1. Confirm this folder contains `references/*.md`. If it does not, stop and say so.
2. Sweep the **entire** repo (or the named path) for the six categories in `README.md`.
3. For each candidate, start at **refuted** and only report it if every step in `commands/audit.md` fails to refute it.
4. Never paste live secrets into chat or markdown. Quote file paths and line numbers only.

## CARATOM notes

- Domain authz is FastAPI application-layer. Absence of Postgres RLS is an **accepted** risk if PostgREST is not exposed — document, do not "fix" with a schema rewrite.
- `/v1/dev/*` must 404 when `ENV=production` and `ENABLE_DEV_SIMULATE` is false.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client responses or Expo/Next public env.
