# QUICKSTART.md

## Role-Based Entry Points Into the Universal Vibe-Coded Software Constitution

**Version:** 1.0.0

---

## 0. What This Document Set Is

You're looking at **The Universal Vibe-Coded Software Constitution** — a set of Markdown documents designed to be fed to an AI coding agent as a ruleset, or read directly by a human, to build, audit, or operate production-grade software.

| File | Purpose |
|---|---|
| `CONSTITUTION.md` | Core document: articles, principles, risk tiers, maturity profiles, lifecycle model |
| `CONTROLS-CATALOG-1.md` | Atomic controls, Domains 1-25, full schema |
| `CONTROLS-CATALOG-2.md` | Atomic controls, Domains 26-50, full schema |
| `SECURITY_ANALYSIS.md` | Dedicated adversarial security deep-dive — web, mobile, API, cloud, AI |
| `LEGAL-APPLICABILITY.md` | Jurisdiction-specific legal requirements (US, EU, UK, Canada, Australia, India) |
| `SCORING-AND-GATES.md` | How scoring, evidence confidence, and release gates work |
| `GREENFIELD-PLAYBOOK.md` | Stage-by-stage build checklists for new systems |
| `AUDIT-PLAYBOOK.md` | Methodology for auditing an existing system |
| `VIBE-CODING-ARTICLE.md` | AI-generated code-specific controls |
| `QUICKSTART.md` | This file |

**You do not need to read everything.** Use the table below to find your entry point.

---

## 1. "I'm an AI coding agent building something new"

1. Read `CONSTITUTION.md` §§ 1-9 first (Prime Directive, normative language, risk tiers, maturity profiles, lifecycle model) to calibrate what's expected at your system's risk tier.
2. Follow `GREENFIELD-PLAYBOOK.md` checklist-by-checklist, in order, as you move through implementation.
3. Consult `CONTROLS-CATALOG-1.md`/`-2.md` for the full schema of any specific control referenced in a checklist item.
4. If your system touches web or mobile security specifically, read the relevant sections of `SECURITY_ANALYSIS.md` (§ 11 for web, § 13 for mobile) alongside the corresponding `GREENFIELD-PLAYBOOK.md` checklist (10 or 11).
5. If you (the agent) are generating a meaningful fraction of the codebase yourself, read `VIBE-CODING-ARTICLE.md` in full — it governs how your own output should be reviewed and verified.
6. Before claiming a control "passes," check `SCORING-AND-GATES.md` § 3's evidence tiers — do not report a Pass on evidence weaker than what the control's severity requires.

## 2. "I'm an AI coding agent auditing an existing system"

1. Read `CONSTITUTION.md` § 6 (Two Operating Modes) and confirm you're operating in Existing Application Audit Mode.
2. Follow `AUDIT-PLAYBOOK.md` in full, starting with Phase 1 (Intake).
3. Use `CONTROLS-CATALOG-1.md`/`-2.md` and `SECURITY_ANALYSIS.md` as your control reference during Phase 3 (Evidence Collection).
4. Score findings using `SCORING-AND-GATES.md`.
5. Produce the report using `AUDIT-PLAYBOOK.md` § 9's structure.

## 3. "I'm a founder/non-technical stakeholder"

1. Read `CONSTITUTION.md` §§ 1-2 (Prime Directive, what "production-grade" means) and § 7-8 (Risk Classification, Maturity Profiles) to understand what level of rigor your product actually needs — not every product needs Tier 5 rigor, and over-building governance for a Tier 1 experiment is itself a mistake.
2. Read `SCORING-AND-GATES.md` § 7 (Rating Bands) to understand how you'll see results reported.
3. If you're deciding whether to commission a security audit or a full-app audit, read `AUDIT-PLAYBOOK.md` § 0-2 to understand what to expect and what access you'll need to grant.
4. Read `LEGAL-APPLICABILITY.md` § 1 (Applicability Engine) to get a rough sense of which legal regimes might apply to you based on where your users are.

## 4. "I'm an engineer/tech lead implementing this on a team"

1. Read `CONSTITUTION.md` in full once — it's the shared vocabulary (normative language, risk tiers, articles) the rest of the documents assume.
2. Use `GREENFIELD-PLAYBOOK.md` as your working checklist, mapped to your actual sprint/stage.
3. Bookmark `CONTROLS-CATALOG-1.md`/`-2.md` as the reference you consult when a checklist item needs more detail (evidence required, pass/fail criteria, implementation guidance).
4. If you own security specifically, `SECURITY_ANALYSIS.md` is your primary document — read it in full, not just the sections referenced by the Greenfield checklists, since it contains adversarial reasoning (attack chains, property tests) not repeated elsewhere.
5. If your team uses AI coding agents significantly, adopt `VIBE-CODING-ARTICLE.md`'s controls into your PR review process directly (§ 4.1-4.2 are the highest-leverage starting points).

## 5. "I'm a security engineer/reviewer"

1. Start directly with `SECURITY_ANALYSIS.md` — it's self-contained for security purposes, cross-referencing the catalogs only where needed.
2. Use § 26 (Property Test Library) as a starting adversarial test suite.
3. Use § 24 (Release Gates) and `SCORING-AND-GATES.md` § 5 (Hard Gate List) as your minimum bar for sign-off.
4. Use § 27 (Attack Story Library) to brief less security-focused teammates on why individually-moderate findings sometimes require urgent escalation.

## 6. "I'm an external auditor/compliance reviewer"

1. Start with `AUDIT-PLAYBOOK.md` in full.
2. Use `LEGAL-APPLICABILITY.md` to scope which jurisdictions' requirements are in play before beginning technical evidence collection.
3. Use `SCORING-AND-GATES.md` as your scoring methodology, and adopt its anti-gaming provisions (§ 10) explicitly in your own review discipline.
4. Reference `CONTROLS-CATALOG-1.md`/`-2.md` and `SECURITY_ANALYSIS.md` as your control universe.

## 7. "I just want the minimum safe starting sequence"

For any new, real (non-throwaway) system, at minimum:

1. `CONSTITUTION.md` § 7 — determine your risk tier honestly.
2. `GREENFIELD-PLAYBOOK.md` Checklists 1, 4, 5, 6, 7 — problem definition, auth, authz, input validation, secrets/crypto. These are the checklists most existing-app audits find failing, and most breaches trace back to.
3. `SCORING-AND-GATES.md` § 5 — know your Hard Gate List before you think you're done, not after.
4. If any AI coding agent wrote a meaningful fraction of your code: `VIBE-CODING-ARTICLE.md` § 4.1-4.4.

---

## 8. How the Documents Relate to Each Other

```
CONSTITUTION.md  (breadth: all quality dimensions)
      |
      +-- CONTROLS-CATALOG-1.md / -2.md  (the atomic controls, all 50 domains)
      |
      +-- SECURITY_ANALYSIS.md  (depth: adversarial security, web + mobile equally)
      |
      +-- LEGAL-APPLICABILITY.md  (jurisdiction-specific legal detail)
      |
      +-- SCORING-AND-GATES.md  (how everything above gets scored and gated)
             |
             +-- GREENFIELD-PLAYBOOK.md  (build-time sequencing)
             +-- AUDIT-PLAYBOOK.md       (audit-time methodology)
             +-- VIBE-CODING-ARTICLE.md  (AI-authorship-specific controls, cross-cutting)
```

---

## 9. A Note on Scope and Limits

This document set is comprehensive but not infinite, and it says so explicitly in several places (`CONSTITUTION.md` § 12, `SECURITY_ANALYSIS.md` §§ 34-35). It is a **curated foundational set**, designed to be extended with the same schemas and ID conventions as your organization's own experience, incidents, and research reveal gaps. Treat it as a strong starting floor, not a ceiling, and re-verify time-sensitive claims (law, standards versions, threat landscape) against current sources before relying on them for a real compliance or security decision.
