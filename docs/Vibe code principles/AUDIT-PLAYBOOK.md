# AUDIT-PLAYBOOK.md

## How to Audit an Existing Application

**Version:** 1.0.0 · **Companion to:** `CONSTITUTION.md`, `CONTROLS-CATALOG-1.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md`, `SCORING-AND-GATES.md`, `LEGAL-APPLICABILITY.md`

---

## 0. Purpose and Mode

This is the operational methodology for `CONSTITUTION.md`'s **Existing Application Audit Mode** (`CONSTITUTION.md` § 6, Mode C in `SECURITY_ANALYSIS.md` § 5). Unlike `GREENFIELD-PLAYBOOK.md` (which sequences construction), this document sequences **discovery, verification, scoring, and reporting** for a system that already exists — where the auditor typically starts with incomplete or unreliable information about what was actually built.

**Core principle**: An audit reconstructs ground truth from evidence. It does not accept provided documentation, architecture diagrams, or stakeholder claims at face value — every claim is either independently verified or explicitly marked unverified (`SECURITY_ANALYSIS.md` § 4).

---

## 1. Audit Phases Overview

1. **Intake** — Scope, access, and stakeholder alignment
2. **Reconnaissance** — Independently reconstruct the actual architecture and attack surface
3. **Evidence Collection** — Gather evidence per the hierarchy for every applicable control
4. **Scoring** — Apply `SCORING-AND-GATES.md`
5. **Challenge Review** — Adversarially re-examine findings before finalizing
6. **Reporting** — Produce findings and a report using the standard format
7. **Follow-Up** — Track remediation and re-verification

---

## 2. Phase 1 — Intake Questionnaire

Before starting technical work, establish:

1. **Scope**: Which system(s), which environments (production only, or staging/dev too), which components (frontend, backend, mobile apps, infrastructure, third-party integrations)?
2. **Access**: What access will be granted — read-only code access, production access, credentials at multiple privilege levels, infrastructure console access? Insufficient access should be recorded as a limitation (§ 6), not silently worked around.
3. **Risk tier and applicable jurisdictions**: Confirm or independently assess per `CONSTITUTION.md` § 7 and `LEGAL-APPLICABILITY.md` § 1 — do not simply accept the client's self-assessed tier without spot-checking it against the actual data/user population.
4. **Prior audits**: Have previous audits/pentests been conducted? Obtain reports to check whether prior findings were actually remediated (a common gap — see § 5.3).
5. **Known issues**: Ask stakeholders what they already believe is broken or risky — this is useful signal but must be independently verified like any other claim, not treated as the complete list.
6. **Timeline and depth**: Is this a rapid triage (days) or a comprehensive audit (weeks)? Adjust the evidence-tier expectations in § 4 accordingly, but never silently substitute weaker evidence standards for Critical/gate-listed controls regardless of timeline pressure — if time doesn't permit Tier 1-3 evidence for a Critical control, report it as "Unknown/Insufficient Time to Verify," never as an unqualified Pass.

**Output**: A signed-off scope document naming systems, access granted, risk tier, and applicable jurisdictions.

---

## 3. Phase 2 — Reconnaissance (Reconstructing Ground Truth)

Do not begin control-by-control verification until the actual system is independently mapped:

1. **Attack surface inventory**: Enumerate all externally reachable endpoints — domains, subdomains (including via certificate transparency logs and DNS enumeration, which often reveal forgotten/undocumented subdomains), APIs, mobile apps and their app-store listings, admin panels, exposed infrastructure (open ports, exposed cloud storage). Compare against what was documented/expected — undiscovered surface is itself a finding (`SECURITY_ANALYSIS.md` § 12.1, Shadow API risk).
2. **Architecture reconstruction**: Read the actual code/infrastructure-as-code to build (or correct) the trust-boundary diagram, rather than accepting a provided diagram unverified — diagrams frequently lag actual deployed reality (`CONSTITUTION.md` Article VII, code-over-documentation precedence).
3. **Data flow mapping**: Trace where personal/sensitive data actually flows — into which stores, to which third parties, across which jurisdictional boundaries — independent of what the privacy policy or data inventory document claims.
4. **Dependency and technology inventory**: Enumerate actual runtime dependencies, versions, and third-party SDKs (not just what's declared in a manifest — check for dependencies installed but not declared, and declared-but-unused-so-lower-priority ones).
5. **Identity and access inventory**: Enumerate who/what has access to production systems, at what privilege level, and whether access matches current role/need (stale access from former employees/contractors is a common, high-value finding).

**Output**: A corrected architecture/attack-surface map, explicitly noting every place it diverges from what was originally documented or claimed.

---

## 4. Phase 3 — Evidence Collection

For each control in `CONTROLS-CATALOG-1.md`, `-2.md`, and applicable `SECURITY_ANALYSIS.md` sections:

1. **Determine applicability** per `SCORING-AND-GATES.md` § 6 — default to applicable; record justification for any "Not Applicable."
2. **Seek the strongest available evidence tier** (`SECURITY_ANALYSIS.md` § 4): attempt reproducible test/exploit demonstration first; fall back to weaker tiers only when stronger tiers are genuinely infeasible within scope/time, and record which tier was actually obtained.
3. **Apply the falsification requirement**: for every tentative Pass, explicitly state what evidence would have produced a Fail instead, and confirm that evidence was actively sought (not merely absent from what was volunteered). This is the single most important discipline for avoiding false-positive Pass verdicts — see the evidence-falsification red flags in `SECURITY_ANALYSIS.md` § 4.
4. **Cross-check self-reported evidence independently.** Where a stakeholder states a control is implemented, verify via code/config/runtime inspection rather than recording the statement itself as evidence (statements are Tier 7, the weakest tier).
5. **Record Unknown explicitly** where evidence could not be obtained within scope/access/time — an Unknown control scores identically to a Fail in `SCORING-AND-GATES.md` § 4 and MUST NOT be silently omitted from the report.

### 4.1 Prioritization Under Time Constraints

When full coverage of all ~50 domains isn't feasible in the available time, prioritize in this order: (1) Hard Gate List items (`SCORING-AND-GATES.md` § 5); (2) Critical-severity controls in Application Security, Authentication/Authorization, and Data Protection domains; (3) controls related to any previously-known issue (§ 2.5); (4) the remaining catalog, breadth-first. Document explicitly which domains received full verification versus abbreviated/sampling-based verification.

---

## 5. Phase 3.5 — Special Verification Procedures

### 5.1 Verifying "Not Applicable" Claims
Independently confirm the stated basis for non-applicability (e.g., "we don't process payments" should be checked against the actual codebase/data flows, not merely the stakeholder's statement) — see `SCORING-AND-GATES.md` § 6's gaming-detection guidance.

### 5.2 Chain Analysis
After individual control verification, apply `SECURITY_ANALYSIS.md` § 27's attack-chain methodology: review the set of Medium/Low findings for combinations that compose into significantly worse real-world risk, and re-score per `SCORING-AND-GATES.md` § 8.

### 5.3 Prior-Finding Remediation Verification
For any previously-reported finding (from an earlier audit/pentest), do not accept a stakeholder's claim of remediation — re-verify directly. A documented pattern in real audits is findings marked "remediated" in tracking systems that were never actually fixed, or were fixed and then reintroduced by a subsequent change.

### 5.4 Sampling Strategy for Large Codebases
Where full code review of every path is infeasible, sample with bias toward: authentication/authorization code, payment/financial logic, cryptographic operations, any code handling file uploads/user-generated content, and any recently-changed code (recent changes are statistically more likely to introduce regressions than stable, long-unmodified code).

---

## 6. Phase 4 — Scoring

Apply `SCORING-AND-GATES.md` in full: compute domain scores with evidence-confidence multipliers, apply the Domain Floor Rule, check the Hard Gate List independently of the numeric score, and apply chain amplification. **Never adjust the scoring methodology to fit a target/expected outcome** — if a client-provided expectation of "we should score well" conflicts with the evidence, the evidence governs, and this conflict itself should be flagged in the report's Limitations section if the pressure was explicit.

---

## 7. Phase 5 — Challenge Review (Adversarial Self-Check)

Before finalizing, apply `SECURITY_ANALYSIS.md` § 21.3's red-team question to the audit's own work: **"If I were trying to make this system look more secure/compliant than it actually is, how would I do that within this audit's methodology, and did I actually guard against it?"**

Concretely, for each domain scored above 75%:
1. Re-examine whether any Pass verdicts rest on Tier 4+ evidence that should be downgraded.
2. Re-examine whether any "Not Applicable" verdicts deserve challenge per § 5.1.
3. Re-examine whether any individually-Medium findings should be chain-elevated per § 5.2.
4. Confirm the Hard Gate List was checked exhaustively, not just the domains that happened to receive deep review.

---

## 8. Finding Format

Every finding in the report uses this structure:

- **Finding ID**: Sequential, referencing the relevant control ID(s) (e.g., `AUD-2026-08-001 (ref: AUTHZ-DENY-001)`)
- **Title**: One-line, specific description (not "authorization issue" — "Object-level authorization missing on `/api/orders/{id}` allows cross-tenant order access")
- **Severity**: Critical/High/Medium/Low/Informational, with chain-amplification noted if applicable
- **Evidence Tier Obtained**: 1-7 per `SECURITY_ANALYSIS.md` § 4, with the specific evidence described (not merely asserted)
- **Reproduction Steps**: Concrete, specific steps an independent party could follow to confirm the finding — a finding without reproduction steps is itself a lower-confidence finding and should be marked as such
- **Affected Scope**: Which systems/users/data are affected
- **Business Impact**: Plain-language description of realistic consequence, not just the technical mechanism
- **Applicable Control(s)**: Cross-reference to the catalog control(s)
- **Recommended Remediation**: Specific, actionable guidance (referencing the control's `remediation_guidance` field)
- **Verification-After-Remediation Criteria**: What evidence would confirm the fix actually works — set this at finding time so remediation isn't marked complete on a weaker basis than the original finding required

---

## 9. Report Structure

1. **Executive Summary**: Overall rating band (`SCORING-AND-GATES.md` § 7), release-readiness status, top 3-5 findings by business impact, one-paragraph methodology summary
2. **Scope and Methodology**: What was and wasn't covered, access level obtained, time spent, evidence-tier distribution achieved
3. **Aggregate and Domain Scores**: Full breakdown per `SCORING-AND-GATES.md` § 4, explicitly flagging any Domain Floor Rule applications
4. **Hard Gate Status**: Pass/Fail status for every applicable gate in `SCORING-AND-GATES.md` § 5
5. **Findings**: Full findings list per § 8, ordered by severity (post-chain-amplification)
6. **Chain Analysis**: Any identified attack chains per § 5.2, with the individual findings they combine
7. **Legal/Jurisdictional Notes**: Applicable jurisdictions identified and any specific compliance gaps per `LEGAL-APPLICABILITY.md`
8. **Limitations**: What could not be verified and why (access, time, scope exclusions) — never omit this section; an audit that implies completeness it didn't achieve is itself a finding-worthy problem
9. **Remediation Roadmap**: Findings grouped into immediate (gate-blocking), near-term (30-90 days), and longer-term (strategic) remediation, with owners recommended per each control's `recommended_owner` field

---

## 10. Phase 6 — Follow-Up and Re-Verification

1. Track each finding to closure with the verification-after-remediation criteria set at finding time (§ 8) — do not accept a stakeholder's closure claim without re-verification for Critical/gate-listed findings (mirrors § 5.3's prior-finding lesson).
2. Schedule re-verification per `SECURITY_ANALYSIS.md` § 38's maintenance cadence for the domains most subject to drift (dependencies, cloud configuration, access grants).
3. Where remediation introduces new code/configuration, apply the same evidence-tier discipline to the fix as to the original finding — a "fix" verified only via a stakeholder's statement is not verified.

---

## 11. Auditor Conduct and Independence

Per `SECURITY_ANALYSIS.md` § 21.1: the auditor should not be the same party that implemented the controls being audited, for Tier 3+ audits, wherever practically achievable. Where the AI agent conducting the audit has knowledge of prior implementation decisions from the same session/context (e.g., it built the system being audited), this should be explicitly disclosed as a limitation, and Critical/gate-listed findings should receive extra scrutiny given the reduced independence.

---

## 12. Maintenance

Review this playbook whenever `SCORING-AND-GATES.md`'s scoring methodology changes (finding format and phase 4 must stay consistent with it), whenever a new gate is added (§ 9's Hard Gate Status section must reflect the current list), or when real-world application of this playbook reveals a gap in the methodology (e.g., a gaming strategy not caught by the Phase 5 challenge review should be added as an explicit check).
