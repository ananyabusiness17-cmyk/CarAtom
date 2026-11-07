# ATOMIC CONTROLS CATALOG — PART 1

## Domains 1–25

**Version:** 1.0.0 · **Companion to:** `CONSTITUTION.md` · **Cross-references:** `SECURITY_ANALYSIS.md` (deep security/mobile/web detail), `LEGAL-APPLICABILITY.md` (jurisdiction detail)

---

## How to Read This Catalog

This is a **curated foundational control set** — not an exhaustive enumeration. Each of the 50 control domains (25 here, 25 in `CONTROLS-CATALOG-2.md`) receives a representative set of high-value, non-duplicative atomic controls, each using the **complete constitutional control schema** (all fields below are populated for every control; none are omitted). Domains with deep dedicated treatment elsewhere (application security, mobile, web architecture) are deliberately kept lighter here and cross-referenced to `SECURITY_ANALYSIS.md` to avoid duplicate, conflicting guidance — one property, one canonical control, many mappings.

**This catalog is designed to be extended.** Use the same schema and ID-numbering convention to add controls as your organization's needs, research, and incidents reveal gaps. Do not treat the numbers below as a ceiling.

### Control ID Convention

`<DOMAIN-PREFIX>-<SUBDOMAIN>-<NNN>`, e.g. `SEC-AUTH-001`, `PRIV-CONSENT-001`, `DATA-LIFE-001`. IDs are permanent once published; a retired control is marked `Deprecated` rather than reused or deleted.

### Schema Legend (applies to every control below)

Each control block uses this structure, covering all required schema fields from the Constitution's control schema:

- **Statement** — `control_id`, `title`, `normative_statement`, `requirement_level` (MUST/SHOULD/MAY)
- **Classify** — `article`, `domain`, `subdomain`, `control_type`, `risk_tier` (minimum tier at which mandatory), `minimum_lifecycle_stage`, `applicable_maturity_profiles`
- **Why** — `objective`, `rationale`, `risk_addressed`, `threat_or_failure_mode`
- **Applies When** — `applicability_rule`, `applicability_questions`, `non_applicability_conditions`, `jurisdictions`, `industries`, `data_categories`, `user_categories`, `architecture_categories`, `technology_categories`, `legal_basis`, `contractual_basis`
- **Sources** — `standards_mappings`, `source_ids`, `source_last_verified`
- **Risk Profile** — `severity`, `likelihood`, `impact`, `exploitability`, `detectability`, `affected_users`, `affected_assets`
- **Evidence** — `required_evidence`, `acceptable_evidence`, `unacceptable_evidence`
- **Verify** — `automated_checks`, `manual_checks`, `organizational_checks`, `legal_review_required`, `production_environment_verification_required`, `test_procedure`
- **Outcomes** — `pass_criteria`, `partial_pass_criteria`, `fail_criteria`, `unknown_criteria`, `release_gate`, `score_weight`
- **Implement** — `implementation_guidance`, `technology_examples`, `anti_patterns`, `common_false_confidence`
- **Remediate** — `remediation_guidance`, `verification_after_remediation`
- **Own** — `recommended_owner`, `estimated_effort`, `dependencies`
- **Exceptions** — `exceptions_allowed`, `exception_approval`, `exception_expiry`, `review_frequency`
- **Notes** — `notes`

Severity scale: **Critical (12) · High (8) · Medium (4) · Low (2) · Informational (0)** (see `SCORING-AND-GATES.md`).

---

## Domain 1 — Product Purpose and Governance

#### GOV-PURPOSE-001 — Documented Problem Statement and Excluded Uses

**Statement (MUST):** The product MUST have a written problem statement, intended-user definition, and explicit list of excluded/out-of-scope uses before Tier 3+ launch.
**Classify:** Article I; Domain 1/Product Purpose; control_type=Product-quality requirement; risk_tier=2+; lifecycle=Idea & Problem Definition; maturity=MVP+
**Why:** objective=Prevent scope drift and unintended harmful use; rationale=Undefined scope leads to feature creep, misapplied trust assumptions, and harms to unanticipated user groups; risk_addressed=Product used in unintended, harmful, or unsupported ways; threat_or_failure_mode=Feature built for one context (e.g., internal tool) deployed into another (e.g., public-facing) without re-assessment.
**Applies When:** rule=Always at Tier 2+; questions="Is there a written, current problem statement?"; not_applicable_when=Tier 0/1 experiments; jurisdictions=Universal; industries=Universal; data=n/a; users=All; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Often required by enterprise procurement/due-diligence.
**Sources:** standards_mappings=ISO 9001 (context of the organization, analogous); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Medium; impact=Medium; exploitability=n/a; detectability=Medium; affected_users=All; affected_assets=Product direction, trust.
**Evidence:** required=Written charter/PRD with problem statement and excluded uses; acceptable=Living doc reviewed within last 12 months; unacceptable=Verbal understanding only; slide deck with no maintained source of truth.
**Verify:** automated=None; manual=Document review; organizational=Confirm owner and review date; legal_review=No; prod_verification=No; test_procedure=Request charter; confirm excluded-uses section exists and is dated.
**Outcomes:** pass=Charter exists, current, includes excluded uses; partial=Charter exists but stale (>12mo) or missing excluded uses; fail=No charter; unknown=Charter existence cannot be confirmed; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=One-page PRD template with "who this is NOT for" section; examples=Product charter template in `templates/`; anti_patterns=Charter written once at founding and never revisited; common_false_confidence="We all know what we're building" (undocumented shared understanding degrades as team grows).
**Remediate:** guidance=Run a structured discovery session; write and circulate charter; verify_after=Confirm charter merged/published with owner and review date.
**Own:** owner=Product; effort=Low; dependencies=None.
**Exceptions:** allowed=Yes at Tier 2 with justification; approval=Product lead; expiry=6 months; review=Annual.
**Notes:** This is the anchor artifact that risk classification (Domain in `LEGAL-APPLICABILITY.md`) and threat modeling both depend on.

#### GOV-OWNERSHIP-001 — Named Owners for Product, Security, Privacy, and Data

**Statement (MUST):** Every production system MUST have a named, current individual (not just a team name) accountable for product decisions, security, privacy, and data governance.
**Classify:** Article XIII; Domain 1; control_type=Operational baseline; risk_tier=2+; lifecycle=Product Discovery through Operation; maturity=MVP+
**Why:** objective=Ensure accountability exists for every risk-bearing decision; rationale=Diffuse or team-level "ownership" collapses under incident pressure; risk_addressed=No one is accountable when something goes wrong; threat_or_failure_mode=Incident occurs, no one has authority or context to respond.
**Applies When:** rule=Always at Tier 2+; questions="Can you name the individual accountable for security decisions today?"; not_applicable_when=Tier 0/1; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=Often implied by breach-notification laws requiring a responsible party; contractual_basis=Standard enterprise security questionnaire requirement.
**Sources:** standards_mappings=SOC 2 CC1 (Control Environment); source_ids=SRC-SOC2; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Low until incident; affected_users=All; affected_assets=Incident response capability.
**Evidence:** required=Org chart or RACI naming individuals per role; acceptable=Current internal wiki/doc with names and last-updated date; unacceptable=Generic "the engineering team" with no named individual.
**Verify:** automated=None; manual=Interview/document review; organizational=Confirm names resolve to active employees/contractors; legal_review=No; prod_verification=No; test_procedure=Ask "who do I call at 2am for a data breach?" and confirm a real answer exists.
**Outcomes:** pass=All four roles named and current; partial=Some roles named, others vague; fail=No named owners; unknown=Cannot obtain organizational chart; release_gate=Yes at Tier 4+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Maintain a single RACI doc; review at every reorg; examples=RACI template in `templates/`; anti_patterns=Ownership implied by Slack channel membership; common_false_confidence="Our team owns it" without a named individual.
**Remediate:** guidance=Assign and document named owners within 30 days; verify_after=Confirm doc published and linked from onboarding.
**Own:** owner=Engineering leadership; effort=Low; dependencies=None.
**Exceptions:** allowed=Limited, for very small teams where one person holds multiple roles (must still be named); approval=Founder/CTO; expiry=Ongoing, reviewed at headcount changes; review=Semiannual.
**Notes:** This control is a prerequisite for `IR-PLAN-001` in Domain 32.

#### GOV-RISKACCEPT-001 — Formal Risk Acceptance Register

**Statement (MUST):** Any known deviation from a mandatory control MUST be recorded in a risk acceptance register with owner, justification, compensating controls, and an expiry date, rather than left as silent technical debt.
**Classify:** Article IX; Domain 1; control_type=Engineering baseline; risk_tier=2+; lifecycle=All; maturity=MVP+
**Why:** objective=Make accepted risk visible instead of hidden; rationale=Undocumented risk acceptance is indistinguishable from negligence after an incident; risk_addressed=Known gaps silently persisting indefinitely; threat_or_failure_mode=A known vulnerability is "temporarily" accepted and never revisited for years.
**Applies When:** rule=Whenever a mandatory control fails and is not immediately remediated; questions="Is there a register of accepted risks?"; not_applicable_when=No known control failures exist (rare); jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Often required for SOC 2/ISO 27001.
**Sources:** standards_mappings=ISO/IEC 27001 (risk treatment); source_ids=SRC-ISO27001; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High (nearly universal in real systems); impact=Variable per accepted item; exploitability=n/a; detectability=Low without a register; affected_users=Variable; affected_assets=Variable per accepted risk.
**Evidence:** required=Risk register with entries matching the schema in `SCORING-AND-GATES.md` § Exceptions; acceptable=Living spreadsheet/ticket system with required fields; unacceptable=Undocumented verbal agreement to "deal with it later."
**Verify:** automated=None; manual=Register review against known Fail-status controls; organizational=Confirm expiry dates are enforced; legal_review=Case-by-case for legal-obligation risks; prod_verification=No; test_procedure=Cross-check register entries against audit findings for coverage.
**Outcomes:** pass=Register exists, current, covers all known Fail/Partial mandatory controls; partial=Register exists but incomplete or has expired entries; fail=No register despite known gaps; unknown=Cannot determine if gaps exist; release_gate=No directly, but expired/missing entries make underlying control failures full release blockers; score_weight=High (8).
**Implement:** guidance=Use the exception schema; review monthly; examples=Exception request template in `templates/`; anti_patterns=Risk accepted via a Slack message that is never centrally tracked; common_false_confidence="We know about that, it's fine" without a written record.
**Remediate:** guidance=Backfill register from known issues/tickets; enforce going forward; verify_after=Confirm register reviewed at defined cadence.
**Own:** owner=Security/engineering leadership; effort=Low ongoing, Medium to backfill; dependencies=Requires audit/control results to populate.
**Exceptions:** allowed=n/a (this control governs exceptions themselves); approval=n/a; expiry=n/a; review=Monthly.
**Notes:** Critical-severity controls should rarely receive open-ended risk acceptance — see Article IX.

---

## Domain 2 — Requirements Engineering

#### REQ-NFR-001 — Non-Functional Requirements Documented Before Build

**Statement (MUST):** Security, privacy, accessibility, reliability, and performance requirements MUST be documented before implementation begins for any Tier 2+ feature, not inferred afterward.
**Classify:** Article II; Domain 2; control_type=Engineering baseline; risk_tier=2+; lifecycle=Requirements Definition; maturity=MVP+
**Why:** objective=Prevent non-functional properties from being an afterthought; rationale=Retrofitting security/accessibility/reliability is dramatically more expensive and error-prone than designing for it; risk_addressed=Systemic gaps discovered only after launch; threat_or_failure_mode=Feature ships, security review finds fundamental architectural gap requiring rework.
**Applies When:** rule=Any new Tier 2+ feature with data handling, external users, or state changes; questions="Were NFRs written before code was?"; not_applicable_when=Trivial UI-only changes with no data/security implications; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP SAMM (Design stream); source_ids=SRC-OWASP-SAMM; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=High; impact=Medium-High; exploitability=n/a; detectability=Medium; affected_users=Feature users; affected_assets=Feature quality.
**Evidence:** required=Requirements doc/ticket with explicit NFR section; acceptable=Linked ticket fields for security/privacy/a11y/perf; unacceptable=NFRs only exist in reviewer's head.
**Verify:** automated=None; manual=Sample of recent feature tickets; organizational=Template enforcement in project tooling; legal_review=No; prod_verification=No; test_procedure=Sample 5 recent Tier 2+ features; check for NFR documentation.
**Outcomes:** pass=NFRs documented for sampled features; partial=Inconsistent documentation; fail=No NFR documentation practice; unknown=Cannot access historical tickets; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Add required NFR fields to ticket template; examples=Ticket template in `templates/`; anti_patterns=NFRs added retroactively to pass an audit; common_false_confidence="We're experienced, we just know to do this" (inconsistent without a checklist).
**Remediate:** guidance=Introduce NFR template; retrain team; verify_after=Sample next quarter's tickets.
**Own:** owner=Product/Engineering; effort=Low; dependencies=None.
**Exceptions:** allowed=Yes for trivial changes; approval=Tech lead; expiry=n/a; review=Quarterly.
**Notes:** Feeds directly into `GREENFIELD-PLAYBOOK.md` "Security Before Code" questions.

#### REQ-TRACE-001 — Requirements-to-Test Traceability for Critical Journeys

**Statement (SHOULD):** Critical user journeys (authentication, payment, data deletion, consent withdrawal) SHOULD have documented traceability from requirement to implementation to test.
**Classify:** Article XI; Domain 2; control_type=Engineering baseline; risk_tier=3+; lifecycle=Requirements through Testing; maturity=Production+
**Why:** objective=Ensure critical behavior is intentionally verified, not incidentally covered; rationale=Untraced requirements are the ones most likely to silently regress; risk_addressed=Critical behavior regresses without detection; threat_or_failure_mode=A refactor silently breaks account-deletion completeness with no failing test.
**Applies When:** rule=Critical user journeys at Tier 3+; questions="Can you point to the test(s) that verify this specific requirement?"; not_applicable_when=Tier 0-2; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=ISO/IEC/IEEE 29148 (requirements engineering); source_ids=SRC-ISO29148; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Medium; impact=High for the specific journey; exploitability=n/a; detectability=Low without traceability; affected_users=Users of the specific journey; affected_assets=Critical journey integrity.
**Evidence:** required=Traceability matrix or linked tests referencing requirement IDs; acceptable=Test names/comments referencing requirement/ticket IDs; unacceptable=No discoverable link between requirement and test.
**Verify:** automated=Static check for test-to-requirement references where tooling supports it; manual=Sample critical journeys; organizational=n/a; legal_review=No; prod_verification=No; test_procedure=Pick 3 critical journeys; attempt to find corresponding tests.
**Outcomes:** pass=Traceable tests found for sampled journeys; partial=Some journeys traceable; fail=No traceability; unknown=Cannot access test suite; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Reference ticket/requirement IDs in test names or comments; examples=`test_deletes_all_user_data_REQ_1234`; anti_patterns=Tests that exist but test something other than the stated requirement; common_false_confidence="We have good test coverage" measured by % lines, not by requirement coverage.
**Remediate:** guidance=Add traceability incrementally starting with highest-risk journeys; verify_after=Confirm matrix updated.
**Own:** owner=QA/Engineering; effort=Medium; dependencies=Existing test suite.
**Exceptions:** allowed=Yes; approval=QA lead; expiry=n/a; review=Semiannual.
**Notes:** Complements Domain 28 (Testing and QA) controls in `CONTROLS-CATALOG-2.md`.

---

## Domain 3 — User Research and Product Design

#### UX-DESTRUCTIVE-001 — Confirmation and Undo for Destructive Actions

**Statement (MUST):** Destructive, hard-to-reverse actions (account deletion, permanent data deletion, irreversible financial transactions) MUST require explicit confirmation and, where feasible, provide a recoverable grace period before permanent effect.
**Classify:** Article XI; Domain 3; control_type=Product-quality requirement; risk_tier=2+; lifecycle=UX Design through Implementation; maturity=MVP+
**Why:** objective=Prevent accidental, irreversible harm to users; rationale=Users make mistakes; irreversible single-click destruction magnifies the cost of any mistake; risk_addressed=Accidental data loss or irreversible action; threat_or_failure_mode=Misclick permanently deletes an account/dataset with no recovery path.
**Applies When:** rule=Any irreversible or hard-to-reverse user-triggered action; questions="What happens if a user clicks this by accident?"; non_applicability=Fully reversible actions; jurisdictions=Universal; industries=Universal; data=User-owned data/resources; users=All; architecture=All; tech=All; legal_basis=Consumer protection/dark-patterns regulations in some jurisdictions (see `LEGAL-APPLICABILITY.md`); contractual_basis=n/a.
**Sources:** standards_mappings=Nielsen Norman Group usability heuristics (error prevention); FTC dark patterns guidance; source_ids=SRC-FTC-DARKPATTERNS; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (unrecoverable for the affected user); exploitability=n/a; detectability=Low until user complains; affected_users=Individual users who trigger the action; affected_assets=User data/trust.
**Evidence:** required=UI flow showing confirmation step and/or grace period; acceptable=Screenshots/recordings of the flow, code implementing soft-delete with grace window; unacceptable=Claim without demonstration.
**Verify:** automated=UI test asserting confirmation dialog appears; manual=Manual walkthrough of destructive flows; organizational=n/a; legal_review=No (unless dark-patterns law applies); prod_verification=Yes; test_procedure=Attempt each destructive action; verify confirmation and, where applicable, recovery window.
**Outcomes:** pass=Confirmation present for all destructive actions; grace period implemented where feasible; partial=Confirmation present but no grace period for critical actions; fail=One-click irreversible destruction with no confirmation; unknown=Not all destructive actions inventoried; release_gate=No (unless combined with legal dark-patterns exposure); score_weight=High (8).
**Implement:** guidance=Soft-delete with N-day recovery window; typed confirmation for the most severe actions; examples=GitHub's "type the repo name to confirm" pattern; anti_patterns=Confirmation dialogs so frequent users reflexively click through them; common_false_confidence="We have a confirm dialog" without considering dialog fatigue.
**Remediate:** guidance=Add confirmation + grace period; verify_after=Re-test flow.
**Own:** owner=Product/Design/Engineering; effort=Medium; dependencies=Soft-delete data model.
**Exceptions:** allowed=Yes for genuinely time-critical actions with documented justification; approval=Product lead; expiry=n/a; review=Annual.
**Notes:** Related to `DATA-LIFE-007` (deletion completeness) in Domain 15.

#### UX-VULNERABLE-001 — Design Considerations for Vulnerable Users

**Statement (SHOULD):** Products SHOULD identify vulnerable user groups (minors, elderly users, users in crisis, users with disabilities, users under financial stress) relevant to their context and document specific design considerations for them.
**Classify:** Article I; Domain 3; control_type=Ethical safeguard; risk_tier=3+; lifecycle=User Research; maturity=Private Beta+
**Why:** objective=Prevent harm concentrated in populations least able to advocate for themselves; rationale=Generic design assumes an idealized user that vulnerable populations rarely match; risk_addressed=Disproportionate harm to vulnerable groups; threat_or_failure_mode=A gambling-adjacent product's design patterns exploit users with impulse-control difficulty.
**Applies When:** rule=Products with a plausible vulnerable-user population (nearly all consumer products); questions="Have vulnerable user groups been explicitly considered?"; not_applicable_when=B2B-only products with no individual-consumer exposure; jurisdictions=Universal, heightened in EU/UK/Australia child-safety and consumer-protection regimes; industries=Consumer-facing especially finance, gambling-adjacent, health, social; data=n/a; users=Identified vulnerable groups; architecture=All; tech=All; legal_basis=Varies (children's privacy laws, consumer protection); contractual_basis=n/a.
**Sources:** standards_mappings=UK ICO Age Appropriate Design Code (as a design-thinking reference); source_ids=SRC-ICO-AADC; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High for affected individuals; exploitability=n/a; detectability=Low without explicit review; affected_users=Vulnerable subpopulations; affected_assets=User wellbeing, trust, legal exposure.
**Evidence:** required=Documented vulnerable-user analysis in design review; acceptable=Design review notes addressing specific groups; unacceptable=No consideration documented.
**Verify:** automated=None; manual=Design review sampling; organizational=n/a; legal_review=Yes if children or health-adjacent; prod_verification=No; test_procedure=Review design docs for vulnerable-user sections.
**Outcomes:** pass=Documented, specific consideration exists; partial=Generic acknowledgment without specifics; fail=No consideration; unknown=Design docs unavailable; release_gate=No generally; Yes if product specifically targets/reaches minors without required safeguards; score_weight=High (8).
**Implement:** guidance=Add a "vulnerable users" section to design review template; examples=Friction/cooling-off periods for financial commitments; anti_patterns=Treating accessibility and vulnerability as the same concern (they overlap but are not identical); common_false_confidence="We have a privacy policy" (irrelevant to design-level vulnerability).
**Remediate:** guidance=Add structured review step; revisit past major features; verify_after=Confirm review artifact exists.
**Own:** owner=Product/Design; effort=Medium; dependencies=UX research capability.
**Exceptions:** allowed=Yes for B2B/internal tools; approval=Product lead; expiry=n/a; review=Annual.
**Notes:** Cross-reference `LEGAL-APPLICABILITY.md` § Children's Privacy for jurisdiction-specific obligations.

---

## Domain 4 — Architecture and System Design

#### ARCH-BOUNDARY-001 — Explicit Trust Boundaries and Data-Flow Diagrams

**Statement (MUST):** Every system handling personal, financial, or authentication data MUST have a documented trust-boundary/data-flow diagram identifying where data crosses between differently-trusted components.
**Classify:** Article II; Domain 4; control_type=Security baseline; risk_tier=2+; lifecycle=Architecture; maturity=MVP+
**Why:** objective=Make implicit trust assumptions explicit and reviewable; rationale=Most authorization and injection failures occur at unexamined trust boundaries; risk_addressed=Unidentified trust boundary allows unauthorized data flow; threat_or_failure_mode=Client-supplied data trusted as if server-validated because the boundary was never mapped.
**Applies When:** rule=Any system with more than one trust level (client/server, tenant/tenant, service/service); questions="Is there a current data-flow diagram?"; not_applicable_when=Fully local, single-user, no network; jurisdictions=Universal; industries=Universal; data=Any sensitive data; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Often required by enterprise security review.
**Sources:** standards_mappings=OWASP Threat Modeling guidance; NIST SP 800-154 (draft data-centric threat modeling); source_ids=SRC-OWASP-TM; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High; impact=High; exploitability=n/a; detectability=Low without a diagram; affected_users=All; affected_assets=Entire system.
**Evidence:** required=Current (reviewed within 12 months) data-flow/trust-boundary diagram; acceptable=Diagram in architecture docs referencing actual components; unacceptable=Diagram that doesn't match current architecture.
**Verify:** automated=None; manual=Diagram review against actual deployed architecture; organizational=n/a; legal_review=No; prod_verification=Spot-check that diagram matches reality; test_procedure=Compare diagram against actual service topology.
**Outcomes:** pass=Current, accurate diagram exists; partial=Diagram exists but stale/incomplete; fail=No diagram; unknown=Cannot verify accuracy; release_gate=No directly, but required input to `SEC-THREAT-001`; score_weight=High (8).
**Implement:** guidance=Maintain as living document alongside architecture decision records; examples=Mermaid/C4 diagrams committed to repo; anti_patterns=One-time diagram made for a single audit, never updated; common_false_confidence="Our architecture is simple enough not to need this" (simplicity is exactly when boundaries get skipped).
**Remediate:** guidance=Create initial diagram via architecture walkthrough; verify_after=Review against next architecture change.
**Own:** owner=Architecture/Engineering leadership; effort=Medium; dependencies=None.
**Exceptions:** allowed=Yes at Tier 0/1; approval=Tech lead; expiry=n/a; review=On every major architecture change, minimum annual.
**Notes:** This is the required input artifact for `SECURITY_ANALYSIS.md` § Applicability Engine.

#### ARCH-SPOF-001 — Single Points of Failure Identified and Justified

**Statement (SHOULD):** Architecture reviews SHOULD explicitly identify single points of failure and document why each is accepted or how it is mitigated.
**Classify:** Article XIII; Domain 4; control_type=Reliability baseline; risk_tier=3+; lifecycle=Architecture; maturity=Public Beta+
**Why:** objective=Prevent unexamined fragility; rationale=Unidentified SPOFs are the most common cause of unplanned, prolonged outages; risk_addressed=Undocumented critical dependency causes cascading outage; threat_or_failure_mode=Single database instance with no failover takes down the entire product.
**Applies When:** rule=Tier 3+ systems with availability expectations; questions="What is the single component whose failure takes down the whole system?"; not_applicable_when=Tier 0-2; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=SLA commitments.
**Sources:** standards_mappings=Google SRE book (reliability engineering); source_ids=SRC-GOOGLE-SRE; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Medium (often found only during incidents); affected_users=All during outage; affected_assets=Availability.
**Evidence:** required=Architecture review notes listing SPOFs and mitigation/acceptance; acceptable=Documented list with owner sign-off; unacceptable=No SPOF analysis performed.
**Verify:** automated=Infrastructure topology analysis where tooling exists; manual=Architecture review; organizational=n/a; legal_review=No; prod_verification=Verify claimed redundancy actually functions (e.g., failover test); test_procedure=Review infra diagram for redundancy at each tier.
**Outcomes:** pass=SPOFs identified with documented acceptance or mitigation; partial=Some SPOFs identified, others missed; fail=No SPOF analysis; unknown=Cannot review infrastructure; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Review each tier (compute, database, network, DNS, third-party dependency) for redundancy; examples=Multi-AZ database, redundant DNS providers; anti_patterns=Assuming cloud-provider managed services are automatically redundant without checking configuration; common_false_confidence="We're on AWS so we're resilient" (depends entirely on configuration).
**Remediate:** guidance=Prioritize SPOFs by blast radius; remediate or formally accept; verify_after=Failover test.
**Own:** owner=Infrastructure/SRE; effort=Medium-High; dependencies=Infrastructure access.
**Exceptions:** allowed=Yes, with documented risk acceptance; approval=Engineering leadership; expiry=Annual review; review=Annual or after major incident.
**Notes:** Directly informs `REL-AVAIL-001` in Domain 30 (`CONTROLS-CATALOG-2.md`).

---

## Domain 5 — Technology Selection

#### TECH-EOL-001 — No Unsupported or End-of-Life Runtime Components

**Statement (MUST):** Production systems MUST NOT run on a language runtime, framework major version, database version, or operating system that has reached its official end-of-life/end-of-support date.
**Classify:** Article II; Domain 5; control_type=Security baseline; risk_tier=1+; lifecycle=Technology Selection through Operation; maturity=Prototype+
**Why:** objective=Ensure security patches remain available; rationale=EOL components no longer receive security patches, turning every future vulnerability into a permanent one; risk_addressed=Unpatchable known vulnerabilities; threat_or_failure_mode=Critical CVE published for an EOL runtime with no vendor fix forthcoming.
**Applies When:** rule=Always; questions="What is the support end date for every major runtime/framework/DB/OS in production?"; not_applicable_when=Never (universal); jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Often explicitly required in enterprise contracts.
**Sources:** standards_mappings=CIS Benchmarks (supported version guidance); source_ids=SRC-CIS; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High over time; impact=Critical; exploitability=High once a CVE is public; detectability=High (easily checked); affected_users=All; affected_assets=Entire runtime environment.
**Evidence:** required=Inventory of runtime/framework/DB/OS versions with EOL dates; acceptable=Automated dependency/version scan output; unacceptable=Assumption that "it's probably fine."
**Verify:** automated=Version scanning tools (e.g., `npm outdated`, OS package managers, vendor EOL trackers); manual=Cross-check against vendor EOL pages; organizational=n/a; legal_review=No; prod_verification=Yes (check actual deployed versions, not just manifest files); test_procedure=Enumerate all runtime components; check each against vendor EOL date.
**Outcomes:** pass=All components within support window; partial=Non-critical component EOL with documented upgrade plan and compensating controls; fail=Critical component (language runtime, DB, OS) past EOL with no plan; unknown=Version inventory incomplete; release_gate=Yes at Tier 3+ for critical components (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Track EOL dates in a dependency dashboard; upgrade proactively, not reactively; examples=endoflife.date as a reference tracker; anti_patterns=Pinning to an old version indefinitely because "upgrading might break something"; common_false_confidence="It still works" (functioning is not the same as supported).
**Remediate:** guidance=Plan and execute upgrade with a rollback strategy; verify_after=Confirm new version and re-run test suite.
**Own:** owner=Engineering/Infrastructure; effort=Variable (Low to Very High depending on version gap); dependencies=Test suite coverage to validate upgrade safety.
**Exceptions:** allowed=Time-boxed only, with compensating controls (network isolation, no internet exposure); approval=Security lead; expiry=90 days maximum; review=Monthly while exception active.
**Notes:** This is one of the most common sources of "unknown unknowns" in audits — always verify actual deployed versions, not just what's declared in configuration.

#### TECH-EXIT-001 — Documented Exit Strategy for Critical Technology Dependencies

**Statement (SHOULD):** For each technology choice that would be costly to reverse (primary database, cloud provider, core framework, identity provider), an exit/migration strategy SHOULD be documented before broad adoption.
**Classify:** Article II; Domain 5; control_type=Engineering baseline; risk_tier=3+; lifecycle=Technology Selection; maturity=Production+
**Why:** objective=Avoid unrecoverable vendor lock-in; rationale=Technology decisions made under time pressure often ignore reversal cost until it's too late; risk_addressed=Inability to leave a failing/price-gouging/discontinued vendor; threat_or_failure_mode=Core vendor discontinues service or changes pricing catastrophically with no viable exit path.
**Applies When:** rule=Any technology choice that is expensive to reverse; questions="If this vendor doubled prices or shut down tomorrow, what would we do?"; not_applicable_when=Easily swappable/commodity technology; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=n/a (engineering judgment, informed by numerous documented vendor-lock-in postmortems); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Low but high impact; impact=High; exploitability=n/a; detectability=Low until a crisis forces the question; affected_users=All; affected_assets=Business continuity.
**Evidence:** required=Written exit-strategy note for each critical dependency; acceptable=Architecture decision record addressing lock-in risk and mitigation; unacceptable=No consideration given.
**Verify:** automated=None; manual=Review ADRs for critical dependencies; organizational=n/a; legal_review=No; prod_verification=No; test_procedure=List critical dependencies; check for exit-strategy documentation on each.
**Outcomes:** pass=Documented for all critical dependencies; partial=Documented for some; fail=Not considered for any; unknown=ADRs unavailable; release_gate=No; score_weight=Low (2).
**Implement:** guidance=Include "reversibility" as a required ADR section; examples=Data export tooling maintained proactively, standard formats used where possible; anti_patterns=Choosing a proprietary format/API with no export path "because it's convenient now"; common_false_confidence="We could always migrate later" without ever validating that assumption.
**Remediate:** guidance=Write retroactive exit-strategy notes for existing critical dependencies; verify_after=Peer review of the note.
**Own:** owner=Architecture/Engineering leadership; effort=Low; dependencies=None.
**Exceptions:** allowed=Yes; approval=Engineering leadership; expiry=n/a; review=Annual or at contract renewal.
**Notes:** Particularly important for AI/LLM provider selection given the pace of change in that market (see Domain 24).

---

## Domain 6 — Repository and Source-Control Governance

#### REPO-BRANCH-001 — Protected Main Branch With Required Review

**Statement (MUST):** The main/production branch MUST be protected such that direct pushes are disabled and changes require at least one independent review before merge, for any Tier 2+ project with more than one contributor.
**Classify:** Article XI; Domain 6; control_type=Engineering baseline; risk_tier=2+; lifecycle=Development Environment Setup; maturity=Prototype+
**Why:** objective=Ensure changes are reviewed before reaching production-bound code; rationale=Unreviewed changes are the single largest source of both bugs and malicious/accidental security regressions; risk_addressed=Unreviewed code reaching production; threat_or_failure_mode=A single compromised or careless contributor pushes a vulnerability or backdoor directly to main.
**Applies When:** rule=Any repository with 2+ contributors at Tier 2+; questions="Can anyone push directly to main without review?"; not_applicable_when=True solo Tier 0/1 projects; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=SOC 2 CC8 (change management).
**Sources:** standards_mappings=OpenSSF Scorecard "Branch-Protection" and "Code-Review" checks; source_ids=SRC-OPENSSF-SCORECARD; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=High (easily verified in repo settings); affected_users=All; affected_assets=Codebase integrity.
**Evidence:** required=Repository branch-protection settings screenshot/API output; acceptable=Confirmed via GitHub/GitLab API that protection rules are active; unacceptable=Verbal policy with no technical enforcement.
**Verify:** automated=Repository API check (OpenSSF Scorecard or equivalent); manual=Settings review; organizational=n/a; legal_review=No; prod_verification=n/a; test_procedure=Query branch protection API; confirm required reviews ≥1 and direct push disabled.
**Outcomes:** pass=Protection enabled with required review; partial=Protection enabled but reviews can be bypassed by admins without logging; fail=No branch protection; unknown=Cannot access repo settings; release_gate=Yes at Tier 3+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Enable branch protection in repo host settings; require status checks to pass; examples=GitHub branch protection rules, GitLab merge request approval rules; anti_patterns=Protection enabled but "administrators" exempted with no audit trail of bypass use; common_false_confidence="We're a small team, we trust each other" (trust is not a substitute for a paper trail, and mistakes matter regardless of team size).
**Remediate:** guidance=Enable settings immediately; effort is near-zero; verify_after=Re-check settings.
**Own:** owner=Engineering leadership; effort=Very Low; dependencies=None.
**Exceptions:** allowed=Solo-maintainer Tier 0/1 only; approval=n/a; expiry=n/a; review=n/a.
**Notes:** One of the highest-value, lowest-effort controls in the entire catalog — near-zero cost, meaningful risk reduction.

#### REPO-SECRETSCAN-001 — Automated Secret Scanning on Every Commit

**Statement (MUST):** Every repository MUST run automated secret scanning on every push/PR, and MUST have historical secret scanning run at least once against full git history.
**Classify:** Article XII; Domain 6, Domain 20; control_type=Security baseline; risk_tier=1+; lifecycle=Development Environment Setup through Operation; maturity=Prototype+
**Why:** objective=Detect committed secrets before/immediately after they reach a shared repository; rationale=Committed secrets are one of the most common and most severe classes of real-world breach root cause; risk_addressed=Exposed credentials enabling unauthorized access; threat_or_failure_mode=API key or database credential committed, repository later made public or breached, credential used for unauthorized access.
**Applies When:** rule=Always; questions="Is secret scanning active on this repository?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=Credentials/secrets; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Standard security questionnaire item.
**Sources:** standards_mappings=OWASP ASVS 5.0 V13 (Configuration); OpenSSF Scorecard; source_ids=SRC-OWASP-ASVS-5, SRC-OPENSSF-SCORECARD; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High (very common mistake); impact=Critical; exploitability=High (automated scanners find public secrets within minutes); detectability=High if scanning is active, near-zero if not; affected_users=All; affected_assets=Every system the leaked credential can access.
**Evidence:** required=CI configuration showing secret-scanning step; historical scan report; acceptable=GitHub secret scanning/push protection enabled, or equivalent tool (gitleaks, trufflehog) in CI; unacceptable=Reliance on developer discipline alone.
**Verify:** automated=Confirm scanning tool configured and passing; manual=Spot-check a deliberately-planted test secret is caught; organizational=n/a; legal_review=No; prod_verification=n/a; test_procedure=Review CI config; confirm historical scan has been run and results triaged.
**Outcomes:** pass=Active scanning on every push + historical scan completed and triaged; partial=Active scanning only, no historical scan; fail=No scanning; unknown=CI configuration not reviewable; release_gate=Yes (Fail blocks at any tier once real credentials exist); score_weight=Critical (12).
**Implement:** guidance=Enable platform-native scanning (GitHub secret scanning + push protection) plus a CI-based scanner as defense in depth; examples=gitleaks, trufflehog, GitHub Advanced Security; anti_patterns=Scanning added but findings never triaged/actioned; common_false_confidence="We use environment variables" (doesn't prevent someone from accidentally committing a `.env` file).
**Remediate:** guidance=If a live secret is found: rotate immediately, then remove from history; treat as a security incident, not a cleanup task; verify_after=Confirm rotation completed and old credential invalidated.
**Own:** owner=Security/Engineering; effort=Low to set up; dependencies=CI/CD pipeline.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `SECRETS-ROTATE-001` (Domain 20) for the incident-response side of a found secret.

---

## Domain 7 — Code Quality and Maintainability

#### CODE-DEBUG-001 — No Debug Code, Bypasses, or Backdoors in Production Builds

**Statement (MUST):** Production builds MUST NOT contain debug endpoints, authentication bypasses, hardcoded test credentials, or "temporary" backdoors, regardless of how they were introduced (including by an AI coding agent).
**Classify:** Article II, Article XIV; Domain 7; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation through Deployment; maturity=Prototype+
**Why:** objective=Eliminate unauthorized access paths hiding in plain sight; rationale=Debug/bypass code written "temporarily" is a leading cause of real breaches because it is forgotten, not because it was malicious; risk_addressed=Hidden unauthorized access path; threat_or_failure_mode=A debug login bypass added to speed up local testing ships to production unnoticed.
**Applies When:** rule=Always; questions="Is there any code path that bypasses normal authentication/authorization for convenience?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V13/V14; source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium (elevated with AI-assisted coding); impact=Critical; exploitability=High once discovered; detectability=Low without deliberate review; affected_users=All; affected_assets=Entire authorization model.
**Evidence:** required=Code review checklist item; static analysis rule for common bypass patterns; acceptable=Grep/static-analysis for suspicious patterns (`if debug`, `if test_mode`, hardcoded credential comparisons) reviewed and cleared; unacceptable=Assumption that "we would have noticed."
**Verify:** automated=Static analysis / custom lint rules for bypass patterns; manual=Targeted code review of auth-adjacent code; organizational=n/a; legal_review=No; prod_verification=Yes — verify deployed artifact, not just source; test_procedure=Search codebase for common bypass markers; attempt documented bypass patterns against a staging deploy.
**Outcomes:** pass=No bypasses found; process exists to prevent introduction; partial=None found in this review but no systematic prevention; fail=A bypass is found; unknown=Codebase not fully reviewable; release_gate=Yes (Fail is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Explicit code-review checklist item; CI rule flagging suspicious patterns for human review; examples=Lint rule flagging `# TODO: remove before prod` near auth code; anti_patterns=Feature-flagging a bypass "temporarily" instead of removing it; common_false_confidence="The AI wrote clean code" — AI agents have been observed introducing exactly this pattern to make their own generated tests pass.
**Remediate:** guidance=Remove immediately upon discovery; treat as a security incident if reachable in a deployed environment; verify_after=Confirm removal and add regression test asserting the bypass path is gone.
**Own:** owner=Engineering/Security; effort=Low to fix once found; dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `VIBE-CODING-ARTICLE.md` § Silent Removal of Security Checks for the AI-specific version of this failure mode.

#### CODE-COMPLEXITY-001 — Complexity Budgets for Security- and Data-Critical Code

**Statement (SHOULD):** Functions/modules implementing authentication, authorization, payment, or data-deletion logic SHOULD stay within a defined complexity budget (e.g., cyclomatic complexity) enforced by static analysis.
**Classify:** Article VII; Domain 7; control_type=Engineering baseline; risk_tier=2+; lifecycle=Implementation; maturity=MVP+
**Why:** objective=Keep the highest-risk code reviewable by humans; rationale=Complexity is inversely correlated with reviewability, and reviewability is a prerequisite for real evidence; risk_addressed=Critical logic too complex to meaningfully review; threat_or_failure_mode=A 300-line authorization function has an edge case no reviewer catches.
**Applies When:** rule=Authn/authz/payment/deletion code paths at Tier 2+; questions="Is there a complexity limit enforced for this code?"; not_applicable_when=Non-critical code paths; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=McCabe cyclomatic complexity (established software engineering metric); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Medium; impact=High if a flaw exists; exploitability=n/a; detectability=Low without automated measurement; affected_users=Variable; affected_assets=Critical logic correctness.
**Evidence:** required=Static analysis report showing complexity metrics for critical modules; acceptable=Linter configuration enforcing a threshold on flagged modules; unacceptable=No measurement.
**Verify:** automated=Complexity linter (e.g., ESLint complexity rule, radon for Python); manual=Review flagged functions; organizational=n/a; legal_review=No; prod_verification=n/a; test_procedure=Run complexity analysis against critical modules; compare against threshold.
**Outcomes:** pass=Critical modules within budget or exceptions documented with extra review; partial=Some modules over budget, undocumented; fail=No measurement/enforcement at all; unknown=Cannot run analysis; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Set threshold (e.g., cyclomatic complexity ≤ 10) for flagged directories/modules; examples=ESLint `complexity` rule, `radon cc` for Python; anti_patterns=Splitting one complex function into many trivially-simple functions that are individually low-complexity but collectively as hard to reason about; common_false_confidence="It passed the linter" without considering whether the split was genuinely clarifying.
**Remediate:** guidance=Refactor flagged critical-path functions; add tests before refactoring; verify_after=Re-run analysis and full test suite.
**Own:** owner=Engineering; effort=Medium; dependencies=Test coverage to safely refactor.
**Exceptions:** allowed=Yes with documented extra review; approval=Tech lead; expiry=Reviewed at next touch of the code; review=Ongoing.
**Notes:** Complexity is a proxy metric, not a goal in itself — see Article VII on evidence quality.

---

## Domain 8 — Frontend Engineering

> **Note:** Deep frontend/browser security controls (CSP, CORS, XSS, client-side storage, WebViews, PWA/service workers) are covered exhaustively in `SECURITY_ANALYSIS.md` § 11 (Web and SaaS Application Constitution) to avoid duplicating and potentially contradicting that treatment. The controls below cover **product-quality** aspects of frontend engineering not already owned by the security document.

#### FE-STATE-001 — Loading, Empty, and Error States Defined for Every Data View

**Statement (MUST):** Every UI view that fetches or displays data MUST define and implement explicit loading, empty, and error states — not just the happy path.
**Classify:** Article XIII; Domain 8; control_type=Product-quality requirement; risk_tier=1+; lifecycle=UX Design through Implementation; maturity=Prototype+
**Why:** objective=Prevent confusing or misleading UI under non-ideal conditions; rationale=Real usage spends significant time in loading/empty/error states, not just the happy path; risk_addressed=Users misinterpret an error as "no data" or a loading state as broken; threat_or_failure_mode=API failure renders a blank screen indistinguishable from "you have no data," causing a user to believe their data was deleted.
**Applies When:** rule=Any data-fetching UI view; questions="What does this view show if the fetch fails? If it's empty? While loading?"; not_applicable_when=Fully static content; jurisdictions=Universal; industries=Universal; data=n/a; users=All; architecture=Frontend; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=Nielsen Norman Group usability heuristics (visibility of system status); source_ids=SRC-NNGROUP; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=High; impact=Medium; exploitability=n/a; detectability=High (easily tested); affected_users=All; affected_assets=User trust, support burden.
**Evidence:** required=UI screenshots/recordings of all three states per view; acceptable=Component tests or Storybook stories covering all three states; unacceptable=Only happy-path screenshots exist.
**Verify:** automated=Component test coverage for state variants; manual=Manual walkthrough forcing each state (network throttling/blocking, empty dataset); organizational=n/a; legal_review=No; prod_verification=No; test_procedure=For a sample of views, force each state and observe behavior.
**Outcomes:** pass=All three states implemented and distinguishable; partial=Some states missing or ambiguous; fail=Only happy path exists; unknown=Cannot access UI for testing; release_gate=No; score_weight=Low (2).
**Implement:** guidance=Add state-handling requirement to component templates/design system; examples=Skeleton loaders, explicit "No results yet" empty states, retry-capable error banners; anti_patterns=Generic "Something went wrong" with no retry path or context; common_false_confidence="We show a spinner" (a spinner alone doesn't cover empty or error states).
**Remediate:** guidance=Audit key views; add missing states; verify_after=Re-test forced states.
**Own:** owner=Frontend engineering/Design; effort=Low-Medium; dependencies=Design system.
**Exceptions:** allowed=Yes for low-traffic internal views; approval=Tech lead; expiry=n/a; review=Ongoing.
**Notes:** Cross-reference `ACC-*` controls in Domain 34 for accessible error messaging.

#### FE-FORMALIGN-001 — Client and Server Validation Must Agree

**Statement (MUST):** Client-side form validation MUST NOT be the sole enforcement of any rule that has security, billing, or data-integrity consequences; server-side validation MUST independently enforce the same rule.
**Classify:** Article V; Domain 8; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent client-side-only enforcement from being trivially bypassed; rationale=Any client can be modified, scripted, or bypassed entirely by calling the API directly; risk_addressed=Rule bypass via direct API call; threat_or_failure_mode=Price/quantity field validated only in JavaScript; a direct API call submits a negative quantity or altered price.
**Applies When:** rule=Any form/input with security, billing, or integrity implications; questions="If this request were sent directly to the API, bypassing the UI entirely, would the rule still be enforced?"; not_applicable_when=Purely cosmetic client-side hints with no consequence if bypassed; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=Client-server; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V1 (Encoding and Sanitization)/V5 (input validation, referenced conceptually); source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High; impact=High; exploitability=High (trivial with any HTTP client); detectability=Medium; affected_users=All; affected_assets=Data integrity, billing accuracy.
**Evidence:** required=Server-side validation code for each client-validated rule; acceptable=Automated test sending a direct API request that violates the rule and confirming rejection; unacceptable=Client-side validation only, unverified server behavior.
**Verify:** automated=API-level negative tests bypassing the UI; manual=Direct API calls via a tool (curl/Postman) attempting to violate each rule; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=For each client-validated rule, send a direct request violating it and confirm server rejection.
**Outcomes:** pass=Server independently enforces every consequential rule; partial=Some rules enforced server-side, others not; fail=Rules exist only client-side; unknown=Cannot test API directly; release_gate=Yes at Tier 3+ for billing/security-relevant rules (Fail blocks); score_weight=High (8).
**Implement:** guidance=Treat client validation purely as UX enhancement; always duplicate logic (or share a validation schema) server-side; examples=Shared schema validation (e.g., Zod/Yup schema reused or mirrored on backend); anti_patterns=Trusting a hidden form field or disabled button as an access control; common_false_confidence="The button is disabled so they can't do that" (client state is not access control).
**Remediate:** guidance=Add server-side validation matching each client rule; verify_after=Re-run direct-API negative tests.
**Own:** owner=Backend/Full-stack engineering; effort=Medium; dependencies=None.
**Exceptions:** allowed=No for security/billing rules; approval=n/a; expiry=n/a; review=n/a.
**Notes:** This is Article V and Article VII applied to the client/server boundary specifically; see `SECURITY_ANALYSIS.md` Immutable Principle 3 for the adversarial framing of the same rule.

---

## Domain 9 — Backend Engineering

#### BE-IDEMPOTENT-001 — Idempotency for State-Changing Operations Subject to Retry

**Statement (MUST):** State-changing operations that a client might retry (payments, order creation, email sends) MUST be idempotent using a client-supplied or server-issued idempotency key.
**Classify:** Article X; Domain 9; control_type=Reliability baseline; risk_tier=2+; lifecycle=Implementation; maturity=MVP+
**Why:** objective=Prevent duplicate effects from retries, double-clicks, or network failures; rationale=Networks are unreliable; clients and infrastructure retry by design; without idempotency, retries cause duplication; risk_addressed=Duplicate charges, duplicate orders, duplicate notifications; threat_or_failure_mode=A payment request times out client-side after the server actually processed it; client retries; customer is charged twice.
**Applies When:** rule=Any state-changing operation with real-world side effects that could plausibly be retried; questions="What happens if this exact request is received twice?"; not_applicable_when=Naturally idempotent operations (e.g., setting a value to a fixed state); jurisdictions=Universal; industries=Universal, especially finance/e-commerce; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Payment processor requirements often mandate this.
**Sources:** standards_mappings=Stripe/major payment processor idempotency-key patterns as industry-standard practice; source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (financial/reputational); exploitability=n/a (mostly a reliability issue, though also abusable); detectability=Medium (visible in support tickets/financial reconciliation); affected_users=Affected transaction's users; affected_assets=Financial integrity, user trust.
**Evidence:** required=Code showing idempotency key generation/storage/check; acceptable=Test demonstrating duplicate request produces single effect; unacceptable=Assumption that "retries are rare so it's fine."
**Verify:** automated=Test sending duplicate requests concurrently and sequentially, asserting single effect; manual=Code review of critical write paths; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Send the identical state-changing request twice (including concurrently); verify exactly one effect occurs.
**Outcomes:** pass=Idempotency verified for all applicable operations; partial=Implemented for some but not all; fail=Not implemented for payment/order-critical paths; unknown=Cannot test; release_gate=Yes at Tier 3+ for payment-adjacent operations (Fail blocks); score_weight=High (8).
**Implement:** guidance=Idempotency key stored with request hash and result, checked before processing; examples=Stripe-style `Idempotency-Key` header pattern; database unique constraint on (idempotency_key, operation_type); anti_patterns="We use HTTPS retries so it should be fine" (transport reliability doesn't address application-level duplication); common_false_confidence="Our load balancer handles retries" (infrastructure-level retry logic doesn't make application logic idempotent).
**Remediate:** guidance=Add idempotency key support to critical write paths; verify_after=Concurrency test.
**Own:** owner=Backend engineering; effort=Medium; dependencies=Database schema change.
**Exceptions:** allowed=Yes for genuinely non-retriable, non-critical operations; approval=Tech lead; expiry=n/a; review=Annual.
**Notes:** See `PAY-DUPLICATE-001` in Domain 39 (`CONTROLS-CATALOG-2.md`) for the payment-specific elaboration, and `SECURITY_ANALYSIS.md` Property Test library for the adversarial framing ("A payment cannot produce duplicate charges under retry or concurrency").

#### BE-GRACEFUL-001 — Graceful Shutdown and In-Flight Request Draining

**Statement (SHOULD):** Backend services SHOULD handle termination signals by ceasing to accept new work, draining in-flight requests up to a bounded timeout, and only then exiting.
**Classify:** Article X; Domain 9; control_type=Reliability baseline; risk_tier=3+; lifecycle=Implementation; maturity=Production+
**Why:** objective=Prevent data loss/corruption during routine deploys and scaling events; rationale=Deploys and autoscaling constantly terminate instances; abrupt termination mid-request causes partial writes and dropped responses; risk_addressed=Corrupted or lost state during deploys/scaling; threat_or_failure_mode=A deploy kills an instance mid-transaction, leaving a partially-written record.
**Applies When:** rule=Any long-running backend service at Tier 3+; questions="What happens to an in-flight request when this process receives SIGTERM?"; not_applicable_when=Stateless functions with no meaningful in-flight duration (e.g., trivial serverless functions); jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=Server/service-based; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=Kubernetes graceful termination documentation (as widely-adopted operational pattern); source_ids=SRC-K8S-DOCS; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=High (happens on every deploy); impact=Medium-High depending on data touched; exploitability=n/a; detectability=Low without deliberate testing; affected_users=Users with in-flight requests during deploys; affected_assets=Data integrity during deploys.
**Evidence:** required=Code implementing signal handling and drain logic; acceptable=Test that sends SIGTERM during active requests and confirms clean completion; unacceptable=No signal handling, relying on default abrupt termination.
**Verify:** automated=Test harness sending SIGTERM under load; manual=Code review of startup/shutdown logic; organizational=n/a; legal_review=No; prod_verification=Observe actual deploy behavior/logs for dropped requests; test_procedure=Send load; issue termination signal; observe whether in-flight requests complete before exit.
**Outcomes:** pass=Graceful drain confirmed under test; partial=Signal handling exists but drain timeout untested/unbounded; fail=No graceful shutdown handling; unknown=Cannot test; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Handle SIGTERM: stop accepting new connections, wait for in-flight to complete (bounded), then exit; examples=Framework-provided graceful shutdown hooks (most modern web frameworks provide this); anti_patterns=Infinite drain wait with no timeout, itself becoming an availability risk; common_false_confidence="Kubernetes handles this" (Kubernetes sends the signal; the application must handle it).
**Remediate:** guidance=Add signal handler with bounded drain timeout; verify_after=Re-run termination test.
**Own:** owner=Backend engineering; effort=Low-Medium; dependencies=None.
**Exceptions:** allowed=Yes for genuinely stateless/instant operations; approval=Tech lead; expiry=n/a; review=Annual.
**Notes:** Directly supports `REL-DEPLOY-001` (Domain 27/30 in `CONTROLS-CATALOG-2.md`).

---

## Domain 10 — API Design and API Security

> **Note:** API-specific injection, authentication, and abuse controls are elaborated further in `SECURITY_ANALYSIS.md` §12 (API and Backend Constitution). The controls below are the product/design-quality baseline.

#### API-BOLA-001 — Object-Level Authorization Enforced on Every Object Reference

**Statement (MUST):** Every API endpoint accepting an object identifier (URL parameter, body field, query parameter) MUST verify that the authenticated caller is authorized for that specific object — not merely authenticated in general.
**Classify:** Article V; Domain 10; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent Broken Object Level Authorization (BOLA), the most common and highest-impact API vulnerability class; rationale=Authentication proves who you are; it says nothing about which specific resources you may access; risk_addressed=One user accessing another user's/tenant's data by manipulating an ID; threat_or_failure_mode=Changing `/api/orders/1234` to `/api/orders/1235` returns another customer's order.
**Applies When:** rule=Every endpoint accepting an object identifier; questions="Does this endpoint verify the caller owns/is authorized for this specific object ID, or only that they are logged in?"; not_applicable_when=Endpoints returning genuinely public data with no access restriction; jurisdictions=Universal; industries=Universal; data=Any user/tenant-scoped data; users=All; architecture=API-based; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP API Security Top 10 (API1:2023 Broken Object Level Authorization); OWASP ASVS 5.0 V4 (Access Control); source_ids=SRC-OWASP-API-TOP10, SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High (most common API vulnerability found in real audits); impact=Critical; exploitability=High (trivial parameter manipulation); detectability=Medium (requires deliberate testing per endpoint); affected_users=All whose data is object-referenceable; affected_assets=All object-scoped data.
**Evidence:** required=Code showing per-object authorization check on every ID-accepting endpoint; automated/manual test results; acceptable=Negative test per endpoint attempting cross-user/cross-tenant object access and confirming denial; unacceptable=Middleware-level authentication presented as proof of object-level authorization.
**Verify:** automated=Automated BOLA scanning against an endpoint inventory where feasible; manual=Manual testing of every endpoint accepting an object ID using a second test account; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=For every object-accepting endpoint, authenticate as User A, attempt to access User B's object by ID; confirm denial.
**Outcomes:** pass=Every tested endpoint correctly denies cross-user/cross-tenant access; partial=Some endpoints correctly enforce, others untested; fail=Any endpoint allows cross-user/cross-tenant object access; unknown=Endpoint inventory incomplete or untestable; release_gate=Yes (any Fail is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Centralize authorization as a required step in the data-access layer, not scattered per-controller checks; examples=ORM-level scoping (e.g., always querying `WHERE tenant_id = :current_tenant`), policy-based authorization frameworks; anti_patterns=Relying on "the ID is a UUID so it's not guessable" (security through obscurity is not access control; IDs leak through logs, referrers, and other channels); common_false_confidence="We check `req.user` exists" (that's authentication, not object-level authorization).
**Remediate:** guidance=Add explicit ownership/tenant check to every flagged endpoint; add regression test per fix; verify_after=Re-run full BOLA test suite.
**Own:** owner=Backend engineering/Security; effort=Medium-High (proportional to endpoint count); dependencies=Endpoint inventory.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** Every audit performed under `AUDIT-PLAYBOOK.md` must explicitly test this control per endpoint — it cannot be sampled away.

#### API-VERSION-001 — Deprecated API Versions Have a Managed Retirement Process

**Statement (SHOULD):** Deprecated API versions SHOULD have a published sunset date, active-usage monitoring, and a process to confirm no critical consumer depends on them before removal.
**Classify:** Article XI; Domain 10; control_type=Engineering baseline; risk_tier=3+; lifecycle=Maintenance; maturity=Production+
**Why:** objective=Prevent orphaned legacy API versions from becoming unmonitored, unpatched attack surface; rationale=Old API versions are frequently forgotten, under-tested, and under-secured relative to the current version; risk_addressed=Legacy API version becomes an unmaintained backdoor around current security controls; threat_or_failure_mode=A v1 API lacking a security fix present in v2 remains callable indefinitely because no one tracked its retirement.
**Applies When:** rule=Any API with more than one active version; questions="Is there a plan and date to retire this old version?"; not_applicable_when=Single-version APIs; jurisdictions=Universal; industries=Universal; data=n/a; users=API consumers; architecture=API-based; tech=All; legal_basis=n/a; contractual_basis=Public API terms of service.
**Sources:** standards_mappings=General API lifecycle management practice; source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=High (very common in practice); impact=Medium-High; exploitability=n/a; detectability=Low without usage monitoring; affected_users=Legacy API consumers; affected_assets=Legacy endpoints.
**Evidence:** required=Deprecation policy document with sunset dates and usage dashboards; acceptable=Published deprecation notices plus usage metrics per version; unacceptable=Old versions left running indefinitely "just in case."
**Verify:** automated=Usage monitoring per API version; manual=Review deprecation policy against actual retirement history; organizational=n/a; legal_review=No; prod_verification=Confirm claimed-deprecated versions have declining/zero usage; test_procedure=Review API version inventory and associated sunset plans.
**Outcomes:** pass=All deprecated versions have a sunset date and monitored usage; partial=Some versions managed, others orphaned; fail=No deprecation process, versions accumulate indefinitely; unknown=Version inventory unavailable; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Publish a deprecation policy (e.g., "N months' notice, then removal"); track per-version usage; examples=`Sunset` HTTP header (RFC 8594), API changelogs; anti_patterns=Deprecating "in name only" with no enforced timeline; common_false_confidence="No one uses the old version" without actual usage data to confirm it.
**Remediate:** guidance=Publish policy; instrument usage tracking; contact remaining consumers before removal; verify_after=Confirm zero usage before final removal.
**Own:** owner=API/Platform engineering; effort=Medium; dependencies=Usage telemetry.
**Exceptions:** allowed=Yes for internal-only APIs with a single known consumer; approval=Tech lead; expiry=n/a; review=Quarterly.
**Notes:** Legacy API versions are a recurring theme in `SECURITY_ANALYSIS.md` attack-chain modeling — "legacy path bypasses current control."

---

## Domain 11 — Authentication and Identity

#### SEC-AUTH-001 — Passwords Hashed With a Modern Adaptive Algorithm

**Statement (MUST):** Stored passwords MUST be hashed using a modern adaptive algorithm (Argon2id, bcrypt, scrypt, or PBKDF2 with an adequate iteration count) and MUST NOT be stored in plaintext, reversibly encrypted, or hashed with a fast general-purpose hash (MD5, SHA-1, unsalted SHA-256).
**Classify:** Article II, Article VII; Domain 11; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent mass credential compromise from a database breach; rationale=Fast hashes make offline brute-force cracking cheap; adaptive hashes make it computationally expensive at scale; risk_addressed=Credential database compromise leading to account takeover; threat_or_failure_mode=Password database leaked; attacker cracks hashes offline in bulk; cracked passwords reused via credential stuffing elsewhere.
**Applies When:** rule=System stores any password credential itself; questions="Does the system store any password itself, or is authentication fully delegated?"; not_applicable_when=Authentication fully delegated to an OAuth/OIDC/SAML identity provider with no local password storage; jurisdictions=Universal; industries=Universal; data=Authentication credentials; users=All authenticated users; architecture=Any with local authentication; tech=All; legal_basis=Relevant to breach-notification exposure; contractual_basis=Standard security questionnaire item.
**Sources:** standards_mappings=OWASP ASVS 5.0 V6 (Authentication), NIST SP 800-63B; source_ids=SRC-OWASP-ASVS-5, SRC-NIST-800-63B; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=Low effort once leaked (cracking is automated); detectability=Low (invisible until a breach occurs); affected_users=All users with stored passwords; affected_assets=Credential store.
**Evidence:** required=Source code/library evidence of hash algorithm and parameters; migration history for any legacy hashes; acceptable=Confirmed call to a vetted library (argon2, bcrypt, PBKDF2) with adequate cost factor; unacceptable=Documentation asserting "passwords are hashed" without algorithm evidence.
**Verify:** automated=Static analysis for hash function calls and parameters; dependency check for password-hashing library; manual=Code review of auth module; verify cost factor against current guidance; organizational=n/a; legal_review=No; prod_verification=Yes (verify deployed artifact matches reviewed source); test_procedure=Locate password-set/verify code path; confirm algorithm/parameters; hash and verify a test password.
**Outcomes:** pass=Adaptive hash with adequate cost factor confirmed in code and deployed artifact; partial=Adaptive algorithm present but cost factor below current guidance; fail=Plaintext, reversible encryption, or fast general-purpose hash used; unknown=Auth code path not locatable/reviewable; release_gate=Yes at Tier 2+ (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Use framework-provided identity libraries where available; otherwise Argon2id with vetted parameters; examples=bcrypt (Node/Ruby/Python), Argon2id via libsodium/argon2 packages, Django's PBKDF2 default, ASP.NET Core Identity defaults; anti_patterns=Custom hash-rolling, unsalted hashes, "encrypting" rather than hashing passwords; common_false_confidence="We use HTTPS so passwords are safe" (conflates transport security with storage security).
**Remediate:** guidance=Migrate to an adaptive hash on next successful login (lazy rehash) or force a reset; verify_after=Confirm new hashes use the adaptive algorithm and legacy hashes are migrated or expired.
**Own:** owner=Backend/security engineering; effort=Medium if migrating legacy hashes; dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Annual or on algorithm-guidance change.
**Notes:** NIST SP 800-63B no longer mandates periodic forced password rotation as a baseline requirement — do not conflate this control with rotation policy.

#### SEC-AUTH-002 — Multi-Factor Authentication Available for Sensitive Accounts

**Statement (MUST):** MFA MUST be available for any account with access to sensitive data or administrative capability, and MUST be required (not merely offered) for administrative/privileged accounts at Tier 3+.
**Classify:** Article V, Article VI; Domain 11; control_type=Security baseline; risk_tier=2+ (available), 3+ (required for admins); lifecycle=Implementation; maturity=MVP+
**Why:** objective=Reduce account-takeover risk from credential compromise alone; rationale=Passwords alone are routinely compromised via phishing, reuse, and breach; a second factor substantially raises attacker cost; risk_addressed=Account takeover via compromised password; threat_or_failure_mode=Phished or credential-stuffed password grants full account access with no additional barrier.
**Applies When:** rule=Any account with sensitive-data or admin access; questions="Is MFA available? Is it required for admins?"; not_applicable_when=No accounts exist (fully anonymous product); jurisdictions=Universal; industries=Universal, heightened for finance/health; data=Sensitive data/admin capability; users=Privileged users especially; architecture=Any with authentication; tech=All; legal_basis=Explicitly or implicitly required by several sectoral regulations (see `LEGAL-APPLICABILITY.md`); contractual_basis=Standard enterprise requirement (often contractually mandated).
**Sources:** standards_mappings=OWASP ASVS 5.0 V6; NIST SP 800-63B (AAL2+); source_ids=SRC-OWASP-ASVS-5, SRC-NIST-800-63B; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High (credential compromise is common); impact=High; exploitability=Medium; detectability=High (easily verified); affected_users=Compromised account holders; affected_assets=Account and all data/capability behind it.
**Evidence:** required=MFA enrollment flow evidence; admin-account enforcement configuration; acceptable=Screenshots/config showing MFA enrollment options and admin enforcement policy; unacceptable=MFA "available" but never actually tested end-to-end.
**Verify:** automated=Configuration check for MFA enforcement policy on admin roles; manual=End-to-end enrollment and login test; organizational=n/a; legal_review=Sector-dependent; prod_verification=Yes; test_procedure=Attempt to configure and use MFA as a test user; attempt admin login without MFA and confirm it is blocked.
**Outcomes:** pass=MFA available broadly, enforced for admins; partial=Available but not enforced for admins; fail=Not available at all; unknown=Cannot test enrollment; release_gate=Yes at Tier 3+ for admin enforcement (Fail blocks); score_weight=High (8).
**Implement:** guidance=Support TOTP and/or passkeys at minimum; enforce for admin roles via policy, not just recommendation; examples=WebAuthn/passkeys, TOTP apps, platform-native MFA (e.g., Auth0, Okta, Cognito); anti_patterns=SMS-only MFA as the sole option for high-value accounts (SIM-swap risk); common_false_confidence="We support SSO" (SSO alone does not guarantee the identity provider enforces MFA).
**Remediate:** guidance=Add MFA support; enforce for admin roles; verify_after=Re-test admin login flow.
**Own:** owner=Backend/Identity engineering; effort=Medium; dependencies=Identity provider capability.
**Exceptions:** allowed=Time-boxed for admin enforcement rollout; approval=Security lead; expiry=90 days; review=Quarterly.
**Notes:** See `SECURITY_ANALYSIS.md` Mobile 6 (Biometrics) for the mobile-specific treatment of a related but distinct concern.

#### SEC-AUTH-003 — Session Tokens Rotated on Privilege Change and Revocable on Demand

**Statement (MUST):** Session/authentication tokens MUST be rotated on login, password change, and privilege elevation, and the system MUST provide a mechanism to revoke active sessions (e.g., on logout-everywhere or account compromise).
**Classify:** Article VI, Article X; Domain 11; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Limit the window and blast radius of a compromised session token; rationale=Long-lived, non-revocable, non-rotating tokens turn a single compromise into a permanent one; risk_addressed=Session fixation, prolonged unauthorized access after compromise or logout; threat_or_failure_mode=A stolen session token remains valid indefinitely with no way for the legitimate user to invalidate it.
**Applies When:** rule=Any system using session tokens/cookies for authentication; questions="Can a user revoke all active sessions? Is the token rotated on login/privilege change?"; not_applicable_when=Fully stateless, single-use authentication with no persistent session concept; jurisdictions=Universal; industries=Universal; data=Session/auth tokens; users=All authenticated users; architecture=Any with sessions; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V7 (Session Management); source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=Medium; detectability=Low without a revocation test; affected_users=Compromised session holders; affected_assets=Session-protected resources.
**Evidence:** required=Code/config showing token rotation on login and a revocation mechanism (e.g., "log out all devices"); acceptable=Test demonstrating a revoked session immediately fails subsequent requests; unacceptable=Tokens with no server-side revocation capability at all (fully stateless JWT with no denylist/short expiry strategy).
**Verify:** automated=Test issuing a session, revoking it, and confirming subsequent use fails; manual=Code review of session lifecycle; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Log in, capture session token, trigger revocation (logout-everywhere/password change), confirm old token immediately rejected.
**Outcomes:** pass=Rotation and revocation both verified working; partial=One present, not the other; fail=Neither present (long-lived, non-revocable tokens); unknown=Cannot test session lifecycle; release_gate=Yes at Tier 3+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Server-side session store or short-lived tokens plus a refresh-token denylist/rotation scheme; examples=Server-side sessions (Redis-backed), short-lived JWT + revocable refresh token; anti_patterns=Long-lived stateless JWTs with no revocation path used for high-privilege sessions; common_false_confidence="JWTs are stateless so we don't need a session store" (statelessness and revocability are in direct tension — this must be an explicit design decision, not a default).
**Remediate:** guidance=Add revocation mechanism; add rotation on privilege change; verify_after=Re-run revocation test.
**Own:** owner=Backend/Identity engineering; effort=Medium; dependencies=Session storage infrastructure.
**Exceptions:** allowed=Yes for very short-lived tokens (e.g., <5 min) with documented justification; approval=Security lead; expiry=n/a; review=Annual.
**Notes:** See `SECURITY_ANALYSIS.md` Mobile 5 (Session and Token Security) for the mobile-specific elaboration distinguishing device unlock, device auth, client auth, and remote authorization.

---

## Domain 12 — Authorization and Access Control

#### AUTHZ-DENY-001 — Deny-by-Default Authorization

**Statement (MUST):** Authorization decisions MUST default to denial. Any code path where an authorization check errors, times out, is misconfigured, or cannot be evaluated MUST deny access, never grant it.
**Classify:** Article X; Domain 12; control_type=Security baseline; risk_tier=1+; lifecycle=Architecture through Implementation; maturity=Prototype+
**Why:** objective=Ensure failures in the authorization system cannot silently become failures open; rationale=Fail-open authorization is one of the most catastrophic and hardest-to-detect classes of bug, because it is invisible until it's exploited; risk_addressed=Authorization failure grants access instead of denying it; threat_or_failure_mode=An authorization service outage causes the calling code to treat "no answer" as "allowed."
**Applies When:** rule=Always, for every authorization decision point; questions="What happens if the authorization check throws an exception or times out?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V4 (Access Control); source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Low frequency but catastrophic; impact=Critical; exploitability=Medium (requires triggering the failure condition); detectability=Very low without deliberate fault-injection testing; affected_users=Potentially all; affected_assets=Everything behind the authorization layer.
**Evidence:** required=Code review of authorization error-handling paths; fault-injection test results; acceptable=Test that forces the authz check to throw/timeout and confirms the request is denied; unacceptable=Untested assumption about error-path behavior.
**Verify:** automated=Fault-injection tests (mock authz service failure, confirm denial); manual=Code review of every catch/error branch touching authorization; organizational=n/a; legal_review=No; prod_verification=Yes where feasible in a controlled test; test_procedure=Simulate authorization-check failure (exception, timeout, malformed response); confirm request is denied, not allowed.
**Outcomes:** pass=All tested failure paths deny access; partial=Some paths correctly deny, others untested; fail=Any tested failure path grants access; unknown=Failure paths not identifiable/testable; release_gate=Yes (any confirmed fail-open path is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Wrap authorization calls such that any exception path results in an explicit deny, never a default `true`/allow; examples=`try { allowed = checkAuth() } catch { allowed = false }` as the only acceptable pattern; anti_patterns=`if (error) { /* log and continue */ }` on an authorization check; common_false_confidence="That would never actually throw" (production systems experience exactly the failure modes developers assume "would never happen").
**Remediate:** guidance=Audit every authorization call site for fail-open branches; fix and add regression tests; verify_after=Re-run fault-injection suite.
**Own:** owner=Backend/Security engineering; effort=Medium (proportional to call-site count); dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** This is Article X made concrete; see `SECURITY_ANALYSIS.md` Immutable Principle 5 ("Deny by default") for the adversarial elaboration.

#### AUTHZ-PRIVREVIEW-001 — Periodic Privileged-Access Review

**Statement (MUST):** Privileged access (admin roles, production database access, infrastructure access, financial-system access) MUST be reviewed at least quarterly, with unnecessary access revoked.
**Classify:** Article VI; Domain 12; control_type=Security baseline; risk_tier=3+; lifecycle=Operation; maturity=Production+
**Why:** objective=Prevent privilege accumulation and stale access from past roles; rationale=Access grants accumulate over time (role changes, project needs) and are rarely revoked proactively; risk_addressed=Former employees/contractors or role-changed staff retain unnecessary privileged access; threat_or_failure_mode=A departed contractor's admin credentials remain active for months because no review process caught it.
**Applies When:** rule=Any system with privileged/administrative access tiers at Tier 3+; questions="When was privileged access last reviewed, and who removed what?"; not_applicable_when=Tier 0-2 or single-operator systems; jurisdictions=Universal; industries=Universal, heightened for regulated industries; data=n/a; users=Privileged users; architecture=All; tech=All; legal_basis=n/a; contractual_basis=SOC 2 CC6 (logical access), commonly required by enterprise contracts.
**Sources:** standards_mappings=SOC 2 CC6; ISO/IEC 27001 Annex A (access review); source_ids=SRC-SOC2, SRC-ISO27001; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High (privilege creep is nearly universal without active management); impact=High; exploitability=n/a; detectability=Low without a review process; affected_users=n/a (systemic risk); affected_assets=All privileged-access-protected systems.
**Evidence:** required=Access review records with reviewer, date, and revocation actions; acceptable=Ticket/log trail of quarterly reviews with concrete revocations noted (or explicit "no changes needed" with confirmation the review occurred); unacceptable=No review process, or review that never results in any revocation (suggests reviews are not substantive).
**Verify:** automated=Access-list export compared against current employment/role roster; manual=Sample review of access-review records; organizational=Confirm review is calendared and owned; legal_review=No; prod_verification=n/a; test_procedure=Request last 2 quarters of access review records; verify they exist, are substantive, and resulted in appropriate action.
**Outcomes:** pass=Quarterly reviews conducted with evidence of substantive action; partial=Reviews conducted but irregular or superficial; fail=No review process exists; unknown=Records unavailable; release_gate=No directly, but a Fail here is a significant finding at Tier 4+; score_weight=High (8).
**Implement:** guidance=Calendar recurring review; cross-reference access lists against HR/roster data; examples=Automated access-review tooling (e.g., identity governance platforms) or a disciplined manual spreadsheet process for smaller teams; anti_patterns=Reviews that rubber-stamp the existing access list without genuine scrutiny; common_false_confidence="We'd notice if someone shouldn't have access" (this is exactly the assumption that access reviews exist to test).
**Remediate:** guidance=Establish review cadence; perform initial catch-up review immediately; verify_after=Confirm next scheduled review occurs and produces action.
**Own:** owner=Security/IT; effort=Low-Medium ongoing; dependencies=Access inventory, HR roster.
**Exceptions:** allowed=Yes for Tier <3; approval=Security lead; expiry=n/a; review=Quarterly.
**Notes:** Should be triggered immediately (not just on schedule) by any offboarding event — see Domain 47 (Organizational Controls).

---

## Domain 13 — Multi-Tenancy

#### TENANT-ISOLATE-001 — Tenant Isolation Enforced at the Data-Access Layer, Verified by Test

**Statement (MUST):** In any multi-tenant system, tenant isolation MUST be enforced at the data-access layer (not only in application-layer logic) and MUST be verified by an automated or manual test that actively attempts cross-tenant access.
**Classify:** Article V, Article VI; Domain 13; control_type=Security baseline; risk_tier=2+; lifecycle=Architecture through Implementation; maturity=MVP+
**Why:** objective=Prevent the single most severe failure class for multi-tenant SaaS: one customer accessing another's data; rationale=Application-layer-only isolation is one missed check away from a breach; data-layer enforcement provides defense in depth; risk_addressed=Cross-tenant data access/breach; threat_or_failure_mode=A missing `WHERE tenant_id = ?` clause in one query exposes all tenants' data through that single endpoint.
**Applies When:** rule=Any system serving more than one customer/organization from shared infrastructure; questions="Is there a test that actively tries to access Tenant B's data as Tenant A and confirms failure?"; not_applicable_when=Single-tenant deployments (fully isolated infrastructure per customer); jurisdictions=Universal; industries=Universal, especially enterprise SaaS; data=All tenant-scoped data; users=All; architecture=Multi-tenant; tech=All; legal_basis=n/a; contractual_basis=Near-universal enterprise contractual requirement.
**Sources:** standards_mappings=OWASP guidance on multi-tenancy (referenced conceptually; no single canonical standard); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical (often the single most damaging possible finding for a SaaS company); exploitability=Medium-High; detectability=Low without deliberate testing; affected_users=All tenants; affected_assets=All tenant data.
**Evidence:** required=Data-access-layer code enforcing tenant scoping (e.g., ORM default scope, row-level security policy); automated/manual cross-tenant test results; acceptable=Passing test suite that authenticates as Tenant A and attempts to access every tested resource type belonging to Tenant B, confirming denial for each; unacceptable=Claim of isolation based only on application-layer code review with no active test.
**Verify:** automated=Automated cross-tenant test suite run in CI; manual=Manual penetration-style testing across resource types; organizational=n/a; legal_review=No; prod_verification=Recommended in a safe/isolated test environment mirroring production configuration; test_procedure=As Tenant A, attempt to read/write/delete every resource type belonging to Tenant B by ID manipulation, search, export, and any bulk operation; confirm denial in every case.
**Outcomes:** pass=Cross-tenant test suite passes across all resource types; partial=Some resource types tested and pass, others untested; fail=Any confirmed cross-tenant access; unknown=No cross-tenant testing has been performed; release_gate=Yes (Fail or Unknown at Tier 3+ blocks release — this is one of the few controls where "Unknown" itself is a blocker); score_weight=Critical (12).
**Implement:** guidance=Enforce tenant scoping via database row-level security or a mandatory ORM-level default scope that cannot be bypassed by omission; examples=PostgreSQL Row-Level Security policies, ORM global scopes requiring explicit opt-out (never explicit opt-in); anti_patterns=Relying on every developer remembering to add a `tenant_id` filter to every query; common_false_confidence="Our application code always filters by tenant" (this is exactly the assumption that fails the first time someone forgets, which is why data-layer enforcement is required, not just recommended).
**Remediate:** guidance=Implement data-layer enforcement (RLS or equivalent); build and run the cross-tenant test suite; treat any finding as a security incident requiring breach assessment; verify_after=Re-run full cross-tenant suite after remediation.
**Own:** owner=Backend engineering/Security; effort=High (architectural); dependencies=Database platform capability.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Every release touching data-access code, minimum quarterly full-suite re-run.
**Notes:** This is the single highest-value control in the entire multi-tenant SaaS category. See `SECURITY_ANALYSIS.md` Immutable Principle "No assumed tenant isolation" and the corresponding property test.

#### TENANT-SUPPORT-001 — Support/Admin Cross-Tenant Access Is Explicit, Logged, and Time-Bound

**Statement (MUST):** Any mechanism allowing internal staff (support, admin, engineering) to view or act on behalf of a tenant MUST require explicit action, be fully logged (who, when, which tenant, what was accessed/changed), and MUST NOT be indistinguishable from normal tenant activity in audit logs.
**Classify:** Article VI, Article XI; Domain 13; control_type=Security baseline; risk_tier=3+; lifecycle=Implementation; maturity=Production+
**Why:** objective=Ensure legitimate cross-tenant access by staff is accountable, not a silent bypass of the isolation model; rationale=Support tooling is a common, often under-scrutinized path around tenant isolation; risk_addressed=Unaccountable or unnoticed staff access to tenant data; threat_or_failure_mode=A support tool allows any staff member to silently view any tenant's data with no log distinguishing this from the tenant's own activity.
**Applies When:** rule=Any internal tool granting cross-tenant visibility/action; questions="If a staff member viewed a tenant's private data via a support tool, would there be a durable, tenant-visible-on-request log of that?"; not_applicable_when=No internal staff access mechanism exists; jurisdictions=Universal, heightened where contractual/regulatory audit rights exist; industries=Universal; data=All tenant data accessible via support tooling; users=Internal staff; architecture=Multi-tenant; tech=All; legal_basis=Relevant to breach-notification/audit obligations; contractual_basis=Frequently an explicit enterprise contract term.
**Sources:** standards_mappings=SOC 2 CC6/CC7 (access and monitoring); source_ids=SRC-SOC2; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a (insider-risk oriented); detectability=Low without dedicated logging; affected_users=All tenants; affected_assets=Tenant data confidentiality, contractual trust.
**Evidence:** required=Support-tool access logs distinguishing staff impersonation/access from normal tenant activity; acceptable=Log entries showing staff identity, target tenant, timestamp, and action, retained per policy; unacceptable=Support access indistinguishable from the tenant's own session in logs.
**Verify:** automated=Log schema review confirming staff-access fields exist and are populated; manual=Sample support-tool sessions against corresponding log entries; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Perform a test support-tool access; confirm a corresponding, attributable log entry is created.
**Outcomes:** pass=All cross-tenant staff access is logged, attributable, and time-bound; partial=Logging exists but incomplete (e.g., missing which data was viewed); fail=No distinguishable logging of staff cross-tenant access; unknown=Support tooling/logs unavailable for review; release_gate=No directly, but a significant finding at Tier 4+; score_weight=High (8).
**Implement:** guidance=Require explicit "access as tenant" action (not ambient access) that triggers a log entry; consider time-boxing the elevated access; examples=Break-glass access patterns with mandatory justification field; anti_patterns=A god-mode admin panel with no distinction between "viewing my own account" and "viewing a customer's account"; common_false_confidence="Only trusted senior staff have this access" (trust is not a substitute for accountability, and it does not scale).
**Remediate:** guidance=Add explicit access-as-tenant flow with logging; retrofit historical access review if feasible; verify_after=Confirm logging captures required fields going forward.
**Own:** owner=Backend engineering/Security; effort=Medium; dependencies=Support tooling architecture.
**Exceptions:** allowed=Yes for very small teams with documented compensating trust/audit process; approval=Security lead; expiry=Reviewed at headcount growth; review=Annual.
**Notes:** Directly relevant to enterprise customer due-diligence questionnaires and SOC 2 audits.

---

## Domain 14 — Database Design and Data Integrity

#### DB-MONEY-001 — Monetary Values Stored as Fixed-Point Integers, Never Floating-Point

**Statement (MUST):** Monetary amounts MUST be stored and computed using fixed-point integer representations (e.g., smallest currency unit as an integer, or a decimal type), and MUST NOT use binary floating-point types.
**Classify:** Article VII; Domain 14; control_type=Engineering baseline; risk_tier=1+; lifecycle=Data Modeling; maturity=Prototype+
**Why:** objective=Prevent rounding-error-induced financial discrepancies; rationale=Binary floating-point cannot exactly represent most decimal fractions, causing cumulative rounding errors in financial calculations; risk_addressed=Incorrect monetary totals, reconciliation failures; threat_or_failure_mode=Repeated floating-point addition of prices produces an off-by-a-cent total that compounds across millions of transactions.
**Applies When:** rule=Any system storing or computing monetary values; questions="What data type stores currency amounts?"; not_applicable_when=No monetary data handled; jurisdictions=Universal; industries=Universal, especially finance/e-commerce; data=Monetary/financial data; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=IEEE 754 floating-point limitations (well-established computer science fact, not a named standard body's guidance but foundational); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (financial/reconciliation/legal); exploitability=n/a; detectability=Low until discrepancies accumulate; affected_users=All transacting users; affected_assets=Financial records.
**Evidence:** required=Database schema showing integer/decimal type for monetary columns; acceptable=Schema definition confirming type; unacceptable=`FLOAT`/`DOUBLE` type used for any monetary column.
**Verify:** automated=Schema linting for float/double types on columns named/tagged as monetary; manual=Schema review; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Review schema for all monetary columns; confirm integer (smallest-unit) or fixed-precision decimal type.
**Outcomes:** pass=All monetary columns use integer/fixed-decimal types; partial=Some columns compliant, others not; fail=Any monetary column uses floating-point; unknown=Schema not reviewable; release_gate=Yes at Tier 2+ for payment-handling systems (Fail blocks); score_weight=High (8).
**Implement:** guidance=Store amounts as integer smallest-currency-unit (e.g., cents) or a `DECIMAL`/`NUMERIC` type with defined precision; examples=PostgreSQL `NUMERIC`, storing cents as `BIGINT`; anti_patterns=`price: 19.99` stored as a JavaScript `Number`/SQL `FLOAT`; common_false_confidence="We round at the end so it's fine" (rounding after the fact doesn't recover information already lost in intermediate floating-point steps).
**Remediate:** guidance=Migrate column type; audit and reconcile historical data for drift; verify_after=Reconciliation test against known-correct totals.
**Own:** owner=Backend engineering; effort=Medium-High (migration risk); dependencies=Data migration tooling.
**Exceptions:** allowed=No for systems handling real money; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `PAY-*` controls in Domain 39 (`CONTROLS-CATALOG-2.md`) for the broader payments treatment.

#### DB-MIGRATION-001 — Migrations Are Reversible or Have a Documented Rollback Plan

**Statement (MUST):** Database schema migrations MUST either be reversible (a tested `down` migration) or have a documented, tested rollback/mitigation plan before being applied to production.
**Classify:** Article XI; Domain 14; control_type=Reliability baseline; risk_tier=2+; lifecycle=Deployment; maturity=MVP+
**Why:** objective=Ensure a bad migration can be recovered from without data loss or extended downtime; rationale=Migrations are one of the highest-risk deployment actions because they can be destructive and hard to undo; risk_addressed=Irreversible bad migration causing data loss or extended outage; threat_or_failure_mode=A migration drops a column still in use by the currently-running application version, causing an outage with no fast rollback path.
**Applies When:** rule=Any schema-changing migration in production; questions="If this migration causes a problem in production, what is the rollback plan, and has it been tested?"; not_applicable_when=Tier 0/1 with no real data at stake; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=General database change-management best practice (zero-downtime migration patterns); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Low until the migration is applied and something goes wrong; affected_users=All during an incident; affected_assets=Database integrity/availability.
**Evidence:** required=Migration tooling configuration; rollback plan documentation for destructive migrations; acceptable=Tested `down` migration, or a documented plan (e.g., backward-compatible multi-step migration, backup-before-migrate procedure); unacceptable=Migrations applied with no rollback consideration at all.
**Verify:** automated=CI step testing migration up/down where feasible; manual=Review of migration plan for destructive changes; organizational=n/a; legal_review=No; prod_verification=Confirm the rollback plan actually works against a realistic data copy, not just in theory; test_procedure=Apply migration to a copy of production-like data; verify application compatibility; execute rollback plan and confirm success.
**Outcomes:** pass=Rollback tested and confirmed working; partial=Rollback plan documented but untested; fail=No rollback consideration for a destructive migration; unknown=Migration history/tooling not reviewable; release_gate=Yes at Tier 3+ for destructive/schema-breaking migrations (Fail blocks); score_weight=High (8).
**Implement:** guidance=Prefer expand-contract (backward-compatible) migration patterns for zero-downtime changes; test rollback against realistic data volume; examples=Add-column-then-backfill-then-remove-old-column pattern; anti_patterns=Single irreversible `DROP COLUMN` migration deployed alongside application code that still reads it; common_false_confidence="We have backups" (a backup is not a rollback plan — see `BACKUP-RESTORE-001` in Domain 33).
**Remediate:** guidance=Add rollback testing to migration review process; verify_after=Confirm process followed on next migration.
**Own:** owner=Backend engineering/DBA; effort=Medium; dependencies=Realistic test data environment.
**Exceptions:** allowed=Yes for genuinely additive, non-destructive migrations; approval=Tech lead; expiry=n/a; review=Per migration.
**Notes:** Complements `RELEASE-ROLLBACK-001` in Domain 27 (`CONTROLS-CATALOG-2.md`).

---

## Domain 15 — Data Governance and Data Lifecycle

#### DATA-INVENTORY-001 — Current Data Inventory Mapping Data Categories to Storage Locations

**Statement (MUST):** A current inventory MUST exist mapping each category of personal/sensitive data collected to every system, vendor, and location where it is stored or processed (including backups, logs, analytics, and AI tools).
**Classify:** Article III, Article XII; Domain 15; control_type=Data-governance baseline; risk_tier=2+; lifecycle=Data Discovery; maturity=MVP+
**Why:** objective=Make data flows visible enough to govern; rationale=You cannot protect, minimize, or delete data you have not inventoried; risk_addressed=Unknown data copies escaping governance (logs, backups, analytics, AI tools); threat_or_failure_mode=A deletion request is fulfilled in the primary database but personal data persists indefinitely in an analytics tool no one remembered.
**Applies When:** rule=Any system collecting personal or sensitive data; questions="Is there a current, complete data inventory?"; not_applicable_when=No personal/sensitive data collected; jurisdictions=Universal (explicitly required under GDPR Art. 30 records of processing for many controllers, and similar under other regimes — see `LEGAL-APPLICABILITY.md`); industries=Universal; data=All personal/sensitive categories; users=n/a; architecture=All; tech=All; legal_basis=GDPR Art. 30 and equivalents where applicable; contractual_basis=Standard due-diligence and DPA requirement.
**Sources:** standards_mappings=GDPR Article 30 (Records of Processing Activities); source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High (most organizations underestimate their real data footprint); impact=High; exploitability=n/a; detectability=Low without a deliberate inventory exercise; affected_users=All data subjects; affected_assets=Every system touching personal data.
**Evidence:** required=Written, current (reviewed within 12 months) data inventory; acceptable=Structured document/spreadsheet/tool mapping data category → systems → vendors → retention; unacceptable=Inventory that only covers the primary database and omits logs/backups/analytics/AI tools.
**Verify:** automated=None generally (some DSPM tools can assist); manual=Inventory review against actual system list, including third-party integrations; organizational=Confirm owner and review cadence; legal_review=Yes for GDPR/equivalent Art. 30 obligation determination; prod_verification=Spot-check inventory accuracy against actual system configuration; test_procedure=Pick a data category (e.g., email address); trace every system/vendor/log that could contain it; compare against the inventory.
**Outcomes:** pass=Inventory exists, current, and traces to actual systems accurately; partial=Inventory exists but incomplete or stale; fail=No inventory; unknown=Cannot verify inventory accuracy; release_gate=No directly, but a prerequisite for numerous other controls (deletion completeness, breach scoping); score_weight=High (8).
**Implement:** guidance=Start from data collection points (forms, APIs, SDKs) and trace forward through every system; examples=Data-flow-register template in `templates/`; anti_patterns=Inventory built once for a compliance exercise and never updated as new tools/vendors are added; common_false_confidence="We know what data we have" (verified false in the overwhelming majority of real audits, especially regarding third-party analytics/AI tool data flows).
**Remediate:** guidance=Conduct systematic inventory exercise; establish an update trigger tied to new vendor/tool onboarding; verify_after=Spot-check accuracy again after 1 quarter.
**Own:** owner=Data/Privacy/Engineering; effort=Medium-High initially, Low to maintain; dependencies=None.
**Exceptions:** allowed=Yes at Tier 0/1; approval=Data owner; expiry=n/a; review=Annual, plus triggered by new vendor/tool adoption.
**Notes:** This is the foundational artifact for nearly every other Domain 15/16 control and for `LEGAL-APPLICABILITY.md` applicability determinations.

#### DATA-LIFE-007 — Account/Data Deletion Is Complete Across the Full Data Lifecycle

**Statement (MUST):** When a user or account is deleted, deletion MUST propagate to primary databases, backups (within a defined, disclosed timeframe), caches, search indexes, logs (or be irreversibly anonymized/redacted), analytics systems, and any third-party vendor holding the data — not only the primary application database.
**Classify:** Article III, Article XII; Domain 15; control_type=Privacy baseline; risk_tier=2+; lifecycle=Data Modeling through Operation; maturity=MVP+
**Why:** objective=Ensure "delete my account" means what users (and often the law) expect it to mean; rationale=Partial deletion that leaves data in secondary systems is a common, serious, and often legally non-compliant failure; risk_addressed=Data persists after a user believes and was told it was deleted; threat_or_failure_mode=A user deletes their account; their data remains fully intact in an analytics warehouse and a third-party email vendor indefinitely.
**Applies When:** rule=Any system offering account/data deletion; questions="Trace a deletion request through every system in the data inventory — does it actually disappear everywhere, on a defined timeline?"; not_applicable_when=No deletion capability offered (itself potentially a separate finding depending on jurisdiction); jurisdictions=Universal, with specific enforceable rights under GDPR/CCPA/DPDP and equivalents — see `LEGAL-APPLICABILITY.md`; industries=Universal; data=All personal data; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 17, CCPA deletion right, DPDP Act erasure right, and equivalents; contractual_basis=Standard DPA term.
**Sources:** standards_mappings=GDPR Article 17 (Right to Erasure); source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High (very commonly incomplete in real systems); impact=Critical (legal and trust exposure); exploitability=n/a; detectability=Very low without deliberate tracing; affected_users=All users who request deletion; affected_assets=Every system in the data inventory.
**Evidence:** required=Deletion propagation map referencing the data inventory (`DATA-INVENTORY-001`); test evidence that a deletion request results in actual removal/anonymization across all mapped systems within the disclosed timeframe; acceptable=Automated or manual test tracing a specific test account's data across all systems pre- and post-deletion; unacceptable=Confirmation only that the primary database record is removed.
**Verify:** automated=Where feasible, automated cross-system verification scripts; manual=Manual trace using the data inventory as a checklist; organizational=Confirm vendor contracts include deletion obligations and vendors have confirmed compliance; legal_review=Yes; prod_verification=Recommended using a real (consented) test account in a production-equivalent environment; test_procedure=Create a test account with data in every mapped system; delete it; verify absence (or defined-timeline pending deletion) in every system.
**Outcomes:** pass=Deletion verified complete across all mapped systems within disclosed timeframe; partial=Deletion complete in most systems, with a documented, disclosed exception (e.g., legally-required retention) for others; fail=Deletion leaves data indefinitely in systems with no disclosed exception; unknown=Data inventory incomplete, so full tracing is not possible; release_gate=Yes at Tier 3+ (Fail or Unknown blocks); score_weight=Critical (12).
**Implement:** guidance=Build deletion as an orchestrated workflow across all mapped systems, not a single database `DELETE`; use vendor deletion APIs/contractual SLAs where direct deletion isn't possible; examples=Deletion job that fans out to each system/vendor with confirmation tracking; anti_patterns="Soft delete" flag set on the primary record while all downstream copies remain untouched indefinitely; common_false_confidence="We delete the user record" (the user record is rarely the only copy of their data).
**Remediate:** guidance=Build/extend the deletion workflow to cover every mapped system; verify_after=Re-run full trace test.
**Own:** owner=Data/Privacy/Engineering; effort=High; dependencies=`DATA-INVENTORY-001` must exist first.
**Exceptions:** allowed=Yes for specific, disclosed, legally-required retention (e.g., financial records); approval=Legal/Privacy; expiry=Tied to the retention period's legal basis; review=Annual.
**Notes:** This is one of the most commonly failed controls in real audits — do not accept "we delete the account" without tracing the full data inventory.

---

## Domain 16 — Privacy Engineering

#### PRIV-CONSENT-001 — Consent Is Freely Given, Specific, Informed, and Withdrawable as Easily as Given

**Statement (MUST):** Where consent is the legal basis for processing, it MUST be freely given (no pre-ticked boxes, no bundling with unrelated terms), specific to each distinct purpose, informed (clear plain-language explanation), and withdrawable through a mechanism no more burdensome than the one used to give it.
**Classify:** Article III; Domain 16; control_type=Privacy baseline / Legal requirement (where applicable); risk_tier=2+; lifecycle=Privacy Design through Operation; maturity=MVP+
**Why:** objective=Ensure consent is real, not a legal fiction; rationale=Invalid consent mechanisms (pre-checked boxes, bundled consent, one-way consent flows) are a leading category of privacy-regulator enforcement action; risk_addressed=Processing based on invalid consent; threat_or_failure_mode=A pre-checked marketing consent checkbox is presented as valid opt-in consent.
**Applies When:** rule=Wherever consent is used as the legal basis for processing; questions="Is consent pre-ticked? Bundled? Is withdrawal as easy as giving it?"; not_applicable_when=Processing relies on a different legal basis (contract necessity, legitimate interest, legal obligation) that has been properly assessed; jurisdictions=EU/UK (GDPR/UK GDPR), and broadly consistent with FTC guidance and most comprehensive privacy laws — see `LEGAL-APPLICABILITY.md` for jurisdiction-specific nuance; industries=Universal; data=Any data collected under a consent basis; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 4(11)/7, and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Articles 4(11) and 7; EDPB Guidelines on Consent; source_ids=SRC-GDPR, SRC-EDPB-CONSENT; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (regulatory and reputational); exploitability=n/a; detectability=Medium (visible via UI audit); affected_users=All whose data relies on this consent; affected_assets=Legal basis for the associated processing.
**Evidence:** required=Screenshots/recordings of consent flows; withdrawal flow evidence; consent-record logs; acceptable=UI evidence showing unticked-by-default checkboxes, granular purpose selection, and an equally-easy withdrawal path; unacceptable=Consent bundled into a single "I agree to Terms and Privacy Policy" checkbox covering unrelated processing purposes.
**Verify:** automated=None generally; manual=UX walkthrough of consent and withdrawal flows; organizational=Review consent-record retention; legal_review=Yes; prod_verification=Yes; test_procedure=Walk through the actual consent flow as a new user; attempt withdrawal; compare effort required for each.
**Outcomes:** pass=Consent flow meets all criteria, withdrawal is equally easy; partial=Consent flow mostly compliant with a specific gap (e.g., withdrawal harder than granting); fail=Pre-ticked boxes, bundled consent, or no meaningful withdrawal path; unknown=Consent flow not reviewable; release_gate=Yes where consent is the sole legal basis for material processing and the control fails (Fail blocks at Tier 3+ in applicable jurisdictions); score_weight=High (8).
**Implement:** guidance=Granular, unticked-by-default checkboxes per purpose; a preference center for withdrawal; examples=Cookie consent banners with genuine "reject non-essential" as prominent as "accept"; anti_patterns=A "reject" option that is visually de-emphasized or requires more clicks than "accept" (a dark pattern); common_false_confidence="We have a checkbox" (a checkbox alone does not establish valid consent — see the four required properties).
**Remediate:** guidance=Redesign consent flow to meet all four properties; audit existing consent records for validity; verify_after=Legal review of redesigned flow.
**Own:** owner=Product/Legal/Privacy; effort=Medium; dependencies=Legal review.
**Exceptions:** allowed=No where consent is the stated legal basis; approval=n/a (use a different legal basis instead if consent cannot be validly obtained); expiry=n/a; review=Annual or on regulatory guidance change.
**Notes:** See `LEGAL-APPLICABILITY.md` for the specific consent requirements under GDPR/UK GDPR/DPDP Act/relevant US state laws, which differ in detail even where the underlying principle is similar.

#### PRIV-MINIMIZE-001 — Data Collection Limited to Declared Purpose

**Statement (MUST):** The system MUST NOT collect personal data beyond what is necessary for its declared, specific purpose. Any new data field collected MUST be traceable to a specific, documented purpose.
**Classify:** Article III; Domain 16; control_type=Privacy baseline / Legal requirement (where applicable); risk_tier=1+; lifecycle=Requirements through Implementation; maturity=Prototype+
**Why:** objective=Reduce breach impact and processing risk by not holding data with no purpose; rationale=Data minimization is both a legal principle in most comprehensive privacy regimes and a practical risk-reduction strategy — data you don't have can't be breached; risk_addressed=Unnecessary data exposure in a breach; unjustifiable processing; threat_or_failure_mode=A signup form collects a phone number "just in case it's useful someday," later breached along with genuinely necessary data.
**Applies When:** rule=Any data field collected; questions="What specific purpose does this field serve, and could that purpose be met without it?"; not_applicable_when=Never (universal principle, though the bar for "necessary" varies); jurisdictions=Universal, explicit legal requirement in GDPR Art. 5(1)(c) and equivalents; industries=Universal; data=All personal data; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 5(1)(c) and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 5(1)(c) (data minimisation); source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=High; impact=Medium (compounds breach impact); exploitability=n/a; detectability=Medium via field-by-field review; affected_users=All; affected_assets=Data footprint/breach surface.
**Evidence:** required=Data inventory (`DATA-INVENTORY-001`) with purpose annotated per field; acceptable=Documented purpose justification per collected field; unacceptable=Fields collected with no documented purpose ("we might need it later" is not a purpose).
**Verify:** automated=None; manual=Field-by-field review of every data-collection point against documented purpose; organizational=Review new-feature data collection at design stage; legal_review=Yes; prod_verification=No; test_procedure=Review every input field/API parameter that captures personal data; confirm a documented purpose exists for each.
**Outcomes:** pass=Every field traces to a documented purpose; partial=Most fields justified, some legacy fields unclear; fail=Systematic over-collection with no purpose discipline; unknown=Cannot review all collection points; release_gate=No directly, but feeds into legal-basis assessment which can be a gate; score_weight=Medium (4).
**Implement:** guidance=Require a purpose justification as part of design review for any new personal-data field; periodically audit existing fields for continued necessity; examples=Design review template requiring "why do we need this field" for every new PII field; anti_patterns=Copying a competitor's signup form fields without independently justifying each one; common_false_confidence="More data might be useful for future features" (speculative future use is not a present lawful purpose).
**Remediate:** guidance=Remove or justify unjustified fields; stop collecting fields lacking a current purpose; verify_after=Re-audit after remediation.
**Own:** owner=Product/Privacy; effort=Low-Medium; dependencies=Data inventory.
**Exceptions:** allowed=Yes with documented legal-basis justification (e.g., legitimate interest with a completed assessment); approval=Privacy/Legal; expiry=Annual review; review=Annual.
**Notes:** Directly supports breach-impact reduction (Domain 32) and simplifies `DATA-LIFE-007` deletion scope.

#### PRIV-LAWFULBASIS-001 — Every Processing Activity Has a Documented, Assessed Lawful Basis

**Statement (MUST):** Every distinct processing activity involving personal data MUST have an identified, documented lawful basis (consent, contract necessity, legal obligation, vital interests, public task, or legitimate interests, or the closest equivalent concept under the applicable jurisdiction's law), assessed and recorded before the activity begins, not retrofitted after a regulator or user asks.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=2+; lifecycle=Privacy Design through Operation; maturity=MVP+
**Why:** objective=Ensure processing is legally grounded, not merely convenient; rationale=Processing without an identified basis is unlawful under most comprehensive privacy regimes regardless of intent; risk_addressed=Unlawful processing; threat_or_failure_mode=A new data use is shipped because it's technically easy, with no one having asked "what is our legal basis for this."
**Applies When:** rule=Every distinct processing purpose; questions="What is the lawful basis for this specific use of this data? Is it documented?"; not_applicable_when=Never, universally applicable wherever personal data is processed; jurisdictions=EU/UK (explicit Art. 6 requirement), broadly good practice elsewhere — see `LEGAL-APPLICABILITY.md`; industries=Universal; data=All personal data; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 6 and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 6; source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Low without a documented register; affected_users=All; affected_assets=Legal defensibility of all associated processing.
**Evidence:** required=Records of Processing Activities register or equivalent, mapping each processing purpose to a stated basis; acceptable=A maintained register reviewed on new-feature introduction; unacceptable=No register exists; basis asserted only when challenged, after the fact.
**Verify:** automated=None; manual=Review register against actual data flows (`DATA-INVENTORY-001`) for completeness; organizational=New-feature design review includes a lawful-basis question; legal_review=Yes; prod_verification=No; test_procedure=Sample several processing activities and confirm each traces to a documented, assessed basis.
**Outcomes:** pass=Register complete and current; partial=Register exists but has gaps or is stale; fail=No register; basis never documented; unknown=Cannot verify register completeness; release_gate=Yes at Tier 3+ in EU/UK-serving systems (Fail blocks); score_weight=High (8).
**Implement:** guidance=Maintain a living Records of Processing Activities document, reviewed at each new-feature design stage; examples=A simple spreadsheet/table mapping purpose → basis → data categories → retention, reviewed quarterly; anti_patterns=Defaulting every purpose to "legitimate interest" without a documented balancing test.
**Remediate:** guidance=Conduct a data-processing audit and backfill the register; verify_after=Legal review of completed register.
**Own:** owner=Legal/Privacy; effort=Medium; dependencies=`DATA-INVENTORY-001`.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=On every new processing purpose.
**Notes:** Feeds `PRIV-RECORDS-001`'s formal recordkeeping requirement at scale.

#### PRIV-RIGHTS-001 — Data Subject Rights (Access, Correction, Deletion, Portability) Are Implemented and Actionable

**Statement (MUST):** The system MUST provide a working mechanism for individuals to exercise access, correction, deletion, and (where legally required) portability rights over their personal data, responding within the applicable jurisdiction's statutory timeline, and MUST NOT require an unreasonable burden (e.g., a phone call during limited hours, a notarized letter) as the only channel.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=2+; lifecycle=Implementation through Operation; maturity=MVP+
**Why:** objective=Give individuals real, exercisable control over their data; rationale=Nearly every comprehensive privacy law in `LEGAL-APPLICABILITY.md` grants these rights; a policy promising them without a working mechanism is a misrepresentation as well as a compliance gap; risk_addressed=Inability to honor legally-mandated rights requests; threat_or_failure_mode=A user requests deletion; the request goes to an unmonitored inbox and is never actioned.
**Applies When:** rule=Any system processing personal data of individuals in a jurisdiction granting these rights; questions="Can a user actually get their data deleted/exported/corrected, and how long does it take?"; not_applicable_when=No personal data is processed; jurisdictions=Broadly applicable — see `LEGAL-APPLICABILITY.md` §§ 2-7 for jurisdiction-specific timelines; industries=Universal; data=All personal data; users=All; architecture=All; tech=All; legal_basis=GDPR Arts. 15-20 and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Arts. 15-20; CCPA/CPRA rights provisions; PIPEDA Principle 9; source_ids=SRC-GDPR, SRC-CCPA; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=High once a request is made and unfulfilled; affected_users=Any user exercising a rights request; affected_assets=Legal compliance posture, user trust.
**Evidence:** required=A tested rights-request flow (in-product or via a documented process) with response-time tracking; acceptable=A completed test request demonstrating data export/deletion actually occurring within the applicable timeline; unacceptable=A privacy policy promising rights with no operational mechanism behind it.
**Verify:** automated=None generally; manual=Submit a test rights request end-to-end and time the response; organizational=Confirm a named team/role owns rights-request fulfillment; legal_review=Yes; prod_verification=Yes; test_procedure=Submit an access and a deletion request as a test user; verify data is actually returned/deleted across all systems (not just the primary database — see `DATA-LIFE-007`).
**Outcomes:** pass=Request fulfilled correctly within the statutory timeline; partial=Mechanism exists but is slow, incomplete, or manual-heavy; fail=No working mechanism, or requests go unfulfilled; unknown=Cannot test within audit scope; release_gate=Yes at Tier 3+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Build a self-service rights-request flow where feasible; for smaller systems, a monitored, SLA-backed inbox with a documented internal fulfillment process is acceptable; examples=An account-settings "Download my data" / "Delete my account" feature; anti_patterns=A "contact us to delete your data" link with no tracked SLA or accountable owner.
**Remediate:** guidance=Build or repair the fulfillment mechanism; audit past unfulfilled requests; verify_after=Re-test end-to-end.
**Own:** owner=Privacy/Support/Engineering; effort=Medium-High; dependencies=`DATA-INVENTORY-001`, `DATA-LIFE-007`.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Annual or on jurisdiction expansion.
**Notes:** See `LEGAL-APPLICABILITY.md` for jurisdiction-specific timelines (e.g., GDPR's one-month default, CCPA's 45-day default).

#### PRIV-CHILDREN-001 — Heightened Protections Apply to Any Product Plausibly Reaching Minors

**Statement (MUST):** Where a product is directed at, marketed to, or knowingly used by minors (age threshold varies by jurisdiction — under 13 for US/COPPA, under 16 by default for GDPR unless a member state lowers it to no less than 13, under 18 for India's DPDP Act), the system MUST implement age-appropriate consent mechanisms (verifiable parental consent where required), MUST NOT use minors' data for targeted advertising or behavioral tracking beyond what the applicable law permits, and MUST apply data minimization more strictly than the general baseline.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline (heightened); risk_tier=1+ (heightened stakes regardless of tier); lifecycle=Product Design through Operation; maturity=Prototype+
**Why:** objective=Protect a population with heightened vulnerability and heightened legal protection; rationale=Every major jurisdiction in `LEGAL-APPLICABILITY.md` imposes stricter rules for children's data than the general baseline, and enforcement action against non-compliant products has been significant and well-publicized; risk_addressed=Unlawful processing of children's data; threat_or_failure_mode=A general-audience product turns out to have a meaningful population of underage users, with no age-gating or consent mechanism ever considered.
**Applies When:** rule=Any product plausibly used by minors, even if not intentionally designed for them; questions="Could a reasonable person expect minors to use this? Do we have any signal that minors are using it?"; not_applicable_when=Product is genuinely and verifiably restricted to an adult-only context (e.g., enterprise B2B tooling with no plausible minor user); jurisdictions=US (COPPA, under 13), EU/UK (GDPR, under 16 default), India (DPDP Act, under 18), and others — see `LEGAL-APPLICABILITY.md`; industries=Universal, heightened for education/gaming/social/entertainment; data=Any data from a minor; users=Minors; architecture=All; tech=All; legal_basis=COPPA, GDPR Art. 8, DPDP Act children's provisions; contractual_basis=n/a.
**Sources:** standards_mappings=COPPA; GDPR Art. 8; DPDP Act 2023 children's data provisions; source_ids=SRC-COPPA, SRC-GDPR, SRC-DPDP; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Low-Medium (depends on product); impact=Critical (regulatory, reputational, and direct harm potential); exploitability=n/a; detectability=Low without deliberate age-signal review; affected_users=Minors; affected_assets=Legal standing, brand trust.
**Evidence:** required=Age-appropriate design assessment; consent mechanism design (if applicable); documented decision on whether the product is plausibly used by minors; acceptable=A completed, dated assessment with a clear conclusion and, if applicable, implemented age-gating/consent/no-targeted-ads controls; unacceptable=No assessment ever performed, treated as "not our problem."
**Verify:** automated=None; manual=Review product design, marketing, and actual user-age signals (if collected) against the applicable threshold; organizational=Legal/privacy sign-off on the assessment; legal_review=Yes; prod_verification=No; test_procedure=Review sign-up flow, marketing materials, and any available age-distribution data.
**Outcomes:** pass=Assessment completed; if applicable, verifiable parental consent and no targeted advertising/tracking of minors implemented; partial=Assessment completed but implementation incomplete; fail=No assessment, or a product clearly reaching minors with no protections; unknown=Insufficient signal to assess; release_gate=Yes at Tier 2+ if any plausible minor-user population exists (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Age-appropriate design assessment during product design (Checklist 1 of `GREENFIELD-PLAYBOOK.md`); if minors are a plausible or intended audience, implement verifiable parental consent and disable behavioral advertising/tracking for that population; anti_patterns=A generic "you must be 13+ to use this" checkbox with no verification and no consequence for a false answer, treated as sufficient compliance.
**Remediate:** guidance=Implement age-gating/consent mechanisms; audit and delete improperly collected children's data; verify_after=Legal review.
**Own:** owner=Legal/Privacy/Product; effort=Medium-High; dependencies=`PRIV-CONSENT-001`.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=On any product/audience change.
**Notes:** India's DPDP Act's under-18 threshold is broader than most other jurisdictions covered — see `LEGAL-APPLICABILITY.md` § 9 for the recommended cross-jurisdictional baseline.

#### PRIV-SENSITIVE-001 — Sensitive Personal Data Categories Receive Heightened Consent and Handling

**Statement (MUST):** Processing of sensitive personal data categories (health, biometric, genetic, precise geolocation, financial account details, government identifiers, sexual orientation, religious/philosophical beliefs, political opinions, trade union membership, criminal history) MUST use opt-in (not opt-out) consent as the default posture unless another lawful basis is properly assessed and documented, and MUST receive access controls and encryption stricter than the general baseline.
**Classify:** Article III; Domain 16; control_type=Privacy baseline (heightened); risk_tier=2+; lifecycle=Data Modeling through Operation; maturity=MVP+
**Why:** objective=Match protection level to harm potential; rationale=Nearly every jurisdiction in `LEGAL-APPLICABILITY.md` defines a "sensitive"/"special category" tier with stricter rules; rationale=Misuse or breach of these categories carries disproportionate harm (discrimination, physical safety, financial fraud); risk_addressed=Inadequate protection of high-harm-potential data; threat_or_failure_mode=Health data is stored with the same access controls as a user's display name.
**Applies When:** rule=Any collection/processing of a sensitive category; questions="Does this data fall into a heightened category under any applicable jurisdiction's definition?"; not_applicable_when=No sensitive categories processed; jurisdictions=Universal concept, category definitions vary — see `LEGAL-APPLICABILITY.md`; industries=Universal, heightened for health/finance/dating/biometric-auth products; data=Sensitive categories as defined above; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 9, CPRA sensitive-PI provisions, and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 9; CPRA sensitive personal information provisions; source_ids=SRC-GDPR, SRC-CCPA; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=n/a; detectability=Medium via data classification review; affected_users=Users whose sensitive data is processed; affected_assets=Sensitive data stores.
**Evidence:** required=Data classification confirming which fields are sensitive-category; consent/basis documentation for each; access-control and encryption configuration for sensitive-category stores; acceptable=Documented opt-in consent flow plus field-level or table-level access restriction and encryption; unacceptable=Sensitive data collected via the same generic consent/access model as ordinary data.
**Verify:** automated=Access-control configuration scan; manual=Review consent flow specifically for sensitive-category fields; organizational=Confirm classification accuracy with data owners; legal_review=Yes; prod_verification=Yes; test_procedure=Attempt access to sensitive-category data with a standard (non-privileged) application credential and confirm additional restriction beyond general data.
**Outcomes:** pass=Opt-in consent (or properly assessed alternative basis) and heightened access/encryption confirmed; partial=One dimension addressed (e.g., consent) but not the other (e.g., access control); fail=Sensitive data treated identically to ordinary data; unknown=Cannot verify classification completeness; release_gate=Yes at Tier 3+ where sensitive categories are processed (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Tag sensitive fields in the data model; apply field/table-level access control and encryption; require explicit opt-in UI for collection; examples=A dedicated "health_data" table with restricted service-account access and audit logging on every read; anti_patterns=Storing a health-related free-text field in the same table and access tier as a user's display name.
**Remediate:** guidance=Reclassify and re-secure sensitive data; obtain proper consent retroactively where feasible or cease processing; verify_after=Access-control re-test.
**Own:** owner=Privacy/Security; effort=Medium-High; dependencies=`DATA-INVENTORY-001`, `CRYPTO-KEYMGMT-001`.
**Exceptions:** allowed=Yes with a documented alternative lawful basis and compensating controls; approval=Legal/Privacy; expiry=Annual review; review=Annual.
**Notes:** Cross-references `SECURITY_ANALYSIS.md` § 18.1 on the limits of encryption-at-rest as a sole control.

#### PRIV-DPIA-001 — Data Protection Impact Assessments Completed Before High-Risk Processing

**Statement (MUST):** Before beginning processing likely to result in high risk to individuals (large-scale sensitive-data processing, systematic large-scale monitoring, large-scale profiling, or processing meeting a "Significant Data Fiduciary"-equivalent threshold), a documented impact assessment MUST be completed identifying risks and mitigations, and MUST be revisited on material change to the processing.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=3+; lifecycle=Design through Operation; maturity=MVP+
**Why:** objective=Force deliberate risk assessment before high-risk processing begins, not after an incident; rationale=Multiple jurisdictions in `LEGAL-APPLICABILITY.md` mandate this (GDPR Art. 35, Quebec Law 25, India's Significant Data Fiduciary provisions); risk_addressed=Unassessed high-risk processing; threat_or_failure_mode=A new large-scale profiling feature ships with no one having assessed its privacy risk.
**Applies When:** rule=Processing meeting a high-risk threshold under any applicable jurisdiction; questions="Does this processing involve large-scale sensitive data, systematic monitoring, or significant profiling?"; not_applicable_when=Processing does not meet any applicable high-risk threshold; jurisdictions=EU/UK (GDPR Art. 35), Quebec (Law 25), India (Significant Data Fiduciary) — see `LEGAL-APPLICABILITY.md`; industries=Universal, heightened for health/finance/ad-tech/biometric; data=Sensitive or large-scale personal data; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 35 and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 35; Quebec Law 25; India DPDP Act (Significant Data Fiduciary provisions); source_ids=SRC-GDPR, SRC-LAW25, SRC-DPDP; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Low-Medium; impact=High; exploitability=n/a; detectability=Low without a triggering-threshold review process; affected_users=All affected by the high-risk processing; affected_assets=Legal compliance posture.
**Evidence:** required=A completed, dated impact assessment document identifying risk and mitigation for the specific processing activity; acceptable=A structured assessment reviewed by privacy/legal before launch; unacceptable=No assessment; risk identified only informally or after the fact.
**Verify:** automated=None; manual=Review the assessment against the actual implemented processing; organizational=Confirm a trigger-review process exists to catch new high-risk processing before launch; legal_review=Yes; prod_verification=No; test_procedure=Sample a recent high-risk feature launch and confirm an assessment was completed beforehand.
**Outcomes:** pass=Assessment completed before launch and revisited on material change; partial=Assessment completed but incomplete or after launch; fail=No assessment despite a clear trigger; unknown=Cannot determine if a trigger applies; release_gate=Yes at Tier 3+ where a trigger condition is met (Fail blocks); score_weight=High (8).
**Implement:** guidance=Build a "does this trigger a DPIA?" checklist into feature design review; examples=A standard DPIA template covering necessity, proportionality, risk, and mitigation; anti_patterns=Treating DPIA as a one-time, whole-company exercise rather than a per-processing-activity requirement.
**Remediate:** guidance=Complete a retroactive assessment; pause processing if material unmitigated risk is identified; verify_after=Legal review of completed assessment.
**Own:** owner=Privacy/Legal; effort=Medium; dependencies=`DATA-INVENTORY-001`, `PRIV-LAWFULBASIS-001`.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=On every new high-risk processing activity.
**Notes:** See `LEGAL-APPLICABILITY.md` §§ 3, 5, 7 for jurisdiction-specific triggering thresholds.

#### PRIV-BYDESIGN-001 — Privacy-Protective Settings Are the Default, Not an Opt-In

**Statement (MUST):** Where a product offers a privacy-relevant configuration choice (visibility settings, data-sharing toggles, tracking preferences), the default state presented to a new user MUST be the more privacy-protective option, requiring an affirmative action to reduce privacy rather than to increase it.
**Classify:** Article III; Domain 16; control_type=Privacy baseline; risk_tier=1+; lifecycle=UX Design through Implementation; maturity=Prototype+
**Why:** objective=Operationalize "privacy by default"; rationale=A default that requires users to discover and act to protect their privacy systematically under-protects the majority who never change defaults; risk_addressed=Unintended over-sharing/over-collection due to permissive defaults; threat_or_failure_mode=A new social feature defaults new users' profiles to "public" rather than "private."
**Applies When:** rule=Any user-configurable privacy-relevant setting; questions="What does a new user get without taking any action — the more or less privacy-protective option?"; not_applicable_when=No privacy-relevant configurable settings exist; jurisdictions=Explicit requirement under GDPR Art. 25 (EU/UK), good practice universally; industries=Universal; data=All; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 25; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 25 (Data Protection by Design and by Default); source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Medium; impact=Medium-High depending on the setting; exploitability=n/a; detectability=High via UX walkthrough; affected_users=New/default users; affected_assets=User privacy posture at scale.
**Evidence:** required=UX walkthrough/screenshots of default states for every privacy-relevant setting; acceptable=Confirmed privacy-protective defaults across all reviewed settings; unacceptable=A setting defaulting to the less protective state with no compensating disclosure.
**Verify:** automated=None; manual=New-account walkthrough reviewing every privacy-relevant default; organizational=Design-review checklist item for new settings; legal_review=No (unless EU/UK, then Yes); prod_verification=Yes; test_procedure=Create a fresh test account and inventory every privacy-relevant setting's default state.
**Outcomes:** pass=All reviewed settings default to the privacy-protective state; partial=Most settings correct, some exceptions without justification; fail=Systematic permissive defaults; unknown=Cannot review all settings; release_gate=No directly, but feeds `PRIV-CONSENT-001` and UX dark-pattern review; score_weight=Medium (4).
**Implement:** guidance=Design review checklist requiring justification for any non-privacy-protective default; examples=New profile visibility defaults to "private," not "public"; anti_patterns=Defaulting to the more data-sharing-friendly option to "improve engagement metrics."
**Remediate:** guidance=Change defaults for new users; consider remediation for existing users defaulted incorrectly; verify_after=Re-walkthrough.
**Own:** owner=Product/Privacy/Design; effort=Low-Medium; dependencies=None.
**Exceptions:** allowed=Yes with documented product justification and privacy review; approval=Privacy lead; expiry=Annual review; review=Annual.
**Notes:** Directly implements Constitutional Article III.

#### PRIV-RECORDS-001 — A Maintained Record of Processing Activities Exists for the Organization

**Statement (SHOULD):** Organizations processing personal data at meaningful scale, or engaging in regular/systematic/high-risk processing, SHOULD maintain a consolidated, current Record of Processing Activities covering all processing purposes, data categories, recipients, retention periods, and safeguards, reviewed on a defined cadence.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=3+; lifecycle=Operation; maturity=Production+
**Why:** objective=Maintain an accurate, auditable inventory of all processing, not just per-feature documentation; rationale=Explicit requirement under GDPR Art. 30 for qualifying organizations, and a practical prerequisite for answering any regulator or individual rights request efficiently; risk_addressed=Inability to answer "what do you do with my data" comprehensively and accurately; threat_or_failure_mode=A breach investigation or regulator inquiry reveals the organization cannot produce a complete picture of its own processing.
**Applies When:** rule=Organization meets GDPR Art. 30 thresholds or equivalent, or as a general best practice at scale; questions="Could we produce a complete, accurate record of all our processing activities on short notice?"; not_applicable_when=Very small organization below applicable thresholds (verify current thresholds); jurisdictions=EU/UK explicit requirement; broadly good practice; industries=Universal; data=All; users=All; architecture=All; tech=All; legal_basis=GDPR Art. 30; contractual_basis=n/a.
**Sources:** standards_mappings=GDPR Article 30; source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=Medium; likelihood=Low; impact=Medium (mainly regulatory-response-speed and completeness risk); exploitability=n/a; detectability=Low until tested by an actual request; affected_users=All; affected_assets=Regulatory response capability.
**Evidence:** required=A maintained, dated Records of Processing Activities document; acceptable=Reviewed at a defined cadence (e.g., quarterly) and updated on new-feature launch; unacceptable=A one-time document created for a past audit and never updated.
**Verify:** automated=None; manual=Spot-check the record against `DATA-INVENTORY-001` and recent feature launches for completeness; organizational=Confirm an owner and review cadence; legal_review=Yes; prod_verification=No; test_procedure=Compare the record against three recently-launched features to confirm currency.
**Outcomes:** pass=Record current, complete, and reviewed on schedule; partial=Record exists but stale or incomplete; fail=No record; unknown=Cannot assess completeness; release_gate=No; score_weight=Medium (4).
**Implement:** guidance=Assign an owner and a quarterly review cadence tied to feature-launch review; examples=A living internal wiki page or dedicated privacy-management tool; anti_patterns=Treating this as a one-time compliance-audit artifact.
**Remediate:** guidance=Reconstruct and then maintain the record; verify_after=Next scheduled review.
**Own:** owner=Privacy/Legal; effort=Low-Medium (ongoing); dependencies=`DATA-INVENTORY-001`, `PRIV-LAWFULBASIS-001`.
**Exceptions:** allowed=Yes for organizations below applicable thresholds; approval=Legal; expiry=n/a; review=Annual threshold re-check.
**Notes:** This is the organization-wide rollup; `DATA-INVENTORY-001` is the underlying technical inventory it draws from.

#### PRIV-OPTOUT-001 — Sale/Sharing/Targeted-Advertising Opt-Out Mechanisms Are Implemented and Honor Universal Signals

**Statement (MUST):** Where the system engages in the sale/sharing of personal data or targeted/cross-context behavioral advertising as defined by applicable law, it MUST provide a clear, easily discoverable opt-out mechanism and MUST honor recognized universal opt-out signals (e.g., Global Privacy Control) as a valid opt-out request without requiring additional action from the user.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=2+; lifecycle=Implementation through Operation; maturity=MVP+
**Why:** objective=Give users a low-friction, technically-enforceable way to opt out of data sale/sharing/targeted advertising; rationale=US state privacy laws (California CCPA/CPRA notably) explicitly require GPC recognition as a valid opt-out; risk_addressed=Users unable to effectively exercise an opt-out right despite a nominal mechanism existing; threat_or_failure_mode=A "Do Not Sell" link exists but is buried, or the site ignores the GPC browser signal entirely.
**Applies When:** rule=System sells/shares personal data or serves targeted advertising as defined by applicable law; questions="Do we sell or share personal data, or serve targeted ads? If so, is there a working opt-out that also honors GPC?"; not_applicable_when=No sale/sharing/targeted advertising occurs; jurisdictions=US state privacy laws (notably California), EU/UK ePrivacy-adjacent consent requirements; industries=Universal, heightened for ad-supported businesses; data=Personal data used for advertising/sale; users=All; architecture=Web/mobile; tech=All; legal_basis=CCPA/CPRA and equivalents; contractual_basis=n/a.
**Sources:** standards_mappings=CCPA/CPRA opt-out provisions; Global Privacy Control specification; source_ids=SRC-CCPA, SRC-GPC; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (regulatory, especially in California); exploitability=n/a; detectability=High via automated GPC-signal testing; affected_users=Users in applicable jurisdictions; affected_assets=Advertising data pipeline.
**Evidence:** required=A working opt-out mechanism; a test confirming GPC signal is honored automatically; acceptable=Automated test sending a GPC signal and confirming the system suppresses sale/sharing/targeted-ad behavior for that session/user without further action; unacceptable=An opt-out link that requires login and multiple steps with no GPC recognition.
**Verify:** automated=Automated browser test sending the GPC header/signal and confirming behavior change; manual=UX review of the opt-out flow; organizational=n/a; legal_review=Yes; prod_verification=Yes; test_procedure=Send a request with the GPC signal set and confirm downstream ad/sale behavior is suppressed for that session.
**Outcomes:** pass=Opt-out mechanism works and GPC is honored automatically; partial=Manual opt-out works but GPC is not honored; fail=No functioning opt-out; unknown=Cannot test; release_gate=Yes at Tier 3+ for systems selling/sharing data or serving targeted ads to US users (Fail blocks); score_weight=High (8).
**Implement:** guidance=Integrate GPC signal detection into the consent-management platform; examples=A CMP that checks for the `Sec-GPC` header/JS property and applies the opt-out automatically; anti_patterns=Only offering an opt-out via a manual form buried in account settings.
**Remediate:** guidance=Implement GPC detection; audit and fix the manual opt-out flow; verify_after=Re-test.
**Own:** owner=Privacy/Engineering; effort=Medium; dependencies=Consent-management tooling.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Annual or on regulatory guidance change.
**Notes:** See `LEGAL-APPLICABILITY.md` § 2.2 for the California-originated model this control primarily addresses.

#### DATA-TRANSFER-001 — Cross-Border Data Transfers Use a Valid, Jurisdiction-Appropriate Legal Mechanism

**Statement (MUST):** Every cross-border transfer of personal data MUST use a valid transfer mechanism recognized by the exporting jurisdiction's law (e.g., an adequacy decision, Standard Contractual Clauses, or Binding Corporate Rules for EU/UK exports; compliance with discloser-accountability obligations for Australian exports; avoidance of any government-restricted destination for Indian exports), tracked per-transfer in a data-flow inventory, not asserted generically.
**Classify:** Article III; Domain 16; control_type=Privacy/legal baseline; risk_tier=2+; lifecycle=Architecture through Operation; maturity=MVP+
**Why:** objective=Ensure cross-border data flows are legally grounded, not merely technically convenient; rationale=Transfer-mechanism *models* differ materially across jurisdictions (see `LEGAL-APPLICABILITY.md` § 9.6) — a single generic answer like "we use SCCs" is insufficient across all of them; risk_addressed=Unlawful cross-border transfer; threat_or_failure_mode=A cloud provider region change moves EU user data to a non-adequate jurisdiction with no transfer mechanism in place.
**Applies When:** rule=Any transfer of personal data across a jurisdictional/national boundary (including to a cloud provider's data centers, sub-processors, or affiliated entities in another country); questions="Where does this specific data actually flow, and what legal mechanism authorizes each hop?"; not_applicable_when=All processing and storage occurs within a single jurisdiction with no cross-border flow; jurisdictions=EU/UK (adequacy/SCC/BCR model), Australia (APP 8 discloser-accountability model), India (blacklist model) — see `LEGAL-APPLICABILITY.md`; industries=Universal; data=All personal data crossing a border; users=All; architecture=Any multi-region/multi-vendor architecture; tech=All; legal_basis=GDPR Ch. V, Privacy Act 1988 APP 8, DPDP Act transfer provisions; contractual_basis=Data processing agreements/SCCs.
**Sources:** standards_mappings=GDPR Chapter V; Privacy Act 1988 APP 8; DPDP Act 2023; source_ids=SRC-GDPR, SRC-AUPRIVACY, SRC-DPDP; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Low without a maintained data-flow inventory; affected_users=All whose data crosses a border; affected_assets=Legal basis for the transfer, vendor relationships.
**Evidence:** required=A per-transfer data-flow inventory recording origin, destination, and the specific legal mechanism relied upon; acceptable=Current SCCs/adequacy confirmation/BCRs on file for each EU/UK export; documented compliance with the discliner-accountability or blacklist model for other jurisdictions as applicable; unacceptable=A generic statement that "we comply with data transfer laws" with no per-transfer mechanism documented.
**Verify:** automated=None; manual=Review the actual infrastructure/vendor topology against the data-flow inventory for completeness; organizational=Vendor onboarding process requires transfer-mechanism confirmation before granting cross-border data access; legal_review=Yes; prod_verification=Yes; test_procedure=Trace one sensitive data category end-to-end through all storage/processing locations and confirm a valid mechanism is documented for every jurisdictional boundary crossed.
**Outcomes:** pass=Complete inventory with valid, current mechanisms for every cross-border flow; partial=Inventory exists but has gaps or an expired mechanism; fail=No inventory, or transfers occurring with no valid mechanism; unknown=Cannot verify infrastructure topology; release_gate=Yes at Tier 3+ where cross-border transfers occur (Fail blocks); score_weight=High (8).
**Implement:** guidance=Maintain a data-flow inventory as part of vendor onboarding and infrastructure change review; examples=A vendor-management checklist requiring SCC execution before any EU personal data is granted to a new non-adequate-country processor; anti_patterns=Assuming a well-known cloud provider's general compliance certifications substitute for transfer-mechanism-specific documentation for your specific data flows.
**Remediate:** guidance=Execute the appropriate mechanism retroactively; consider data localization or vendor change if no mechanism is available; verify_after=Legal review.
**Own:** owner=Legal/Privacy/Infrastructure; effort=Medium-High; dependencies=`VENDOR-DUE-001`, `DATA-INVENTORY-001`.
**Exceptions:** allowed=Yes for a specific, narrow, legally-recognized derogation, with documented legal sign-off; approval=Legal; expiry=Tied to the derogation's own validity; review=On any infrastructure/vendor topology change.
**Notes:** See `LEGAL-APPLICABILITY.md` § 9.6 for why a single generic transfer answer is insufficient across the six covered jurisdictions.

---

## Domain 17 — Application Security (Summary — See `SECURITY_ANALYSIS.md` for Full Depth)

> Application security receives dedicated, adversarial, exhaustive treatment in `SECURITY_ANALYSIS.md` (all major injection classes, business-logic abuse, race conditions, and 24 immutable security principles). The controls below are the minimum bridge set ensuring this catalog is self-contained; do not treat them as a substitute for the full security document.

#### SEC-INPUT-001 — All External Input Is Validated and Output Is Context-Appropriately Encoded

**Statement (MUST):** All input from outside the trust boundary (user input, API payloads, file contents, third-party responses) MUST be validated against an explicit schema/type before use, and all output MUST be encoded appropriately for the context it is rendered into (HTML, SQL, shell, URL, etc.).
**Classify:** Article II; Domain 17; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent injection vulnerabilities at their structural root cause; rationale=Nearly all injection classes (SQL, XSS, command, template) share a common root cause: untrusted data used in a context without appropriate validation/encoding; risk_addressed=Injection attacks (SQLi, XSS, command injection, etc.); threat_or_failure_mode=User-supplied string concatenated directly into a SQL query or rendered directly into HTML without encoding.
**Applies When:** rule=Always, for every external input and every output context; questions="Is this specific input validated against a schema? Is this specific output encoded for its rendering context?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V1 (Encoding and Sanitization); OWASP Top 10 (Injection); source_ids=SRC-OWASP-ASVS-5, SRC-OWASP-TOP10; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High; impact=Critical; exploitability=High; detectability=Medium (static/dynamic analysis can find much of this); affected_users=All; affected_assets=Entire system depending on injection type.
**Evidence:** required=Use of parameterized queries/ORMs, schema validation libraries, templating engines with auto-escaping; automated scan results; acceptable=Code evidence of parameterization/validation plus a clean SAST/DAST scan for injection classes; unacceptable=String concatenation for queries/commands with no parameterization.
**Verify:** automated=SAST for injection patterns; DAST/fuzzing against live endpoints; manual=Code review of all query/command/template construction; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Attempt standard injection payloads (SQLi, XSS, command injection) against every input; confirm rejection or safe handling.
**Outcomes:** pass=No injection found across tested surface, parameterization/encoding confirmed structurally; partial=Some surfaces protected, others unverified; fail=Any confirmed injection vulnerability; unknown=Surface not fully enumerable/testable; release_gate=Yes (any confirmed injection is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Always use parameterized queries/ORM query builders, never string-concatenated queries; use auto-escaping template engines; validate input against an explicit schema (allowlist, not denylist, where feasible); examples=Prepared statements, Zod/Pydantic/JSON Schema validation, React's default JSX escaping; anti_patterns=Denylist-based "sanitization" attempting to strip "bad" characters (routinely bypassable); common_false_confidence="We escape user input" without specifying for which context — encoding correct for HTML is wrong for SQL and vice versa.
**Remediate:** guidance=Refactor to parameterized/validated patterns; add regression tests per fix; verify_after=Re-run injection test suite.
**Own:** owner=Backend/Frontend engineering/Security; effort=Variable; dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `SECURITY_ANALYSIS.md` § 8 (Universal Control Catalog) and § 17 (Application Security domain list in the source prompt) for the full elaboration across every injection subclass.

---

## Domain 18 — Threat Modeling

#### THREAT-MODEL-001 — Threat Model Exists and Is Revisited on Material Architecture Change

**Statement (MUST):** Any Tier 3+ system MUST have a documented threat model (assets, actors, entry points, trust boundaries, abuse cases) created before major implementation and revisited whenever the architecture changes materially.
**Classify:** Article II; Domain 18; control_type=Security baseline; risk_tier=3+; lifecycle=Architecture; maturity=MVP+
**Why:** objective=Ensure security design decisions are made deliberately, not accidentally; rationale=Without an explicit threat model, security controls are chosen reactively rather than to address identified risks; risk_addressed=Unidentified attack surface or threat actor; threat_or_failure_mode=A feature is built without ever considering an insider or an automated-abuse actor, leaving that class of threat completely uncontrolled.
**Applies When:** rule=Tier 3+ systems, and Tier 2 systems handling sensitive data; questions="Is there a current threat model, and when was it last revisited?"; not_applicable_when=Tier 0/1; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Often required for enterprise security review/SOC 2.
**Sources:** standards_mappings=OWASP Threat Modeling; NIST SP 800-154 (draft); source_ids=SRC-OWASP-TM, SRC-NIST-800-154; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=High; impact=High; exploitability=n/a; detectability=Low without a review process; affected_users=All; affected_assets=Entire system.
**Evidence:** required=Written threat model document, dated and owned; acceptable=Document covering assets/actors/entry points/trust boundaries/abuse cases, reviewed within 12 months or since last major architecture change; unacceptable=No documented threat model, or one that predates a major rewrite.
**Verify:** automated=None; manual=Document review against current architecture; organizational=Confirm review trigger tied to architecture-change process; legal_review=No; prod_verification=No; test_procedure=Request threat model; compare against `ARCH-BOUNDARY-001` diagram and current architecture for currency.
**Outcomes:** pass=Current, comprehensive threat model exists; partial=Threat model exists but stale or incomplete; fail=No threat model; unknown=Cannot review; release_gate=No directly at Tier 3, but required precondition for several Tier 4+ gates; score_weight=High (8).
**Implement:** guidance=Use STRIDE or an equivalent structured methodology; tie review to architecture decision records; examples=STRIDE-per-element analysis of the data-flow diagram from `ARCH-BOUNDARY-001`; anti_patterns=A threat model produced once for a single audit and never referenced again; common_false_confidence="We think about security all the time" (ambient awareness is not a substitute for a documented, reviewable artifact).
**Remediate:** guidance=Conduct structured threat-modeling workshop; document and assign owners to identified risks; verify_after=Confirm document published and linked to architecture docs.
**Own:** owner=Security/Architecture; effort=Medium; dependencies=`ARCH-BOUNDARY-001` data-flow diagram.
**Exceptions:** allowed=Yes at Tier 2 with justification; approval=Security lead; expiry=n/a; review=On major architecture change, minimum annual.
**Notes:** See `SECURITY_ANALYSIS.md` § "Research AI and Vibe-Coding Security" for AI-specific threat categories to include.

---

## Domain 19 — Cryptography and Key Management

#### CRYPTO-TRANSIT-001 — All Network Traffic Carrying Sensitive Data Is Encrypted in Transit With Current TLS

**Statement (MUST):** All network communication carrying credentials, personal data, or other sensitive data MUST use TLS 1.2 or higher (TLS 1.3 preferred), with no fallback to deprecated protocols (SSLv3, TLS 1.0/1.1) permitted.
**Classify:** Article II; Domain 19; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation through Operation; maturity=Prototype+
**Why:** objective=Prevent interception/tampering of sensitive data in transit; rationale=Unencrypted or weakly-encrypted transport allows trivial interception on shared/untrusted networks; risk_addressed=Man-in-the-middle interception of credentials/sensitive data; threat_or_failure_mode=A login form submits over HTTP on a public Wi-Fi network, exposing the password in plaintext.
**Applies When:** rule=Always, for any network transmission of sensitive data; questions="Is TLS enforced (not merely available) for every endpoint carrying sensitive data?"; not_applicable_when=Never for internet-facing systems; jurisdictions=Universal; industries=Universal; data=Credentials, personal data, any sensitive data; users=All; architecture=All; tech=All; legal_basis=Explicit or implicit requirement in most breach-notification and security regimes; contractual_basis=PCI DSS explicitly requires this for cardholder data environments.
**Sources:** standards_mappings=PCI DSS v4.0.1 Req 4; OWASP ASVS 5.0 V12 (Communications); source_ids=SRC-PCI-DSS-4.0.1, SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=Medium (requires network position); detectability=High (easily scanned); affected_users=All; affected_assets=All data in transit.
**Evidence:** required=TLS configuration scan results; HTTP-to-HTTPS redirect confirmation; HSTS header presence; acceptable=SSL Labs-equivalent scan showing TLS 1.2+ only, strong cipher suites, valid certificate chain; unacceptable=Any sensitive endpoint reachable over plain HTTP or deprecated TLS.
**Verify:** automated=TLS configuration scanner; manual=Spot-check critical endpoints; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Scan all public-facing endpoints for TLS version, cipher strength, certificate validity, and HTTP-to-HTTPS enforcement.
**Outcomes:** pass=TLS 1.2+ enforced everywhere, no deprecated fallback, HSTS present; partial=TLS enforced but deprecated protocol fallback still enabled, or HSTS missing; fail=Any sensitive endpoint reachable without TLS; unknown=Cannot scan all endpoints; release_gate=Yes (Fail blocks at any tier); score_weight=Critical (12).
**Implement:** guidance=Enforce TLS at the load balancer/reverse-proxy layer; disable deprecated protocol versions; enable HSTS; examples=Managed TLS termination (cloud load balancers, Cloudflare, etc.) with modern cipher suite configuration; anti_patterns=HTTPS available but HTTP not redirected/blocked, leaving a downgrade path; common_false_confidence="We have an SSL certificate" (having a certificate says nothing about enforcement, protocol version, or cipher strength).
**Remediate:** guidance=Update TLS configuration; enforce redirects; add HSTS; verify_after=Re-scan.
**Own:** owner=Infrastructure/Security; effort=Low; dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Continuous automated monitoring recommended, minimum quarterly manual check.
**Notes:** See `SECURITY_ANALYSIS.md` Mobile 8 (Network Communication) for mobile-specific TLS/certificate-pinning considerations.

#### CRYPTO-KEYMGMT-001 — Cryptographic Keys Are Never Hardcoded and Are Managed With Rotation and Access Control

**Statement (MUST):** Encryption/signing keys MUST NOT be hardcoded in source code or committed to version control, MUST be stored in a dedicated secret/key-management system with access control and audit logging, and MUST have a defined rotation procedure.
**Classify:** Article VI; Domain 19; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation through Operation; maturity=Prototype+
**Why:** objective=Prevent key compromise via source-code exposure and enable recovery from suspected compromise; rationale=A hardcoded key is compromised the moment the repository is ever exposed (including to any past contributor, CI log, or breach), and cannot be meaningfully rotated if embedded in shipped artifacts; risk_addressed=Key compromise via source exposure; inability to rotate a compromised key; threat_or_failure_mode=A signing key hardcoded in source is later found in a public repository fork, and cannot be rotated without a full re-deployment of every artifact that embedded it.
**Applies When:** rule=Always, for any cryptographic key used by the system; questions="Where does this key live, and how would we rotate it if compromised today?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=Cryptographic key material; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Standard security requirement.
**Sources:** standards_mappings=OWASP ASVS 5.0 V11 (Cryptography); NIST SP 800-57 (key management); source_ids=SRC-OWASP-ASVS-5, SRC-NIST-800-57; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=High once found; detectability=Low without secret scanning; affected_users=All data protected by the key; affected_assets=All data encrypted/signed with the key.
**Evidence:** required=Key-management system configuration (KMS/HSM/secret manager); documented rotation procedure; acceptable=Confirmed use of a managed KMS with access logging and a tested rotation runbook; unacceptable=Keys embedded in source, configuration files committed to git, or environment variables with no access control/rotation plan.
**Verify:** automated=Secret scanning (see `REPO-SECRETSCAN-001`); KMS access-log review; manual=Code review confirming no hardcoded keys; organizational=Confirm rotation runbook exists and has been exercised; legal_review=No; prod_verification=Yes; test_procedure=Search codebase and build artifacts for key material; confirm KMS/secret-manager usage; execute (or review evidence of) a rotation drill.
**Outcomes:** pass=No hardcoded keys found, KMS in use with access control and a tested rotation procedure; partial=KMS in use but rotation untested, or access logging incomplete; fail=Any hardcoded key found; unknown=Cannot review all code/artifacts; release_gate=Yes (Fail is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Use a managed KMS/HSM or a dedicated secrets manager; never pass keys via plain environment variables in shared CI logs; examples=AWS KMS, GCP Cloud KMS, HashiCorp Vault; anti_patterns=A "config.js" file with hardcoded keys, committed "temporarily" and never removed; common_false_confidence="It's in a private repo" (private today does not mean private forever, and does not protect against insider risk or CI log leakage).
**Remediate:** guidance=Rotate the exposed key immediately; migrate to KMS; scrub history if committed; verify_after=Confirm rotation completed and old key invalidated.
**Own:** owner=Security/Infrastructure; effort=Medium; dependencies=KMS/secrets-manager infrastructure.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=Rotation cadence per key sensitivity, minimum annual.
**Notes:** Custom-built cryptographic primitives are prohibited outright — always use vetted libraries; see `SECURITY_ANALYSIS.md` for the full cryptography domain treatment.

#### CRYPTO-REST-001 — Sensitive Data Stores Are Encrypted at Rest, With the Addressed Threat Model Explicitly Understood

**Statement (MUST):** Data stores containing sensitive/confidential-classified data (per `SECURITY_ANALYSIS.md` § 9.6 classification) MUST be encrypted at rest using platform-managed or dedicated encryption, and the team MUST explicitly document which threat this protects against (physical media theft, storage-layer compromise) versus which threats it does NOT protect against (a live, authenticated application-level compromise with access to the decryption key).
**Classify:** Article II; Domain 19; control_type=Security baseline; risk_tier=2+; lifecycle=Data Modeling through Operation; maturity=MVP+
**Why:** objective=Protect data confidentiality against storage/media-level compromise while avoiding false confidence about what encryption-at-rest does and does not prevent; rationale=Encryption at rest is necessary but is frequently over-relied upon as if it were a complete confidentiality guarantee, per `SECURITY_ANALYSIS.md` § 18.1; risk_addressed=Data exposure via stolen/discarded storage media, or storage-layer access outside the application; threat_or_failure_mode=A decommissioned disk containing unencrypted customer data is improperly disposed of and recovered by a third party.
**Applies When:** rule=Any data store holding confidential/restricted-classified data; questions="Is this store encrypted at rest? What specific threat does that encryption address, and what does it not address?"; not_applicable_when=Data store contains only public data; jurisdictions=Universal, explicit requirement under several regimes (HIPAA Security Rule, GDPR Art. 32) as an appropriate technical measure; industries=Universal, heightened for health/finance; data=Confidential/restricted data; users=n/a; architecture=All; tech=All; legal_basis=GDPR Art. 32 and equivalents; contractual_basis=Often a customer/vendor contractual requirement.
**Sources:** standards_mappings=NIST SP 800-111 (storage encryption); GDPR Article 32; HIPAA Security Rule; source_ids=SRC-NIST-800-111, SRC-GDPR, SRC-HIPAA; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Low (for the specific threat it addresses); impact=High; exploitability=Low (requires physical/storage-layer access); detectability=High via configuration review; affected_users=All whose data is in the affected store; affected_assets=The data store and any recoverable media/snapshots.
**Evidence:** required=Storage/database encryption configuration; documented threat-model note distinguishing what encryption-at-rest does and does not cover; acceptable=Confirmed encryption enabled with managed key handling, plus a documented note referencing `SECURITY_ANALYSIS.md` § 18.1's distinction; unacceptable=Encryption enabled with no understanding of its actual threat coverage, presented as a complete confidentiality control.
**Verify:** automated=Cloud/database configuration scan confirming encryption-at-rest is enabled; manual=Review the documented threat-model note; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Confirm encryption configuration on the actual production data store, not merely a default/staging equivalent.
**Outcomes:** pass=Encryption enabled and threat model documented accurately; partial=Encryption enabled but threat coverage not understood/documented; fail=Sensitive data store unencrypted at rest; unknown=Cannot verify production configuration; release_gate=Yes at Tier 3+ for confidential/restricted data (Fail blocks); score_weight=High (8).
**Implement:** guidance=Enable platform-managed encryption at rest as a baseline; consider field-level encryption with access-scoped keys per `SECURITY_ANALYSIS.md` § 18.1 for the most sensitive fields; anti_patterns=Treating "encryption at rest is on" as sufficient justification to skip access-control rigor, since a compromised application still has decryption access.
**Remediate:** guidance=Enable encryption; migrate existing data if the storage engine requires re-creation; verify_after=Configuration re-scan.
**Own:** owner=Infrastructure/Security; effort=Low-Medium; dependencies=`CRYPTO-KEYMGMT-001`.
**Exceptions:** allowed=Yes for public/non-sensitive data stores (not applicable); approval=n/a; expiry=n/a; review=On data classification change.
**Notes:** See `SECURITY_ANALYSIS.md` § 18.1 (Principle 14) for the critical distinction this control requires teams to document explicitly.

---

## Domain 20 — Secrets Management

#### SECRETS-ROTATE-001 — Exposed Secrets Are Rotated Immediately, Not Merely Removed

**Statement (MUST):** Any secret confirmed or suspected to have been exposed (committed to git, logged, shared insecurely) MUST be rotated (invalidated and replaced) immediately upon discovery, regardless of whether the exposure window seems short.
**Classify:** Article XI; Domain 20; control_type=Security baseline; risk_tier=1+; lifecycle=Operation (Incident Response); maturity=Prototype+
**Why:** objective=Ensure a leaked credential cannot be used even after the leak is "fixed"; rationale=Removing a secret from a file does not invalidate the secret itself — anyone who saw it can still use it; risk_addressed=Continued validity of a known-exposed credential; threat_or_failure_mode=A committed API key is removed from the latest commit, but the key itself is never rotated, remaining fully valid and visible in git history.
**Applies When:** rule=Any confirmed or suspected secret exposure; questions="Was the secret itself invalidated, or only removed from the current file?"; not_applicable_when=Never, once exposure is suspected; jurisdictions=Universal; industries=Universal; data=Credentials/secrets; users=n/a; architecture=All; tech=All; legal_basis=May trigger breach-notification analysis depending on what the credential accesses; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V13; source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=High; detectability=High if scanning is active; affected_users=All behind the exposed credential's access; affected_assets=Everything the credential can access.
**Evidence:** required=Rotation log/ticket showing old credential invalidated and new one issued; acceptable=Confirmed timestamp of rotation matching or immediately following discovery; unacceptable=Only a git history rewrite/removal with no rotation.
**Verify:** automated=Verify old credential returns authentication failure post-rotation; manual=Incident ticket review; organizational=n/a; legal_review=Case-by-case (assess breach-notification obligation based on what was accessible); prod_verification=Yes; test_procedure=Attempt to use the previously-exposed credential; confirm it is rejected.
**Outcomes:** pass=Rotation completed promptly and verified; partial=Rotation completed but with a significant unexplained delay; fail=Secret removed from source but never rotated; unknown=Cannot confirm rotation status; release_gate=Yes (Fail is an automatic Critical blocker/active incident); score_weight=Critical (12).
**Implement:** guidance=Treat every secret-scanning alert as a rotation trigger, not merely a cleanup task; automate rotation where the credential type supports it; examples=Automated key rotation via KMS/secrets-manager APIs; anti_patterns=Closing a secret-scanning alert by force-pushing history removal alone; common_false_confidence="We removed it from the code" (removal ≠ invalidation).
**Remediate:** guidance=Rotate immediately; assess breach-notification obligation; scrub git history as a secondary hygiene step; verify_after=Confirm old credential is rejected everywhere.
**Own:** owner=Security/Incident response; effort=Low-Medium depending on credential type; dependencies=Access to the credential's issuing system.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** Pairs directly with `REPO-SECRETSCAN-001` (Domain 6) — detection without rotation is an incomplete control.

#### SECRETS-CICD-001 — CI/CD Secrets Are Scoped, Not Exposed to Fork-Based Pull Requests

**Statement (MUST):** Secrets available to CI/CD pipelines MUST be scoped to the minimum jobs/environments that need them and MUST NOT be exposed to workflows triggered by pull requests from external forks.
**Classify:** Article VI; Domain 20; control_type=Security baseline; risk_tier=1+; lifecycle=Development Environment Setup; maturity=Prototype+
**Why:** objective=Prevent secret exfiltration via a malicious external contribution; rationale=A public repository's fork-based PR workflow is a well-documented vector for secret exfiltration if secrets are available to untrusted PR-triggered jobs; risk_addressed=CI secret theft via malicious pull request; threat_or_failure_mode=An external contributor opens a PR that modifies the CI workflow to print secret environment variables to build logs, which are then readable by the attacker.
**Applies When:** rule=Any public/open-source repository, or private repository accepting external contributions, using CI/CD; questions="Are secrets exposed to PR-triggered workflows from forks?"; not_applicable_when=Fully private repository with no external contributors and no fork-based workflow; jurisdictions=Universal; industries=Universal; data=CI/CD secrets; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OpenSSF Scorecard "Dangerous-Workflow" and "Token-Permissions" checks; source_ids=SRC-OPENSSF-SCORECARD; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium (higher for public repos); impact=Critical; exploitability=Medium-High; detectability=Low without deliberate CI configuration review; affected_users=All behind the exposed secrets; affected_assets=Everything the CI secrets can access.
**Evidence:** required=CI/CD configuration showing secret scoping and fork-PR restrictions; acceptable=Platform-native settings confirming secrets are unavailable to fork-triggered workflows (e.g., GitHub Actions `pull_request` vs. `pull_request_target` handling); unacceptable=All secrets available to every workflow trigger unconditionally.
**Verify:** automated=OpenSSF Scorecard or equivalent CI configuration scan; manual=Manual CI configuration review; organizational=n/a; legal_review=No; prod_verification=n/a; test_procedure=Review CI workflow definitions and trigger conditions for secret exposure to untrusted contexts.
**Outcomes:** pass=Secrets properly scoped away from untrusted PR contexts; partial=Some workflows scoped correctly, others not; fail=Secrets broadly available to fork-triggered workflows; unknown=CI configuration not reviewable; release_gate=Yes for public repositories at any tier (Fail blocks); score_weight=High (8).
**Implement:** guidance=Use environment-scoped secrets requiring approval for external contributors; avoid `pull_request_target` with checked-out untrusted code and full secret access; examples=GitHub Actions "required reviewers" for environment deployments, separate minimal-permission jobs for untrusted code; anti_patterns=Using `pull_request_target` to get write-level permissions while checking out and running untrusted fork code; common_false_confidence="We review all PRs before merge" (CI often runs automatically on PR open, before any human review occurs).
**Remediate:** guidance=Restructure workflow triggers and secret scoping; verify_after=Confirm via a test PR from a fork that secrets are inaccessible.
**Own:** owner=Engineering/Security; effort=Low-Medium; dependencies=CI/CD platform capability.
**Exceptions:** allowed=Yes for fully private repos with trusted-only contributors; approval=n/a; expiry=n/a; review=On repository visibility change.
**Notes:** This is a common, underappreciated real-world supply-chain attack vector, especially relevant for open-source projects.

---

## Domain 21 — Dependencies and Software Supply Chain

#### SUPPLY-SCAN-001 — Automated Vulnerability Scanning of All Direct and Transitive Dependencies

**Statement (MUST):** All direct and transitive dependencies MUST be scanned for known vulnerabilities on every build/PR and on a recurring schedule (at least weekly), with a defined SLA for remediating findings by severity.
**Classify:** Article II; Domain 21; control_type=Security baseline; risk_tier=1+; lifecycle=Build through Operation; maturity=Prototype+
**Why:** objective=Detect known-vulnerable dependencies before and after they reach production; rationale=The overwhelming majority of dependency vulnerabilities are publicly known before exploitation — the failure is in detection and remediation speed, not the existence of the vulnerability; risk_addressed=Exploitation of a known, patchable dependency vulnerability; threat_or_failure_mode=A critical CVE is published for a dependency in use; the organization has no process to learn about it or triage it, and it remains exploitable for months.
**Applies When:** rule=Always; questions="Is there active vulnerability scanning, and what is the SLA to remediate a Critical finding?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=Standard security questionnaire/SOC 2 requirement.
**Sources:** standards_mappings=NIST SSDF (SP 800-218) PW.4/RV.1; OpenSSF Scorecard "Vulnerabilities" check; source_ids=SRC-NIST-SSDF, SRC-OPENSSF-SCORECARD; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=High; impact=Critical; exploitability=High (public exploits often available quickly); detectability=High if scanning is active, very low if not; affected_users=All; affected_assets=Any system using the vulnerable dependency.
**Evidence:** required=Scanning tool configuration and recent scan results; documented SLA and evidence of adherence; acceptable=Dependabot/Snyk/equivalent configured and active, with a triage log showing Critical/High findings addressed within SLA; unacceptable=Scanning tool installed but alerts never triaged ("alert fatigue" ignored).
**Verify:** automated=Confirm scanning tool active and recent; manual=Review triage history against SLA; organizational=n/a; legal_review=No; prod_verification=Confirm scanned dependency versions match actually-deployed versions; test_procedure=Review current scan results; sample recent Critical/High findings and check remediation timeline against the stated SLA.
**Outcomes:** pass=Scanning active, SLA defined and met; partial=Scanning active but SLA not consistently met, or SLA undefined; fail=No active scanning; unknown=Cannot review scan history; release_gate=Yes for any unremediated Critical finding past its SLA on internet-facing systems at Tier 2+ (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Enable automated dependency scanning (native or third-party); define and enforce an SLA by severity (e.g., Critical: 7 days, High: 30 days); examples=GitHub Dependabot, Snyk, OWASP Dependency-Check; anti_patterns=Scanning tool installed at project start and never checked again; common_false_confidence="Our dependencies are all popular/well-maintained" (popularity does not prevent vulnerabilities; it can increase attacker interest).
**Remediate:** guidance=Triage backlog of existing findings by severity; establish ongoing process; verify_after=Confirm SLA adherence over the following quarter.
**Own:** owner=Engineering/Security; effort=Low to set up, ongoing triage effort thereafter; dependencies=None.
**Exceptions:** allowed=Time-boxed for findings requiring a breaking major-version upgrade, with compensating controls; approval=Security lead; expiry=Defined per exception; review=Weekly for active exceptions.
**Notes:** See `SECURITY_ANALYSIS.md` for SBOM, provenance, and SLSA-related supply-chain controls beyond vulnerability scanning.

#### SUPPLY-INSTALL-001 — Package Names and Provenance Verified Before Installation

**Statement (MUST):** Before adding a new dependency (especially one suggested by an AI coding agent), its package name, publisher, download statistics, and repository MUST be verified to reduce the risk of typosquatting, dependency confusion, or a hallucinated package name.
**Classify:** Article XIV; Domain 21; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent installation of a malicious or non-existent package; rationale=AI coding agents have been observed to "hallucinate" plausible-sounding package names, which attackers then pre-register as intentionally malicious real packages (a known emerging attack pattern); risk_addressed=Malicious/typosquatted package installation, dependency confusion attacks; threat_or_failure_mode=An AI agent suggests installing a package that sounds correct but doesn't exist; an attacker has registered exactly that name with malicious code, and it gets installed.
**Applies When:** rule=Every new dependency addition; questions="Has this exact package name, publisher, and repository been independently verified before installing?"; not_applicable_when=Never; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=Emerging research on AI-assisted supply-chain risk (package hallucination); source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium and rising with AI-assisted development; impact=Critical; exploitability=High; detectability=Low without deliberate verification; affected_users=All; affected_assets=Entire build/runtime environment.
**Evidence:** required=Record/checklist of verification for newly added dependencies (especially AI-suggested ones); acceptable=Confirmed publisher identity, plausible download/usage statistics, matching source repository; unacceptable=Package installed purely because an AI agent or tutorial suggested the name, with no independent check.
**Verify:** automated=Package-registry metadata check (age, downloads, maintainer) where tooling supports it; manual=Manual verification before merge for new dependencies; organizational=n/a; legal_review=No; prod_verification=n/a; test_procedure=For each newly introduced dependency in a PR, verify package registry metadata independently.
**Outcomes:** pass=Verification performed and documented for all new dependencies; partial=Verification performed inconsistently; fail=No verification process, dependencies added on trust alone; unknown=Dependency-addition history not reviewable; release_gate=No directly, but any confirmed malicious package is an automatic Critical incident; score_weight=High (8).
**Implement:** guidance=Add a PR-review checklist item for new dependencies; consider internal package-registry allowlisting for sensitive projects; examples=Checking npm/PyPI package page for publisher history and download counts before merging a PR that adds it; anti_patterns=Accepting an AI agent's suggested `npm install <package>` command without any independent verification; common_false_confidence="The AI wouldn't suggest something wrong" (AI package hallucination and attacker registration of hallucinated names is a documented, real attack pattern — see `VIBE-CODING-ARTICLE.md`).
**Remediate:** guidance=Audit recently-added dependencies for verification gaps; remove/replace any that fail verification; verify_after=Confirm process applied going forward.
**Own:** owner=Engineering; effort=Low; dependencies=None.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `VIBE-CODING-ARTICLE.md` § Hallucinated Package Names for the full treatment of this AI-specific risk pattern.

---

## Domain 22 — File Uploads and File Processing

#### FILE-UPLOAD-001 — Uploaded Files Are Validated by Content, Isolated in Storage, and Never Executed

**Statement (MUST):** Uploaded files MUST be validated by actual content inspection (not just file extension or client-supplied MIME type), stored outside the web root or in isolated object storage with no execute permission, and served with a `Content-Disposition` and content-type that prevent browser execution of untrusted content.
**Classify:** Article II; Domain 22; control_type=Security baseline; risk_tier=1+; lifecycle=Implementation; maturity=Prototype+
**Why:** objective=Prevent uploaded files from becoming a code-execution or content-spoofing vector; rationale=Extension and client-supplied MIME type are both attacker-controlled and trivially spoofed; risk_addressed=Remote code execution via uploaded file, stored XSS via uploaded HTML/SVG, MIME-confusion attacks; threat_or_failure_mode=A file named `image.jpg.php` (or with a spoofed MIME type) is uploaded and later executed by the web server.
**Applies When:** rule=Any file-upload capability; questions="Is the file content actually inspected, and can an uploaded file ever be executed?"; not_applicable_when=No file upload capability exists; jurisdictions=Universal; industries=Universal; data=Uploaded file content; users=All; architecture=Any with upload; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=OWASP ASVS 5.0 V13 (File Handling); source_ids=SRC-OWASP-ASVS-5; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=Medium-High; detectability=Medium; affected_users=All; affected_assets=Server/hosting environment, other users viewing uploaded content.
**Evidence:** required=Code showing content-based file-type validation (magic-byte/signature checking); storage configuration showing isolation and no-execute; serving configuration showing safe content-type/disposition headers; acceptable=Passing test suite that attempts to upload and then execute/trigger malicious file variants; unacceptable=Validation based solely on file extension or client-supplied `Content-Type` header.
**Verify:** automated=Automated tests uploading disguised malicious files (e.g., a PHP file renamed `.jpg`, an SVG containing script) and confirming safe handling; manual=Code review of upload pipeline; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Attempt to upload files with spoofed extensions/MIME types and malicious content; confirm rejection or safe (non-executing) storage/serving.
**Outcomes:** pass=Content-based validation confirmed, storage isolated, safe serving headers confirmed; partial=Content validation present but storage/serving gap exists (e.g., served from web-executable path); fail=Extension/MIME-type-only validation, or uploads stored in an executable location; unknown=Upload pipeline not reviewable; release_gate=Yes (Fail is an automatic Critical blocker); score_weight=Critical (12).
**Implement:** guidance=Validate via magic-byte/signature inspection; store in object storage (e.g., S3-equivalent) separate from application code; serve with `Content-Disposition: attachment` or a sandboxed viewer for untrusted content; strip/re-encode images to remove embedded scripts; examples=Cloud object storage with no execute permission model, image re-encoding libraries; anti_patterns=Storing uploads in a publicly web-accessible directory served directly by the application server; common_false_confidence="We check the file extension" (extension checking is trivially bypassed and does not reflect actual file content).
**Remediate:** guidance=Add content-based validation; migrate storage to an isolated location; verify_after=Re-run malicious-upload test suite.
**Own:** owner=Backend engineering/Security; effort=Medium; dependencies=Object storage infrastructure.
**Exceptions:** allowed=No; approval=n/a; expiry=n/a; review=n/a.
**Notes:** See `SECURITY_ANALYSIS.md` for archive-bomb, malware-scanning, and metadata-stripping elaborations.

---

## Domain 23 — Third-Party Vendors and Integrations

#### VENDOR-DUE-001 — Security and Privacy Review Before Granting a Vendor Access to Sensitive Data

**Statement (MUST):** Before integrating a third-party vendor/service that will receive personal or sensitive data, a documented security/privacy review MUST be completed, including data shared, purpose, retention, and the existence of an appropriate data-processing agreement.
**Classify:** Article XII; Domain 23; control_type=Data-governance baseline; risk_tier=2+; lifecycle=Vendor Selection; maturity=MVP+
**Why:** objective=Prevent uncontrolled expansion of the data-processing trust boundary; rationale=Every vendor added is a new party with access to your data and your users' data, inheriting your compliance and security obligations; risk_addressed=Uncontrolled data exposure to a vendor with inadequate security/privacy practices; threat_or_failure_mode=A vendor is integrated for convenience with no review; the vendor is later breached, exposing data the organization didn't realize it had shared.
**Applies When:** rule=Any new vendor receiving personal/sensitive data; questions="Was this vendor reviewed before data started flowing to it?"; not_applicable_when=Vendor receives no personal/sensitive data; jurisdictions=Universal, explicit DPA requirements under GDPR Art. 28 and equivalents; industries=Universal; data=Any data shared with the vendor; users=All whose data is shared; architecture=All; tech=All; legal_basis=GDPR Art. 28 (processor obligations) and equivalents; contractual_basis=Standard.
**Sources:** standards_mappings=GDPR Article 28; source_ids=SRC-GDPR; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High; exploitability=n/a; detectability=Low without a review gate; affected_users=Users whose data reaches the vendor; affected_assets=Data shared with the vendor.
**Evidence:** required=Vendor review record including data shared, purpose, DPA status; acceptable=Vendor register entry with review date, reviewer, and DPA reference; unacceptable=Vendor integrated with no documented review.
**Verify:** automated=None; manual=Vendor register review against actual integrations (cross-check against `DATA-INVENTORY-001`); organizational=n/a; legal_review=Yes for DPA adequacy; prod_verification=n/a; test_procedure=Cross-reference the data inventory's vendor list against the vendor register; identify any gaps.
**Outcomes:** pass=All data-receiving vendors reviewed with DPA in place; partial=Most vendors reviewed, some gaps; fail=No vendor review process; unknown=Vendor inventory incomplete; release_gate=No directly, but a significant finding at Tier 4+ if systemic; score_weight=High (8).
**Implement:** guidance=Require vendor review as a gate before integration, not after; maintain a central vendor register; examples=Vendor register/subprocessor-list templates in `templates/`; anti_patterns=Adding a vendor SDK to the codebase without any privacy/security review because it "just works"; common_false_confidence="It's a big, reputable company" (reputation does not substitute for a specific review of what data is shared and under what terms).
**Remediate:** guidance=Backfill review for existing vendors; establish going-forward gate; verify_after=Confirm all vendors have current review records.
**Own:** owner=Privacy/Security/Procurement; effort=Medium; dependencies=Data inventory.
**Exceptions:** allowed=Yes for vendors receiving no personal/sensitive data; approval=n/a; expiry=n/a; review=Annual per vendor, or on material change to vendor's data handling.
**Notes:** This control directly feeds the subprocessor list required for privacy notices — see Domain 40.

---

## Domain 24 — Artificial Intelligence and Machine Learning

#### AI-DISCLOSE-001 — Users Are Disclosed When Interacting With or Being Affected by AI

**Statement (MUST):** Where a user interacts directly with an AI system (chatbot, generated content) or is subject to a consequential automated decision, this MUST be clearly disclosed, and the AI's output MUST NOT be presented as unambiguously human-authored where that would be materially misleading.
**Classify:** Article III; Domain 24; control_type=Legal requirement (where applicable) / Ethical safeguard; risk_tier=2+; lifecycle=Product Design through Operation; maturity=MVP+
**Why:** objective=Preserve informed user consent and trust; rationale=Users make different judgments about content and decisions depending on whether they believe a human or an AI system produced them; risk_addressed=Deceptive impression that a human made a decision/created content that was actually AI-generated; threat_or_failure_mode=A support chatbot impersonates a human agent with no disclosure, and a user relies on its assurances as if from an accountable human.
**Applies When:** rule=Any direct AI interaction or consequential automated decision; questions="Would a reasonable user assume this was made/said by a human?"; not_applicable_when=AI use is purely internal/backend with no user-facing interaction or consequential decision; jurisdictions=EU (AI Act Art. 50 transparency obligations, enforceable since 2 Aug 2026 for in-scope generative/interactive systems), and an emerging norm elsewhere — see `LEGAL-APPLICABILITY.md`; industries=Universal; data=n/a; users=All interacting with the AI feature; architecture=Any with AI features; tech=All; legal_basis=EU AI Act Art. 50 where applicable; various emerging state-level AI-disclosure laws in the US; contractual_basis=n/a.
**Sources:** standards_mappings=EU AI Act Article 50 (transparency obligations); source_ids=SRC-EU-AI-ACT; source_last_verified=2026-08 (Article 50 obligations enforceable since 2 Aug 2026; generative-AI content-marking has a transitional grace period to 2 Dec 2026 for systems placed on the market before 2 Aug 2026).
**Risk Profile:** severity=High; likelihood=Medium; impact=High (regulatory and trust); exploitability=n/a; detectability=High (visible via UX audit); affected_users=All interacting with the feature; affected_assets=User trust, regulatory standing.
**Evidence:** required=UI/UX evidence of disclosure; acceptable=Visible, unambiguous labeling ("AI-generated," "You are chatting with an AI assistant"); unacceptable=Disclosure buried in terms of service with no in-context indication.
**Verify:** automated=None; manual=UX walkthrough; organizational=n/a; legal_review=Yes; prod_verification=Yes; test_procedure=Interact with the AI feature as a new user; assess whether disclosure is clear and contemporaneous with the interaction.
**Outcomes:** pass=Clear, in-context disclosure present; partial=Disclosure present but not prominent/contemporaneous; fail=No disclosure, or content presented in a manner designed to obscure AI origin; unknown=Feature not testable; release_gate=Yes in EU/UK for in-scope systems at Tier 3+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Label AI-generated content and AI-driven interactions clearly and persistently, not just at first use; examples=Persistent "AI Assistant" label on chatbot UI, "Generated by AI" tags on generated content; anti_patterns=A one-time disclaimer shown once and never repeated in a long-running conversation; common_false_confidence="It's in our terms of service" (buried legal disclosure does not satisfy in-context transparency expectations or, increasingly, legal requirements).
**Remediate:** guidance=Add persistent, clear disclosure; verify_after=Re-run UX walkthrough.
**Own:** owner=Product/Legal; effort=Low; dependencies=None.
**Exceptions:** allowed=Narrow, jurisdiction-defined exceptions (e.g., certain creative/artistic uses under some frameworks); approval=Legal; expiry=n/a; review=On regulatory guidance change.
**Notes:** See `LEGAL-APPLICABILITY.md` § European Union for the full AI Act timeline, including the July 2026 Omnibus amendment deferring high-risk (not transparency) obligations.

#### AI-COSTLIMIT-001 — Bounded Cost Controls for AI/LLM Usage

**Statement (MUST):** Any feature invoking a paid AI/LLM API MUST have an enforced per-user, per-session, and/or global rate/cost limit preventing a single actor (or automated abuse) from generating unbounded provider costs.
**Classify:** Article X; Domain 24; control_type=Security baseline / FinOps; risk_tier=2+; lifecycle=Implementation; maturity=MVP+
**Why:** objective=Prevent "denial of wallet" attacks and runaway cost from AI features; rationale=LLM API costs scale directly with usage and can be trivially amplified by a scripted attacker or a runaway loop, unlike most traditional compute costs; risk_addressed=Uncontrolled, attacker-triggerable AI provider spend; threat_or_failure_mode=A public-facing AI chat feature with no rate limit is scripted by an attacker to generate thousands of expensive requests, running up a large, unplanned bill.
**Applies When:** rule=Any feature calling a metered AI/LLM API; questions="What is the maximum this feature could cost in an hour if abused, and is that bounded by an enforced limit?"; not_applicable_when=No paid AI API usage; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=Any with AI integration; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=Emerging "denial of wallet" research in AI application security; source_ids=SRC-CONST-INTERNAL; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=High (direct financial); exploitability=Medium-High; detectability=Low without active cost monitoring; affected_users=n/a (business risk); affected_assets=Operating budget.
**Evidence:** required=Rate/cost-limiting configuration for each AI-calling endpoint; billing alert configuration; acceptable=Confirmed per-user/session limits and a global spend alert/circuit-breaker; unacceptable=Unlimited AI API calls gated only by authentication.
**Verify:** automated=Test scripted rapid-fire requests against the limit; manual=Configuration review; organizational=Confirm billing alerts are monitored, not just configured; legal_review=No; prod_verification=Yes; test_procedure=Script repeated calls to the AI-backed endpoint; confirm rate/cost limiting engages before unbounded cost accrues.
**Outcomes:** pass=Limits enforced and verified, billing alerts active and monitored; partial=Limits exist but generous/untested, or alerts exist but unmonitored; fail=No limiting at all; unknown=Cannot test; release_gate=Yes at Tier 3+ for public-facing AI features (Fail blocks); score_weight=High (8).
**Implement:** guidance=Apply per-user rate limits, a global spend ceiling with automatic feature disablement or escalation, and real-time billing alerts; examples=Token-bucket rate limiting per user ID, provider-side spend caps where supported; anti_patterns=Relying solely on the AI provider's own account-level spend cap as the only control, with no application-level limiting; common_false_confidence="Our users are authenticated so abuse is unlikely" (authenticated abuse, including by a single compromised or malicious account, is still abuse).
**Remediate:** guidance=Add rate/cost limiting; configure billing alerts; verify_after=Re-run abuse-simulation test.
**Own:** owner=Backend engineering/FinOps; effort=Medium; dependencies=Rate-limiting infrastructure.
**Exceptions:** allowed=Yes for trusted internal-only tools; approval=Engineering leadership; expiry=n/a; review=Quarterly.
**Notes:** See `SECURITY_ANALYSIS.md` § Attacker Economics for the general framing of this pattern beyond just AI.

---

## Domain 25 — Infrastructure and Cloud Security

#### CLOUD-IAM-001 — Least-Privilege IAM With No Long-Lived Root/Admin Credential in Routine Use

**Statement (MUST):** Cloud infrastructure access MUST use least-privilege IAM roles/policies scoped to specific tasks; the root/organization-owner account MUST NOT be used for routine operations and MUST have MFA enforced; service credentials MUST use short-lived, workload-identity-based access where the platform supports it, rather than long-lived static keys.
**Classify:** Article VI; Domain 25; control_type=Security baseline; risk_tier=1+; lifecycle=Deployment through Operation; maturity=Prototype+
**Why:** objective=Limit blast radius of any single compromised credential; rationale=Overly broad IAM permissions turn any single credential compromise into a full-account compromise; risk_addressed=Full cloud-account compromise from a single leaked/overprivileged credential; threat_or_failure_mode=A leaked service credential with full admin rights is used to access, exfiltrate, or destroy the entire cloud environment.
**Applies When:** rule=Always, for any cloud-hosted system; questions="What is the blast radius if this specific credential is compromised?"; not_applicable_when=Never for cloud-hosted systems; jurisdictions=Universal; industries=Universal; data=n/a; users=n/a; architecture=Cloud-hosted; tech=All cloud providers; legal_basis=n/a; contractual_basis=Standard security requirement.
**Sources:** standards_mappings=CIS Benchmarks (cloud provider-specific); AWS/GCP/Azure Well-Architected security pillars; source_ids=SRC-CIS, SRC-CLOUD-WAF; source_last_verified=2026-08.
**Risk Profile:** severity=Critical; likelihood=Medium; impact=Critical; exploitability=High once a broad credential is compromised; detectability=Medium (IAM policy analysis tools exist); affected_users=All; affected_assets=Entire cloud environment.
**Evidence:** required=IAM policy export/review; root/owner account MFA and usage-log evidence; service-credential inventory showing lifetime/scope; acceptable=IAM analysis tool output confirming least-privilege scoping and root account MFA/inactivity; unacceptable=Broad "*" permission policies attached to routine service accounts, or root credentials used for day-to-day operations.
**Verify:** automated=Cloud-native IAM analysis tools (e.g., access advisor/policy analyzer equivalents); manual=Policy review for over-broad grants; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Review IAM policies attached to each role/service account; confirm scoping matches actual need; confirm root/owner account MFA and lack of routine use.
**Outcomes:** pass=Least-privilege confirmed across sampled roles, root MFA enforced and unused routinely; partial=Mostly scoped with some over-broad exceptions; fail=Broad/wildcard permissions common, or root account used routinely without MFA; unknown=IAM configuration not reviewable; release_gate=Yes at Tier 3+ (Fail blocks); score_weight=Critical (12).
**Implement:** guidance=Start from zero permissions and add only what's needed (default-deny IAM); use workload identity federation over long-lived static keys where supported; examples=AWS IAM Access Analyzer, GCP IAM Recommender, scoped service accounts per function; anti_patterns=Attaching a broad managed "Administrator" policy to a service account "to avoid permission errors" during development and never tightening it; common_false_confidence="It's just for internal use" (internal-use credentials are still real credentials with real blast radius if compromised).
**Remediate:** guidance=Right-size IAM policies based on actual usage analysis; enforce root MFA; migrate to workload identity where feasible; verify_after=Re-run IAM analysis.
**Own:** owner=Infrastructure/Security; effort=Medium-High (initial right-sizing); dependencies=IAM analysis tooling access.
**Exceptions:** allowed=Time-boxed during initial development at Tier 0/1 only; approval=Infrastructure lead; expiry=Before Tier 2 launch; review=Quarterly.
**Notes:** See `SECURITY_ANALYSIS.md` § Infrastructure and Cloud Security for network boundary, storage exposure, and metadata-service controls beyond IAM.

#### ENV-SEPARATE-001 — Development, Staging, and Production Environments Are Isolated With No Shared Credentials

**Statement (MUST):** Development, staging, and production environments MUST use separate credentials, separate data stores (no production data in lower environments except via a documented, minimized, and masked data-sharing process), and separate infrastructure accounts/projects where feasible, such that a compromise of a lower environment does not directly yield production access.
**Classify:** Article VI; Domain 25; control_type=Security baseline; risk_tier=1+; lifecycle=Environment & Tooling Setup through Operation; maturity=Prototype+
**Why:** objective=Prevent a lower-security environment from becoming a pivot point into production; rationale=Development/staging environments are typically held to a lower security bar (more permissive access, less monitoring, more experimental configuration) and should never share credentials or data with production as a result; risk_addressed=Lower-environment compromise escalating to production compromise; threat_or_failure_mode=A staging environment's database credential is reused in production, and a staging-environment compromise (common, given lower staging security rigor) directly yields production data access.
**Applies When:** rule=Any system with more than one deployment environment; questions="If staging were fully compromised today, could the attacker reach production with what they found?"; not_applicable_when=A genuinely single-environment system (rare beyond Tier 0 experiments); jurisdictions=Universal; industries=Universal; data=Credentials, production data; users=n/a; architecture=All; tech=All; legal_basis=n/a; contractual_basis=n/a.
**Sources:** standards_mappings=CIS Controls (Data Protection, Account Management); source_ids=SRC-CIS; source_last_verified=2026-08.
**Risk Profile:** severity=High; likelihood=Medium; impact=Critical (if realized); exploitability=Medium; detectability=Medium via credential/access audit; affected_users=All if production is reached; affected_assets=Production systems and data.
**Evidence:** required=Credential inventory showing distinct credentials per environment; infrastructure configuration showing environment isolation; data-masking/synthesis process for any lower-environment data derived from production; acceptable=Confirmed distinct IAM/database credentials per environment and no unmasked production data present in staging/dev; unacceptable=Shared database credentials across environments, or unmasked production data copied into staging for convenience.
**Verify:** automated=Credential/secret inventory scan across environments for reuse; manual=Review data-refresh process for staging/dev environments; organizational=n/a; legal_review=No; prod_verification=Yes; test_procedure=Attempt to use a staging-environment credential against production infrastructure and confirm rejection; review staging database contents for unmasked production PII.
**Outcomes:** pass=Full credential and data isolation confirmed; partial=Credentials isolated but unmasked production data present in staging, or vice versa; fail=Shared credentials across environments; unknown=Cannot verify environment topology; release_gate=Yes at Tier 2+ (Fail blocks); score_weight=High (8).
**Implement:** guidance=Separate cloud accounts/projects per environment where feasible; synthetic or masked data generation for staging/dev; distinct secrets-manager namespaces per environment; examples=Separate AWS accounts per environment linked via an organization, with no cross-account trust beyond CI/CD deployment roles; anti_patterns=A single database instance with different schemas for "staging" and "production" sharing the same credential.
**Remediate:** guidance=Provision separate credentials/infrastructure; purge unmasked production data from lower environments; verify_after=Re-run credential-reuse scan.
**Own:** owner=Infrastructure/Security; effort=Medium; dependencies=None.
**Exceptions:** allowed=Time-boxed for Tier 0/1 experiments only; approval=Infrastructure lead; expiry=Before Tier 2 launch; review=Quarterly.
**Notes:** Directly implements Constitutional Article XII (production data is production data everywhere).

---

*Continue to [`CONTROLS-CATALOG-2.md`](./CONTROLS-CATALOG-2.md) for Domains 26–50.*
