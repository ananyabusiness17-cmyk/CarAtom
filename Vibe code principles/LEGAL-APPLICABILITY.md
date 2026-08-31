# LEGAL-APPLICABILITY.md

## Jurisdiction-by-Jurisdiction Legal Requirements and Applicability Logic

**Version:** 1.0.0 · **Companion to:** `CONSTITUTION.md`, `CONTROLS-CATALOG-1.md`, `CONTROLS-CATALOG-2.md`, `SECURITY_ANALYSIS.md`
**Research currency:** August 2026 — laws and thresholds change; re-verify before relying on this document for an actual compliance decision. **This document does not constitute legal advice.**

---

## 0. How to Use This Document

This is a **triage and applicability tool**, not a substitute for qualified legal counsel. It exists to help an AI agent or engineering team quickly determine: (1) which major legal regimes plausibly apply to a given system, (2) what those regimes concretely require at a technical/organizational level, and (3) which control IDs in `CONTROLS-CATALOG-1.md`/`-2.md` and `SECURITY_ANALYSIS.md` operationalize that requirement.

**Scope discipline**: This document covers **six major jurisdictions** (United States [federal + notable state law], European Union, United Kingdom, Canada, Australia, India) selected for broad applicability to internet-facing software. It explicitly does **not** cover other jurisdictions — see § 8 for how to handle jurisdictions outside this scope. Coverage within each jurisdiction is likewise not exhaustive of that jurisdiction's entire legal system; it targets the laws most commonly triggered by "vibe-coded" software: data privacy, data security/breach notification, accessibility, and consumer protection as they intersect with software design.

---

## 0.1 Jurisdiction Review Status

Per `CONSTITUTION.md` § 13, every jurisdiction referenced anywhere in this constitution set carries an explicit review-status label so that coverage depth is never silently overstated:

| Jurisdiction | Status | Last Verified |
|---|---|---|
| United States (federal + state) | Fully Reviewed | 2026-08 |
| European Union (GDPR + AI Act) | Fully Reviewed | 2026-08 |
| United Kingdom | Fully Reviewed | 2026-08 |
| Canada | Fully Reviewed | 2026-08 |
| Australia | Fully Reviewed | 2026-08 |
| India | Fully Reviewed | 2026-08 |
| All other jurisdictions (Brazil, China, Japan, South Korea, South Africa, Middle East, and others) | Pending Review | Not yet researched — see § 8 |

"Fully Reviewed" here means: primary statutory text and current regulatory guidance were consulted for the core obligations in §§ 2-7 (consent/lawful basis, breach notification, data subject rights, cross-border transfer, and accessibility where applicable) — it does **not** mean every sub-regulation, sector-specific rule, or sub-national variation within that jurisdiction was reviewed (e.g., not every individual US state's private right of action nuances, not every Indian sectoral regulator's overlay). Treat "Fully Reviewed" as "reviewed at the depth this document operates at," not as an exhaustive legal audit — see § 10 for the standing recommendation to engage qualified counsel before high-stakes decisions.

---

## 1. Applicability Engine

Before consulting jurisdiction-specific sections, determine:

1. **Where are your users located?** (Not just where you are incorporated/hosted — most privacy laws are extraterritorial and apply based on the location of the data subject, not the business.)
2. **What categories of personal data do you process?** (General PII vs. sensitive categories: health, biometric, financial, children's data, precise location, government ID.)
3. **What is your approximate scale?** (Some laws have revenue/volume thresholds below which certain obligations don't attach — e.g., CCPA/CPRA.)
4. **Are you a "controller/business" (deciding why/how data is processed) or a "processor/service provider" (processing on another's behalf)?** Obligations differ materially between these roles.
5. **Do you process children's data?** Nearly every jurisdiction in this document has materially stricter rules for minors.
6. **Do you use automated decision-making or profiling with legal/significant effect on individuals?** This triggers additional obligations in several jurisdictions (GDPR Art. 22 and equivalents).

A system with users across multiple jurisdictions MUST comply with the **most stringent applicable requirement** for shared/global infrastructure decisions, per `CONSTITUTION.md` § 10 Precedence Model — it is generally more practical to build one high bar than maintain jurisdiction-conditional logic, except where legally required to differ (e.g., data residency).

---

## 2. United States

### 2.1 Federal Landscape
The US has no single comprehensive federal privacy law. Federal law instead consists of **sectoral** statutes:

| Law | Scope | Key Technical Requirements |
|---|---|---|
| **COPPA** (Children's Online Privacy Protection Act) | Online services directed at or knowingly collecting data from children under 13 | Verifiable parental consent before collection; data minimization; deletion mechanisms; no conditioning service on excessive data collection |
| **HIPAA** (Health Insurance Portability and Accountability Act) | "Covered entities" and "business associates" handling Protected Health Information | Administrative/physical/technical safeguards (access control, audit logs, encryption of ePHI in transit, breach notification within 60 days) |
| **GLBA** (Gramm-Leach-Bliley Act) | Financial institutions | Privacy notices, safeguards rule (written information security program) |
| **FTC Act § 5** | Any business, via "unfair or deceptive practices" enforcement | No specific technical mandate, but the FTC has used this broadly against companies with materially misrepresented security/privacy practices — a privacy policy that misstates actual data practices is independently actionable |
| **CAN-SPAM Act** | Commercial email | Opt-out mechanism, accurate header/subject information, physical address disclosure |
| **ADA (Title III)** | Places of "public accommodation" — increasingly interpreted by courts to include websites/apps | No codified technical standard, but WCAG 2.1/2.2 AA is the de facto litigation-risk-reduction benchmark |

### 2.2 State Privacy Laws (Comprehensive)
As of 2026, a majority of US states have enacted comprehensive consumer privacy laws following the general California-originated model, with meaningful variation in detail. Representative examples of the model (verify current state-by-state status before relying on this list, as new states continue to enact laws and existing ones amend thresholds):

- **California (CCPA as amended by CPRA)**: Applies to for-profit entities meeting revenue/volume thresholds (verify current thresholds — they are periodically adjusted). Grants rights to know, delete, correct, opt out of sale/sharing, and limit use of sensitive personal information. Requires a specific "Do Not Sell or Share My Personal Information" mechanism and honoring the **Global Privacy Control (GPC)** browser signal as a valid opt-out request. Created a dedicated regulator (CPPA) with rulemaking authority, including for automated decision-making technology (ADMT) regulations.
- **Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and subsequently enacted states**: Generally require: a privacy notice; data subject rights (access, correction, deletion, portability, opt-out of targeted advertising/sale/certain profiling); data protection assessments for higher-risk processing; opt-in consent for processing "sensitive data" categories (health, biometric, precise geolocation, children's data, etc.).
- **General pattern across newer state laws**: opt-in (not merely opt-out) consent requirements are expanding for sensitive data and for minors specifically; universal opt-out mechanism (GPC-style) recognition is becoming more common.

**Applicability trigger**: If you have users in any US state and process personal data at meaningful scale, assume **some** state privacy law applies and build to the common-denominator strictest requirements (opt-in for sensitive data, honor GPC, provide access/deletion/correction rights) rather than attempting per-state conditional logic.

### 2.3 State Breach Notification Laws
All 50 US states, DC, and US territories have breach notification statutes. They vary in: definition of "personal information" triggering notification, notification timeline (ranges from "without unreasonable delay" to specific day counts, commonly 30-60 days for the fastest states), and whether the state Attorney General/regulator must also be notified above a threshold number of affected residents. **Build for the fastest applicable timeline and broadest applicable definition** rather than per-state branching logic.

### 2.4 Key Control Mappings
`PRIV-CONSENT-001`, `PRIV-MINIMIZE-001`, `PRIV-CHILDREN-001` (COPPA), `PRIV-SENSITIVE-001` (health/financial/biometric), `SEC-BREACH-001`, `ACC-WCAG-001` (ADA litigation-risk reduction), `PRIV-RIGHTS-001` (access/deletion/correction/portability), `PRIV-OPTOUT-001` (sale/sharing/targeted-advertising opt-out + GPC).

---

## 3. European Union (GDPR)

### 3.1 Applicability
The **General Data Protection Regulation (GDPR)** applies extraterritorially to any organization processing personal data of individuals in the EU, regardless of where the organization is established, if it offers goods/services to EU individuals or monitors their behavior (Art. 3).

### 3.2 Core Obligations
- **Lawful basis (Art. 6)**: Every processing activity requires an identified lawful basis (consent, contract necessity, legal obligation, vital interests, public task, or legitimate interests). "We need the data" is not itself a lawful basis.
- **Consent standard (Art. 4(11), Art. 7)**: Must be freely given, specific, informed, unambiguous, and given by a clear affirmative act (no pre-ticked boxes, no bundled consent for unrelated purposes). Must be as easy to withdraw as to give.
- **Data minimization and purpose limitation (Art. 5)**: Collect only what's necessary for the stated purpose; do not repurpose data for materially different, incompatible purposes without a new lawful basis.
- **Data subject rights (Arts. 15-22)**: Access, rectification, erasure ("right to be forgotten"), restriction, portability, objection, and rights related to automated decision-making/profiling with legal or similarly significant effects (Art. 22 — generally requires human review availability and cannot be based solely on automated processing for such decisions without specific safeguards).
- **Security of processing (Art. 32)**: "Appropriate technical and organisational measures" — pseudonymization/encryption, ongoing confidentiality/integrity/availability/resilience, ability to restore availability after an incident, regular testing/evaluation of measures.
- **Breach notification (Arts. 33-34)**: Notify the supervisory authority within **72 hours** of becoming aware of a breach likely to result in risk to individuals; notify affected individuals without undue delay if the breach is likely to result in **high risk**.
- **Data Protection Impact Assessments (Art. 35)**: Required before processing likely to result in high risk (large-scale sensitive data processing, systematic monitoring, large-scale profiling).
- **Data Protection by Design and by Default (Art. 25)**: Privacy-protective settings must be the default; privacy considerations must be integrated into system design, not bolted on.
- **International transfers (Ch. V)**: Transfers of personal data outside the EU/EEA require a valid transfer mechanism (adequacy decision, Standard Contractual Clauses, Binding Corporate Rules, or a specific derogation).
- **Records of Processing Activities (Art. 30)**: Organizations above certain thresholds (or engaging in regular/systematic/high-risk processing) must maintain a documented record of processing activities.

### 3.3 Enforcement and Penalties
Fines up to the greater of €20 million or 4% of total worldwide annual turnover for the most serious infringements (Art. 83). Individual supervisory authorities in each EU member state enforce; the European Data Protection Board coordinates cross-border cases.

### 3.4 EU AI Act (Cross-Reference)
Where AI features are involved, the **EU AI Act** imposes a risk-tiered regulatory regime (unacceptable-risk practices prohibited; high-risk AI systems subject to conformity assessment, risk management, data governance, transparency, and human oversight obligations; limited-risk systems subject to transparency obligations e.g. disclosing AI-generated content/chatbot interactions; minimal-risk systems largely unregulated). High-risk classification triggers obligations phasing in on a schedule set by the Act — verify current phase-in status before assuming a specific obligation is or isn't yet in force for a given risk category.

### 3.5 EU Accessibility Act (Cross-Reference)
The **European Accessibility Act** requires specified products/services (including e-commerce, banking, and other digital services) to meet accessibility requirements aligned with EN 301 549 (which itself incorporates WCAG success criteria), with compliance deadlines that member states have transposed into national law.

### 3.6 Key Control Mappings
`PRIV-LAWFULBASIS-001`, `PRIV-CONSENT-001`, `PRIV-MINIMIZE-001`, `PRIV-RIGHTS-001`, `PRIV-DPIA-001`, `SEC-BREACH-001` (72-hour clock), `PRIV-BYDESIGN-001`, `DATA-TRANSFER-001`, `PRIV-RECORDS-001`, `AI-DISCLOSE-001` (AI Act transparency), `ACC-WCAG-001` (Accessibility Act).

---

## 4. United Kingdom

### 4.1 Legal Framework
Post-Brexit, the UK operates its own **UK GDPR** (a retained, UK-specific version of the EU GDPR) alongside the **Data Protection Act 2018**. As of 2026, the UK has continued reforming this framework (notably via the Data (Use and Access) Act) while retaining the GDPR's core structure — lawful basis, data subject rights, security-of-processing, breach notification, and DPIA requirements are substantively similar to EU GDPR (§ 3.2), with the UK's Information Commissioner's Office (ICO) as the enforcing regulator rather than an EU supervisory authority.

### 4.2 Notable Differences From EU GDPR
- Breach notification is to the **ICO**, generally within 72 hours, following the same structural test as EU GDPR.
- The UK has pursued its own reform agenda distinct from the EU's evolving GDPR interpretation — organizations serving both UK and EU users should track both regimes separately even though they remain substantively aligned, as divergence may grow over time.
- The EU-UK adequacy decision (permitting free data flow from the EU to the UK) is subject to periodic review and renewal — organizations transferring data from the EU to the UK should verify current adequacy status rather than assuming permanence.

### 4.3 UK Accessibility
UK public sector bodies are subject to the **Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018**, requiring WCAG 2.1 AA (or the then-current incorporated standard) conformance and a published accessibility statement. Private-sector accessibility obligations arise primarily via the **Equality Act 2010**'s general duty to make reasonable adjustments, which courts and regulators look to WCAG conformance to help evidence.

### 4.4 Key Control Mappings
Same as § 3.6, substituting ICO as the regulator and confirming UK-specific transfer mechanism validity for any EU-UK or UK-third-country data flows (`DATA-TRANSFER-001`).

---

## 5. Canada

### 5.1 Federal Law
**PIPEDA** (Personal Information Protection and Electronic Documents Act) governs private-sector organizations' collection, use, and disclosure of personal information in the course of commercial activity, federally and in provinces without substantially similar legislation.

**Core obligations**: Consent (meaningful, generally opt-in for sensitive information, though PIPEDA recognizes an implied-consent/reasonable-expectation standard for some lower-sensitivity uses); limiting collection/use/disclosure to identified purposes; safeguards proportionate to sensitivity; individual access rights; **mandatory breach reporting to the Privacy Commissioner and affected individuals** where the breach creates a "real risk of significant harm," plus a duty to maintain breach records regardless of reporting threshold.

### 5.2 Provincial Law
Quebec, British Columbia, and Alberta have their own private-sector privacy statutes deemed "substantially similar" to PIPEDA (Quebec's **Law 25**, formerly Bill 64, is notably GDPR-influenced and imposes some of the strictest requirements in Canada, including mandatory privacy impact assessments for certain projects, enhanced consent requirements, and a private right of action). Where a business operates in Quebec, Law 25's stricter requirements should generally be treated as the applicable Canadian baseline.

### 5.3 Anti-Spam
**CASL** (Canada's Anti-Spam Legislation) requires opt-in consent (express or implied under specific circumstances) before sending commercial electronic messages, with specific identification and unsubscribe-mechanism requirements — among the stricter anti-spam regimes globally.

### 5.4 Key Control Mappings
`PRIV-CONSENT-001` (opt-in bias, especially Quebec), `SEC-BREACH-001` (real-risk-of-significant-harm threshold), `PRIV-DPIA-001` (Quebec Law 25), `COMMS-UNSUB-001` (extended to require opt-in, not just opt-out, for commercial email under CASL's stricter standard).

---

## 6. Australia

### 6.1 Legal Framework
The **Privacy Act 1988** (as amended, including significant reform activity through the mid-2020s) governs personal information handling by most private-sector organizations above a small-business threshold (verify current threshold), all Australian government agencies, and health service providers regardless of size, via the **Australian Privacy Principles (APPs)**.

**Core APP obligations**: Open and transparent management of personal information (APP 1); anonymity/pseudonymity options where practicable (APP 2); restrictions on collection of solicited/unsolicited information, with heightened restriction for "sensitive information" requiring consent (APP 3); notification of collection (APP 5); use/disclosure limited to primary purpose absent an exception (APP 6); direct marketing opt-out rights (APP 7); cross-border disclosure accountability (APP 8 — the disclosing entity generally remains accountable for the overseas recipient's handling); data quality, security, and destruction/de-identification obligations (APPs 10-11); access and correction rights (APPs 12-13).

### 6.2 Notifiable Data Breaches Scheme
Organizations covered by the Privacy Act must notify the **Office of the Australian Information Commissioner (OAIC)** and affected individuals of an "eligible data breach" — one likely to result in serious harm — as soon as practicable after forming that assessment.

### 6.3 Ongoing Reform
Australia has been actively reforming its privacy framework, including introducing higher penalties, a statutory tort for serious invasions of privacy, and enhanced children's privacy protections in recent reform tranches — treat this jurisdiction's requirements as subject to material near-term change and verify current status before final compliance decisions.

### 6.4 Key Control Mappings
`PRIV-CONSENT-001` (sensitive information), `SEC-BREACH-001` (eligible-data-breach standard), `DATA-TRANSFER-001` (APP 8 accountability model — distinct from the EU's transfer-mechanism model in that the disclosing party retains accountability), `PRIV-RIGHTS-001`.

---

## 7. India

### 7.1 Legal Framework
The **Digital Personal Data Protection Act, 2023 (DPDP Act)** is India's comprehensive data protection law. As of 2026, implementation continues via rules and phased provisions issued by the Indian government — verify the current commencement status of specific provisions, as the Act's substantive obligations (as opposed to the framework Act itself) come into force through notified rules and phased timelines rather than all at once upon enactment.

**Core obligations (as the Act and its rules take effect)**: Consent as the primary lawful basis for processing (with defined "legitimate uses" as an alternative basis in specific circumstances, e.g., for specified state/employment purposes); a duty to give clear notice at or before collection describing the personal data and purpose; specific, heightened protections for **children's data** (defined as under 18) including a general requirement of verifiable parental consent and a prohibition on tracking/behavioral monitoring/targeted advertising directed at children; data principal (individual) rights including access, correction, erasure, and grievance redressal; mandatory breach notification to the **Data Protection Board of India** and affected individuals; cross-border transfer restrictions with the government empowered to restrict transfers to specific countries (a blacklist model, differing from the EU's adequacy/SCC model); "Significant Data Fiduciary" designation for entities meeting volume/sensitivity thresholds, triggering additional obligations (DPO appointment, independent data audits, DPIAs).

### 7.2 Sectoral Overlays
The **Information Technology Act, 2000** and its associated rules (including the SPDI Rules for sensitive personal data, pending full harmonization with the DPDP Act's rules) continue to have relevance for security practices and intermediary liability during the DPDP Act's phased rollout. Sector regulators (e.g., the Reserve Bank of India for financial data, requiring certain data localization for payment system data) impose additional, sector-specific requirements that operate alongside the DPDP Act.

### 7.3 Key Control Mappings
`PRIV-CONSENT-001` (consent-primary model), `PRIV-CHILDREN-001` (under-18 threshold — broader than most other jurisdictions in this document, and a general prohibition rather than a consent-based permission for tracking/targeted ads to minors), `SEC-BREACH-001`, `DATA-TRANSFER-001` (blacklist model — verify current restricted-country list before assuming any specific transfer is permitted), `PRIV-DPIA-001` (Significant Data Fiduciary threshold).

---

## 8. Jurisdictions Outside This Document's Scope

This document covers six major jurisdictions only. For any other jurisdiction where a system has users or operations (e.g., Brazil's LGPD, China's PIPL, South Korea's PIPA, Japan's APPI, South Africa's POPIA, Middle Eastern data protection frameworks, and others), the applicable law MUST be independently researched before assuming compliance — **do not assume the six jurisdictions in this document represent a global-safe-harbor baseline**. As a practical interim measure, building to the strictest requirement among the six jurisdictions covered here (generally EU GDPR or India's children's-data provisions) reduces but does not eliminate risk from an uncovered jurisdiction's specific requirements, particularly around data localization mandates, which vary widely and are not generalizable from this document's coverage.

---

## 9. Cross-Jurisdictional Design Recommendations

Given the applicability engine (§ 1) and the substantive overlap across the six covered jurisdictions, the following design choices satisfy or substantially reduce risk across most of them simultaneously:

1. **Opt-in consent, not opt-out, for sensitive data categories and all data from minors** — satisfies the strictest reading across all six jurisdictions.
2. **Honor a universal opt-out signal (GPC-style) and provide an easily discoverable privacy-choice mechanism** — required in California, good practice in others.
3. **72-hour-equivalent breach notification capability** (detection-to-decision-to-notification pipeline tested to complete within 72 hours) — satisfies the EU/UK standard and is protective for jurisdictions with "as soon as practicable"-style standards without a fixed number.
4. **Data minimization and defined retention schedules** — reduces breach impact and satisfies purpose-limitation requirements present in nearly every regime covered.
5. **WCAG 2.1/2.2 AA conformance** — the common technical benchmark referenced (directly or via litigation risk) across US (ADA), EU (Accessibility Act), and UK (Equality Act/PSBAR) frameworks.
6. **A documented, jurisdiction-aware cross-border transfer inventory** — because the transfer-mechanism *models* differ substantially (EU adequacy/SCCs vs. Australia's discloser-accountability model vs. India's blacklist model), a single generic "we use SCCs" answer is insufficient; the inventory should record, per transfer, which jurisdiction's specific mechanism applies.
7. **A single, elevated internal bar for children's data** (verifiable parental consent, no behavioral tracking/targeted advertising, minimized collection) given that every covered jurisdiction imposes meaningfully stricter rules for minors, with India's DPDP Act's under-18 threshold being the broadest.

---

## 10. Maintenance

This document should be re-verified: **annually** at minimum, and **immediately** upon: (a) any of the six jurisdictions enacting new legislation or a substantial regulatory guidance change (this is an active area — several of the jurisdictions above were themselves in the middle of reform processes as of this document's research date); (b) the system expanding into a new jurisdiction; (c) the system beginning to process a new sensitive data category or beginning to serve children; (d) any adequacy/transfer-mechanism status change affecting the system's cross-border data flows.

**This document is a starting-point triage tool prepared without jurisdiction-specific legal review. Engage qualified legal counsel in each relevant jurisdiction before finalizing compliance decisions, particularly for Tier 3+ systems or any system processing sensitive data categories at scale.**
