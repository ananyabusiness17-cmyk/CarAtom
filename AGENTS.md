# Agent instructions (CARATOM)

Phase 1 is complete. Do not redo Phase 1 shells. Do not start Phase 2 unless the user explicitly asks.

## Design and product authority

When sources conflict:

1. Current phase spec in `docs/implementation/` (aligned with architecture doc 10: tasteful light-blue accent `#5DB7E8` / `#176B9E`, not a page-wide tint).
2. `docs/architecture/01-product-constitution.md` and `docs/AUDIT-REPORT.md`.
3. `Vibe code principles/` — AI verification, greenfield, and security. Wins over external skills.
4. Architecture design docs (`10-design-system.md`, `06-frontend-architecture.md`), walkthrough, `docs/inspiration/`.
5. External skills — expertise only, not a second UI stack.

Mobile: Expo 52 + StyleSheet. Admin web: Next.js + Tailwind 3.4. Do not add Tamagui, NativeWind, or React Native Reusables without an ADR.

## Phase 2+ frontend work

Always-on Cursor rules: `.cursor/rules/caratom-design-authority.mdc`, `.cursor/rules/caratom-phase-lifecycle.mdc`, `.cursor/rules/caratom-security-gate.mdc`.

Load **`caratom-phase-frontend`** before/during/after every UI phase. End every phase with a **full-codebase** audit (not just new files). Fix in-scope issues, then re-audit. Use the checklist in that skill.

## Phase 8+ security gate

From Phase 8 onward, every phase (including UI-only) must also run the **full-repo** security suite before it is marked complete:

```text
IMPLEMENT PHASE → tests → typecheck → lint → pnpm security (entire repo)
→ fix CRITICAL/HIGH (MEDIUM practical) → rerun suite → then phase complete
```

Load **`caratom-security-gate`**. Details: `security/README.md`. Do not scan only the diff. Do not point DAST at production. Never paste live secrets into chat or markdown.

### Skills to consult

| Kind | Location |
|------|----------|
| Lifecycle + audit | `.cursor/skills/caratom-phase-frontend/` |
| Security gate (Phase 8+) | `.cursor/skills/caratom-security-gate/` |
| Pattern refs (no npm install) | `.cursor/skills/caratom-design-references/` |
| Expo | `expo-overview`, `expo-router`, `expo-native-ui`, `expo-design-system`, `expo-animation`, `expo-data-fetching`, `expo-project-structure` |
| Vercel | `vercel-react-native-skills`, `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines` (admin web) |
| Anthropic | `frontend-design` |

Vendor skills live under `.cursor/skills/` (Cursor) and `.agents/skills/` (skills CLI install). They are recorded in `skills-lock.json`. Do not install `expo-tailwind-setup` or EAS skills until a later phase needs them.
