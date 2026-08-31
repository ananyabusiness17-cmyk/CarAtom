# VIBE-CODING-ARTICLE.md

## Rules Specific to AI-Generated and AI-Agent-Modified Code

**Version:** 1.0.0 · **Companion to:** `CONSTITUTION.md` (Article XIV), `CONTROLS-CATALOG-1.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md` (§ 14-15)

---

## 1. Purpose

"Vibe coding" — building software substantially or entirely via natural-language instructions to an AI coding agent, often with limited line-by-line human review of the resulting code — has become a mainstream development mode. It offers real productivity benefits and also introduces a distinct set of failure modes that traditional code-review practices were not designed to catch. This document is the dedicated control set for those failure modes: it does not repeat general application-security controls found in the catalogs, only what is specific to *how the code came to exist and how it is verified*.

**Core stance**: AI-generated code, tests, explanations, and self-assessments are **unverified claims, not evidence**, until independently confirmed (`SECURITY_ANALYSIS.md` Principle 18). This is not a statement about AI capability trending up or down over time — it is a structural statement about what fluency and confidence in generated text can and cannot tell you about correctness.

---

## 2. Applicability

This article applies whenever an AI coding agent (autocomplete-scale to fully autonomous agentic coding) authors, modifies, reviews, or approves any part of a codebase, including: inline code completion, chat-driven code generation, autonomous multi-file agentic changes, AI-generated tests, AI-generated documentation describing code behavior, and AI-driven code review/approval workflows. It applies regardless of which specific AI tool or model is used — this document is tool-neutral.

---

## 3. The Core Risk Categories

1. **Confident fabrication** — the agent asserts something is true (an API exists, a check is in place, a test passes) with no correlation between confidence and correctness.
2. **Silent regression via "helpful" changes** — an agent asked to fix one thing modifies unrelated code, including removing safeguards, as a side effect of pursuing the stated goal by the shortest apparent path.
3. **Pattern amplification** — an agent reproduces an insecure pattern consistently across many files because it matched context already present in the codebase, propagating a single bad decision at scale rather than containing it.
4. **Verification collapse** — tests and reviews performed by the same system (or a system with the same blind spots) that generated the code provide no independent signal.
5. **Supply-chain hallucination** — agents suggesting non-existent or subtly-wrong package names/APIs, which attackers can pre-position against.
6. **Scope and privilege creep** — agents operating with more tool/system access than the specific task requires, widening the consequence of any of the above going wrong.

---

## 4. Normative Controls

### 4.1 Human Review Gate for Security-Critical Code
**MUST**: Any AI-generated or AI-modified code touching authentication, authorization, payment processing, cryptography, or direct data access/deletion MUST receive human review before merge to a production branch, regardless of the agent's own confidence level or self-reported testing. This mirrors and operationalizes `CONSTITUTION.md` Article XIV.
**Evidence**: A recorded review (PR approval, review comment, or equivalent) by a human distinct from whoever prompted the agent, for the specific commit/diff in question.
**Anti-pattern**: "The agent said it tested this and it works" recorded as the review artifact.

### 4.2 Diff-Level Review for Removed Checks
**MUST**: Code review of AI-generated diffs MUST specifically check for *removed* validation, error handling, authentication checks, or authorization checks — not only review added functionality. Reviewers should ask "what did this diff make weaker?" as a distinct question from "does this diff add what was asked for?"
**Rationale**: Agents optimizing for a stated goal (e.g., "make this test pass," "fix this error") have a documented tendency to find the path of least resistance, which sometimes means weakening or removing the thing that was failing rather than fixing the underlying issue.

### 4.3 Independent Verification of Agent Claims
**MUST**: Statements by an AI agent about its own code (e.g., "this is secure," "this handles the edge case," "the tests pass") MUST NOT be recorded as verification evidence in any audit or release-gate context. See `SECURITY_ANALYSIS.md` § 4's evidence hierarchy — an AI agent's explanation sits at Tier 7, the weakest tier, identical to an unverified verbal assurance.
**Evidence required instead**: Actual test execution output, actual scan results, actual manual verification — the same evidence standard applied to human-written code, with no discount or premium for AI authorship.

### 4.4 Dependency Verification Before Installation
**MUST**: Any package/library suggested by an AI agent MUST be independently verified to exist, be actively maintained, and match the expected publisher/namespace before installation — never auto-installed purely on agent suggestion. See `SECURITY_ANALYSIS.md` § 14.2 and `SUPPLY-INSTALL-001`.
**Rationale**: Documented "slopsquatting" attacks specifically target the pattern of AI-hallucinated package names, pre-registering malicious packages under exactly the names an agent is statistically likely to suggest.

### 4.5 Test Integrity Verification
**MUST**: When an AI agent modifies a test alongside a code change (especially when resolving a previously-failing test), the modified test MUST be reviewed to confirm it still asserts the originally-intended behavior, not a weakened or trivial version of it (e.g., an assertion changed from checking a specific value to checking the value is merely non-null).
**Evidence**: A reviewer diff-comparison of the test's assertions before and after the change, with an explicit confirmation that test strength was not reduced.

### 4.6 Least-Privilege Agent Tooling
**MUST**: AI coding agents MUST be granted the minimum tool, file-system, network, and credential access needed for the specific task at hand, not standing broad/production access by default. Production credentials, unscoped cloud permissions, and unrestricted shell access SHOULD NOT be available to an agent operating on routine development tasks.
**Evidence**: Documented tool/permission scope configuration for the agent's operating environment, reviewed periodically for scope creep.

### 4.7 Human Confirmation for Irreversible or High-Impact Actions
**MUST**: An AI agent with tool-calling/execution capability (able to run commands, deploy, send communications, modify production data) MUST require explicit human confirmation of the specific action immediately before any irreversible or high-impact action, not a one-time blanket pre-authorization of the agent's general task or plan.
**Rationale**: A plan approved in the abstract ("yes, go fix the bug") does not constitute informed consent to a specific destructive command the agent later decides to run to achieve that goal.

### 4.8 Prompt Injection Resilience for Agents Consuming External Content
**MUST**: Agents that read repository content, issue trackers, dependency metadata, or fetched web content as part of their operation MUST be assumed exposed to adversarial instructions embedded in that content (§ 4.6/4.7's least-privilege and confirmation controls are the primary mitigation, since content-level injection filtering is not a reliable standalone defense).

### 4.9 Provenance Tracking
**SHOULD**: Organizations using AI coding agents at scale should track, at minimum for security-critical code paths, whether a given commit was human-authored, AI-authored-then-substantively-human-reviewed, or AI-authored-with-light-review — to inform audit sampling priority (`AUDIT-PLAYBOOK.md` § 5.4) and incident-investigation starting points.
**Evidence**: Commit metadata, PR labels, or an equivalent tracking mechanism.

### 4.10 Pattern-Propagation Awareness
**SHOULD**: When an insecure pattern is identified in a codebase built substantially via AI agents, the remediation review SHOULD explicitly check for the same pattern reproduced elsewhere in the codebase (via search, not assumption) — because agents that produced the pattern once, working from the same codebase context, are statistically likely to have reproduced it whenever similar code was subsequently generated.

### 4.11 Coding Agent Change-Scope Discipline
**SHOULD**: Instruct and configure agents to make the minimum-scope change necessary for the stated task, and treat any agent-initiated changes outside the stated scope (refactoring unrelated code, "cleaning up" adjacent files) as requiring the same review scrutiny as the primary requested change — an agent should not get a scope-review discount for changes it made unprompted.

---

## 5. Failure Pattern Library

See `SECURITY_ANALYSIS.md` § 28 for the security-framed version of this list; reproduced and extended here from the development-process perspective:

1. **The confident-but-wrong explanation** (§ 3.1) — mitigated by § 4.3.
2. **The disappearing check** (§ 3.2) — mitigated by § 4.2.
3. **The copy-pasted insecure pattern at scale** (§ 3.3) — mitigated by § 4.10.
4. **The hallucinated dependency/API** (§ 3.5) — mitigated by § 4.4.
5. **The test that got weaker, not the code that got better** — mitigated by § 4.5.
6. **The scope-creeping refactor** — an agent asked to fix a small bug rewrites a much larger surface area "while it's in there," multiplying the review burden and the chance of an unreviewed regression — mitigated by § 4.11.
7. **The over-privileged agent incident** — an agent with unnecessarily broad access takes an unintended destructive action while pursuing a legitimate-seeming goal (e.g., deleting data it incorrectly judged to be unused, modifying production configuration while "testing") — mitigated by §§ 4.6-4.7.
8. **The injected-instruction hijack** — an agent processing external content (a fetched webpage, a third-party issue, a malicious dependency's README) is redirected by embedded adversarial instructions — mitigated by §§ 4.6-4.8.

---

## 6. Review Intensity Scaling

Not all AI-generated code warrants identical review depth. Scale review intensity by:

| Factor | Lower Review Intensity Acceptable | Higher Review Intensity Required |
|---|---|---|
| Code area | Non-security-critical UI/presentation logic | Auth, authz, payments, crypto, data deletion, admin functionality |
| Reversibility | Easily reverted, low-blast-radius | Irreversible, production-data-affecting, customer-facing at scale |
| Agent autonomy | Suggestion accepted line-by-line by a human | Fully autonomous multi-file agentic change with minimal human oversight during generation |
| Provenance | Human-initiated task with a specific, narrow prompt | Agent operating on a broad, open-ended mandate ("improve the codebase") |
| Testing | Comprehensive pre-existing test suite covering the changed area | Sparse or no existing test coverage for the changed area |

Regardless of scaling, § 4.1's human review gate for security-critical code is **never** scaled down to zero — it is a floor, not a target.

---

## 7. Relationship to `CONSTITUTION.md` Article XIV

`CONSTITUTION.md` Article XIV establishes the constitutional principle that AI-generated code is subject to the same production-readiness bar as any other code, with no exemption for "the AI wrote it." This document operationalizes that principle into specific, checkable controls. Where this document and Article XIV appear to conflict, Article XIV's principle-level statement governs the *intent*, and this document's controls govern the *implementation* — they are not intended to diverge, and any apparent conflict should be treated as a defect in this document to be corrected, not as license to deviate from the principle.

---

## 8. Scoring and Gates

AI-coding-specific controls feed into `SCORING-AND-GATES.md` identically to any other control — see Gate 18 ("AI-generated code touching auth/payments/crypto has documented human security review," minimum Tier 2 if AI-assisted) in `SCORING-AND-GATES.md` § 5. Evidence-tier discipline (§ 4.3 above) means an AI agent's self-report can never independently satisfy this gate's evidence requirement.

---

## 9. Maintenance

This document should be revisited as AI coding agent capabilities and common usage patterns evolve — the specific failure patterns in § 5 are illustrative of *categories* that have proven durable (confident fabrication, scope creep, privilege misuse) even as specific model behaviors change, but new categories should be added as they are identified in practice, and this document's currency should be checked against `SECURITY_ANALYSIS.md` §§ 14-15 to ensure the two remain consistent.
