# §19 Vibe audit (present files only)

Missing from repo (do not invent IDs): `CONSTITUTION.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md`, `SCORING-AND-GATES.md`.

| Vibe source | Verification | Status |
|-------------|--------------|--------|
| QUICKSTART.md | tests / typecheck / lint / security in Phase 12 gate | [x] commands exist |
| GREENFIELD-PLAYBOOK.md launch | `docs/release` complete | [x] in-repo |
| VIBE-CODING-ARTICLE.md §4.3 | CI + pytest + Playwright | [x] |
| AUDIT-PLAYBOOK.md §2 intake | `audit-evidence/intake.md` | [x] |
| AUDIT-PLAYBOOK.md §3 recon | `audit-evidence/recon.md` | [x] |
| AUDIT-PLAYBOOK.md §8 blockers | live blockers documented, not waived silently | [x] |
| LEGAL-APPLICABILITY.md §7 | LEGAL-india-launch-pack | [x] draft |
| LEGAL-APPLICABILITY.md §9 72h | RUNBOOK-incident | [x] |
| CONTROLS-CATALOG-1.md | authz tests, parameterized SQL | [x] spot-check |
| SECURITY_ANALYSIS.md missing | architecture `14-security.md` + `security/` | [x] substitute |

**Waivers:** live store/TLS/backup drill BLOCKED (owner: operator after accounts). Not a silent pass.

## Frontend lifecycle audit (Phase 12 UI)

Reviewed legal/auth/profile/ops shell against tokens `#5DB7E8` / `#176B9E`, existing `PrimaryButton` / `InlineBanner` / `HubRow` / `PageHeader`. No Tamagui/NativeWind/Reusables added.

| Check | Result |
|-------|--------|
| Legal pages | canvas / brand-strong links, article + h1, no card walls or page-wide tint |
| OTP/phone consent | caption + brandStrong underline links, 44px inputs, error via InlineBanner |
| Profile legal | HubRow 44px; guests see policies; deletion is mailto (no fake delete API) |
| Staging banner | warning-soft / warning (contrast); production footer only |
| Edge states | profile loading / retry / logged-out; invoice GSTIN empty → pending registration |
| Touch / a11y | legal rows `role=link`; consent links labeled Terms / Privacy |

