# GREENFIELD-PLAYBOOK.md

## Stage-by-Stage Construction Process With Mandatory Gates and Checklists

**Version:** 1.0.0 · **Companion to:** `CONSTITUTION.md`, `CONTROLS-CATALOG-1.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md`, `SCORING-AND-GATES.md`, `LEGAL-APPLICABILITY.md`

---

## 0. How to Use This Playbook

This is the operational companion to `CONSTITUTION.md`'s Greenfield Mode (building something new). It sequences the full control catalog into **18 checklists** mapped to the 40-stage lifecycle model (`CONSTITUTION.md` § 9), so an AI coding agent or engineering team knows *what to check and when*, rather than facing all controls simultaneously regardless of build stage.

**How to read a checklist item**: Each line is `[ ] Requirement — control_id(s) — minimum tier at which mandatory`. Items without a tier annotation are recommended at all tiers. Consult the referenced control's full schema in the catalogs for evidence/verification detail.

**Gate discipline**: A checklist's "Exit Gate" MUST be satisfied before proceeding to the next checklist's stage for Tier 2+ systems. For Tier 0-1 (experiments/prototypes), checklists are advisory.

---

## Checklist 1 — Before Writing Any Code (Idea & Problem Definition)

- [ ] Written problem statement, target user, and explicit excluded/out-of-scope uses — `GOV-PURPOSE-001` (Tier 2+)
- [ ] Initial risk tier self-assessment per `CONSTITUTION.md` § 7 (what data will this touch, who are the users, what's the failure impact?)
- [ ] Initial jurisdiction scan: where will users be located, does this touch health/financial/children's data? — `LEGAL-APPLICABILITY.md` § 1 Applicability Engine
- [ ] Decision: is any part of this system going to use AI-generated code, and if so, what review process will apply? — `VIBE-CODING-ARTICLE.md`

**Exit Gate**: Problem statement exists; risk tier assigned; applicable jurisdictions identified (even if preliminary).

---

## Checklist 2 — Architecture and Design

- [ ] Architecture diagram exists with explicit trust boundaries marked — `ARCH-BOUNDARY-001`
- [ ] Data classification scheme defined (public/internal/confidential/restricted) before storage design — `SECURITY_ANALYSIS.md` § 9.6
- [ ] Blast-radius-aware decomposition considered (does one compromised component reach unrelated sensitive data?) — `SECURITY_ANALYSIS.md` § 9.2
- [ ] Multi-tenancy model decided and isolation approach documented, if applicable — `TENANT-ISOLATE-001`
- [ ] Technology stack choices favor secure-by-default frameworks/libraries — `SECURITY_ANALYSIS.md` § 9.5
- [ ] Kill-switch/circuit-breaker points identified for high-risk features (AI content, payments, bulk ops) — `SECURITY_ANALYSIS.md` § 9.7
- [ ] Threat model completed at the architecture level (STRIDE or equivalent) — `SECURITY_ANALYSIS.md` § 6, § 9

**Exit Gate**: Trust boundaries documented; data classification assigned to each planned data store.

---

## Checklist 3 — Repository and Environment Setup

- [ ] Version control with branch protection on the main branch — `REPO-BRANCH-001`
- [ ] Secrets management solution selected (never plain env files committed to source) — `CRYPTO-KEYMGMT-001`
- [ ] Environment separation planned (dev/staging/production) with no shared credentials across environments — `ENV-SEPARATE-001`
- [ ] Dependency lockfile strategy established from the first commit — `SECURITY_ANALYSIS.md` § 20.3
- [ ] CI pipeline skeleton includes a placeholder for security scanning (SAST/dependency scanning) to be enabled before merge of real logic — Domain 21

**Exit Gate**: No secrets present in the repository; branch protection active.

---

## Checklist 4 — Authentication Foundation

- [ ] Password/credential storage uses a modern, salted, adaptive hash function (never reversible encryption or fast hashes for passwords) — `SEC-AUTH-001`
- [ ] Session management: secure, HttpOnly, SameSite cookies or equivalent token handling — `SECURITY_ANALYSIS.md` Web 4
- [ ] Session ID regenerated on privilege change (login, role change) — `SEC-AUTH-003`
- [ ] MFA capability planned even if not mandatory at launch — `SEC-AUTH-002`
- [ ] Account lockout / rate limiting on authentication endpoints — `TRUST-RATELIMIT-001`
- [ ] If using OAuth/OIDC/SSO: state/nonce validation and redirect URI allowlisting designed in from the start — `SECURITY_ANALYSIS.md` Web 5

**Exit Gate**: No authentication endpoint reachable without rate limiting; no plaintext/reversible credential storage. (Mandatory Tier 1+)

---

## Checklist 5 — Authorization Foundation

- [ ] Deny-by-default authorization model (every unhandled case resolves to denial) — `SECURITY_ANALYSIS.md` Principle 5
- [ ] Object-level and tenant-level authorization enforced server-side on every data access, not inferred from UI state — `AUTHZ-DENY-001`, `API-BOLA-001`, `TENANT-ISOLATE-001`
- [ ] Admin/internal tooling has the same authorization rigor as customer-facing surfaces — `SECURITY_ANALYSIS.md` Web 16
- [ ] Identity propagated and re-verified across every service boundary in multi-service architectures — `SECURITY_ANALYSIS.md` § 9.4

**Exit Gate**: A cross-tenant/cross-user authorization test exists and passes. (Mandatory Tier 1+, Gate 4 in `SCORING-AND-GATES.md`)

---

## Checklist 6 — Input Handling and Data Validation

- [ ] All user-controllable input validated server-side (client-side validation is UX only) — `SEC-INPUT-001`
- [ ] Output encoding is context-aware (HTML body, attribute, JS, URL, CSS contexts each handled correctly) — `SECURITY_ANALYSIS.md` Web 2
- [ ] Parameterized queries / safe ORM usage only — no string-concatenated queries — `SEC-INPUT-001`
- [ ] Mass-assignment protection: explicit field allowlisting on update endpoints — `CONST-MASSASSIGN-001`
- [ ] File upload validation: type, size, content verification (not just extension checking) — `FILE-UPLOAD-001`
- [ ] Deserialization of untrusted input uses safe, schema-constrained formats only — `CONST-DESERIALIZE-001`

**Exit Gate**: Adversarial input tests exist for at least authentication, search/filter, and any file-upload paths.

---

## Checklist 7 — Cryptography and Secrets

- [ ] TLS enforced for all traffic carrying sensitive data, with modern cipher configuration — `CRYPTO-TRANSIT-001`
- [ ] Encryption at rest applied to sensitive data stores, with the threat model it addresses explicitly understood (§ 18.1 of `SECURITY_ANALYSIS.md`) — `CRYPTO-REST-001`
- [ ] Key management: keys generated/stored/rotated via a dedicated secrets manager or HSM/KMS, never embedded in code or client binaries — `CRYPTO-KEYMGMT-001`
- [ ] JWT/token verification pins the expected algorithm; rejects `none`/unexpected algorithms — `CONST-JWTALG-001`

**Exit Gate**: No secret is present in source, build artifacts, or a client-distributed binary. (Gate 1 in `SCORING-AND-GATES.md`)

---

## Checklist 8 — Third-Party and Supply-Chain Setup

- [ ] Every dependency, SDK, and third-party script inventoried with justification — `SECURITY_ANALYSIS.md` Web 9, Mobile 25
- [ ] Dependency scanning enabled in CI, blocking on critical/high vulnerabilities absent a documented exception — Domain 21
- [ ] Vendor due-diligence performed for any processor handling personal data — `VENDOR-DUE-001`
- [ ] Subresource Integrity applied to third-party CDN-loaded scripts where feasible — `SECURITY_ANALYSIS.md` Web 11
- [ ] AI-suggested dependencies independently verified before installation (not auto-installed on agent suggestion) — `SECURITY_ANALYSIS.md` § 14.2

**Exit Gate**: Dependency scan integrated and passing (or exceptions documented per `SCORING-AND-GATES.md` § 9).

---

## Checklist 9 — Privacy and Data Governance

- [ ] Data inventory: what personal data is collected, why, and its classification — `DATA-INVENTORY-001`
- [ ] Lawful basis / consent mechanism implemented per applicable jurisdiction(s) — `LEGAL-APPLICABILITY.md` §§ 2-7
- [ ] Data minimization applied: only collect what the stated purpose requires — `PRIV-MINIMIZE-001`
- [ ] Retention schedule defined and enforced (not indefinite retention by default) — `DATA-LIFE-007`
- [ ] Data subject rights mechanisms (access, deletion, correction, portability) implemented or planned before Tier 3 launch — `PRIV-RIGHTS-001`
- [ ] Children's data handling reviewed if the product could plausibly reach minors — `PRIV-CHILDREN-001`

**Exit Gate**: Data inventory exists; retention schedule defined for every data category collected.

---

## Checklist 10 — Web/Frontend Security Hardening (if applicable)

- [ ] CSP enforced (not report-only) with no unsafe-inline/unsafe-eval absent a documented exception — `SECURITY_ANALYSIS.md` Web 3, Web 10
- [ ] CORS configuration does not reflect arbitrary Origin with credentialed requests — `SECURITY_ANALYSIS.md` Web 3
- [ ] CSRF protection on all state-changing endpoints — `SECURITY_ANALYSIS.md` Web 2
- [ ] Clickjacking protection (frame-ancestors/X-Frame-Options) on sensitive pages — `CONST-CLICKJACK-001`
- [ ] Security headers baseline verified via automated test on every deployment — `SECURITY_ANALYSIS.md` Web 10
- [ ] Authentication tokens not stored in localStorage/sessionStorage where an HttpOnly cookie is viable — `SECURITY_ANALYSIS.md` Web 6

**Exit Gate**: Headers verified present via automated CI check; CSRF/CORS tests pass. (Gates 6-7 in `SCORING-AND-GATES.md`)

---

## Checklist 11 — Mobile Security Hardening (if applicable)

- [ ] No security-critical decision enforced client-side only — `SECURITY_ANALYSIS.md` Mobile 1
- [ ] Sensitive data stored via platform secure storage (Keychain/Keystore), not plaintext files — `SECURITY_ANALYSIS.md` Mobile 4
- [ ] Biometric auth uses the platform's cryptographically-bound API, not a boolean check — `SECURITY_ANALYSIS.md` Mobile 6
- [ ] Deep links validated identically to any other untrusted input; cannot bypass authentication — `SECURITY_ANALYSIS.md` Mobile 9
- [ ] No backend credentials/API keys embedded in the client binary in extractable form — `SECURITY_ANALYSIS.md` Mobile 26
- [ ] In-app purchase receipts validated server-side against the platform vendor's API — `SECURITY_ANALYSIS.md` Mobile 28

**Exit Gate**: Static analysis of the release binary confirms no embedded secrets. (Gates 14-15 in `SCORING-AND-GATES.md`)

---

## Checklist 12 — Payments (if applicable)

- [ ] PCI scope minimized via tokenization; raw card data never touches your own servers unless a documented PCI compliance program is in place — `PAY-SCOPE-001`
- [ ] Payment webhook signature verification implemented before acting on any webhook payload — `SECURITY_ANALYSIS.md` Web 18
- [ ] Idempotency enforced on payment-initiating endpoints to prevent double-charging on retry — `BE-IDEMPOTENT-001`
- [ ] Refund/dispute handling logic reviewed for abuse potential — `PAY-REFUND-001`

**Exit Gate**: Webhook signature verification test passes. (Gate 8 in `SCORING-AND-GATES.md`)

---

## Checklist 13 — Accessibility

- [ ] WCAG 2.1/2.2 AA target confirmed for the product — `ACC-WCAG-001`
- [ ] Semantic HTML / native accessibility APIs used, not solely ARIA-patched divs — `ACC-WCAG-001`
- [ ] Keyboard navigation and screen-reader testing performed, not automated-scan-only — `ACC-WCAG-001`
- [ ] Security controls (CAPTCHA, MFA, timeouts) have an accessible path — `SECURITY_ANALYSIS.md` Web 21

**Exit Gate**: Assistive-technology testing (not just automated scanning) completed for core user flows before Tier 3+ launch. (Gate 17 in `SCORING-AND-GATES.md`)

---

## Checklist 14 — Observability and Operations

- [ ] Logging captures security-relevant events (auth failures, privilege escalation attempts) without logging sensitive data (PII, secrets, full payment details) — `OBS-LOGPII-001`
- [ ] Monitoring/alerting covers security signals, not just uptime/latency — `SECURITY_ANALYSIS.md` § 17.1
- [ ] Audit logs are tamper-evident and access-controlled separately from application data — `SECURITY_ANALYSIS.md` § 17.2
- [ ] Backup strategy defined and restoration actually tested (not just configured) — `BACKUP-RESTORE-001`
- [ ] Time synchronization (NTP) across components for reliable log correlation — `SECURITY_ANALYSIS.md` § 17.3

**Exit Gate**: A backup restoration drill has been performed and documented. (Gate 10 in `SCORING-AND-GATES.md`)

---

## Checklist 15 — Deployment and Cloud Infrastructure

- [ ] Least-privilege IAM roles, scoped per-service/per-function, not shared broad roles — `CLOUD-IAM-001`
- [ ] Network segmentation complements IAM (security groups, private endpoints) — `SECURITY_ANALYSIS.md` § 16.1
- [ ] Cloud metadata service protected against SSRF-based extraction (IMDSv2-equivalent) — `SECURITY_ANALYSIS.md` § 16.2
- [ ] Containers run as non-root with read-only root filesystem where feasible — `CONTAINER-ROOTLESS-001`
- [ ] Infrastructure-as-code changes reviewed with the same rigor as application code — `SECURITY_ANALYSIS.md` § 16.3
- [ ] Staging/non-production environments not publicly indexed or discoverable — `EXPOSE-STAGING-001`

**Exit Gate**: IAM roles reviewed for least privilege; no wildcard/admin roles on production services without documented justification.

---

## Checklist 16 — AI Feature-Specific Controls (if the product itself uses AI)

- [ ] Prompt injection risk assessed for any feature incorporating user/third-party content into an LLM context — `SECURITY_ANALYSIS.md` § 15.1
- [ ] Tool-calling AI agents scoped to least-privilege actions; irreversible actions require explicit confirmation — `SECURITY_ANALYSIS.md` § 15.2
- [ ] AI feature usage and limitations disclosed to users — `AI-DISCLOSE-001`
- [ ] Cost/rate limits applied to AI feature usage to prevent denial-of-wallet abuse — `AI-COSTLIMIT-001`
- [ ] LLM outputs validated independently before driving any downstream automated action — `SECURITY_ANALYSIS.md` § 15.4

**Exit Gate**: Prompt-injection test performed against any user-content-consuming AI feature.

---

## Checklist 17 — Pre-Launch Final Verification (Tier 3+)

- [ ] Full Hard Gate List reviewed and passing per `SCORING-AND-GATES.md` § 5
- [ ] Dependency/SBOM baseline generated for the release — `SECURITY_ANALYSIS.md` § 20.4
- [ ] Incident response plan drafted and contact-tested — `IR-PLAN-001`
- [ ] Breach notification pipeline tested end-to-end against the applicable jurisdiction's timeline — `LEGAL-APPLICABILITY.md` § 9
- [ ] Legal review of privacy policy/terms against actual implemented data practices — `LEGAL-PRIVPOLICY-001`
- [ ] Third-party penetration test scheduled/completed if Tier 4+ — `SECURITY_ANALYSIS.md` § 22.5
- [ ] Property test library (`SECURITY_ANALYSIS.md` § 26) executed against the release candidate

**Exit Gate**: All applicable Hard Gates pass (`SCORING-AND-GATES.md` § 5); score report generated and reviewed by an accountable owner.

---

## Checklist 18 — Post-Launch and Decommissioning Readiness

- [ ] Maintenance/re-verification cadence established (quarterly dependency review minimum) — `SECURITY_ANALYSIS.md` § 38
- [ ] Ownership assigned for each control domain (who is accountable when a control starts failing) — `CONSTITUTION.md` Article-level ownership guidance
- [ ] Decommissioning plan exists for eventual data deletion, DNS cleanup, and credential revocation, even if not imminent — `SECURITY_ANALYSIS.md` § 16.6 (dangling DNS), Domain 50 decommissioning controls
- [ ] Post-launch monitoring reviewed after first 30 days for anomalies not caught pre-launch

**Exit Gate**: A named owner exists for ongoing security/compliance maintenance; first quarterly review scheduled.

---

## How This Maps to the Lifecycle Model

| Checklist | `CONSTITUTION.md` § 9 Lifecycle Stage(s) |
|---|---|
| 1 | Idea & Problem Definition |
| 2 | Architecture & Design |
| 3 | Environment & Tooling Setup |
| 4-7 | Core Implementation (Security Foundations) |
| 8 | Dependency & Supply-Chain Setup |
| 9 | Data Governance Design |
| 10-13 | Platform-Specific Hardening |
| 14-15 | Operational Readiness |
| 16 | AI Feature Implementation (where applicable) |
| 17 | Pre-Launch Gate |
| 18 | Operate & Maintain |

---

## Maintenance

Review this playbook whenever a new gate is added to `SCORING-AND-GATES.md` or a new control domain is added to the catalogs — every gate and every Critical control should be traceable to at least one checklist item above so nothing is verified only at final audit and never during construction.
