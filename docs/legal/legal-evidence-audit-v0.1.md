# Signal & Friction — Legal Evidence Audit v0.1

**Date:** 2026-08-13  
**Status:** REVIEW REQUIRED — NOT LEGAL CERTIFICATION  
**Scope:** `/legal/privacy`, `/legal/terms`, `/legal/guarantee` and the runtime facts those pages claim.

## Decision

Frontend product truth and legal truth are separate gates.

A legal page does not become correct because it is internally consistent with Signal & Friction V2. Claims about establishment, applicable law, supervisory authority, CCPA/CPRA coverage, Singapore PDPA coverage, DPO obligations, international transfers, retention, refund rights and business registration require current authoritative law plus actual business facts.

Therefore:

- **VERIFIED BY RUNTIME** = repository/runtime evidence directly proves the implementation fact.
- **SUPPORTED BY OFFICIAL LAW** = an official regulator/government source supports the general legal rule, but application to Signal & Friction may still require facts.
- **FOUNDER/COUNSEL FACT REQUIRED** = the repo cannot establish the fact safely; do not publish a definitive conclusion until confirmed.
- **UNKNOWN** = evidence is insufficient or legal applicability depends on facts not yet established.

This document is an engineering/legal-evidence checklist, not legal advice or a legal opinion.

## Authoritative sources checked

### European Union / GDPR

- European Commission — GDPR territorial/application scope: `https://commission.europa.eu/law/law-topic/data-protection/reform/rules-business-and-organisations/application-regulation/who-does-data-protection-law-apply_en`
- European Commission — information that must be given to individuals: `https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en`
- European Commission — when a DPO is required: `https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations/data-protection-officers/does-my-companyorganisation-need-have-data-protection-officer-dpo_en`
- European Commission — enforcement / lead DPA: `https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/enforcement-and-sanctions_en`
- European Data Protection Board — DPA / main establishment for SMEs: `https://www.edpb.europa.eu/sme/find-practical-info/data-protection-authority-you_en`
- EDPB Guidelines 8/2022 — identifying lead supervisory authority: `https://www.edpb.europa.eu/documents/guideline/guidelines-82022-on-identifying-a-controller-or-processors-lead-supervisory_en`

### California / CCPA

- California Privacy Protection Agency — updated monetary thresholds: `https://cppa.ca.gov/regulations/cpi_adjustment.html`
- California Privacy Protection Agency — FAQ / business applicability: `https://cppa.ca.gov/faq`

### Singapore / PDPA

- Personal Data Protection Commission — PDPA scope / business contact information: `https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act`
- PDPC — data protection obligations, including DPO designation: `https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations`
- PDPC — DPO requirement: `https://www.pdpc.gov.sg/overview-of-pdpa/data-protection/business-owner/data-protection-officers`

## 1. Privacy Policy — factual and legal claim matrix

| Current claim / topic | Status | Evidence / issue | Required action |
|---|---|---|---|
| PostHog analytics only initializes after affirmative analytics consent | **VERIFIED BY RUNTIME** | `src/components/PostHogProvider.tsx` keeps consent null initially, initializes only for `accepted`, and opts out/resets after rejection. `CookieConsentBanner.tsx` exposes Accept/Reject. | Keep claim, but add regression coverage if analytics architecture changes. |
| A browser visitor can reject analytics and no PostHog pageview component renders unless accepted | **VERIFIED BY RUNTIME** | `PostHogPageView` is rendered only when `consent === "accepted"`. | Keep. |
| Signal & Friction is currently established in Spain / EU | **FOUNDER/COUNSEL FACT REQUIRED** | Repository text is self-assertion, not authority. Business registration, establishment and actual decision-making location determine several downstream legal conclusions. | Founder must confirm current legal/business status and effective date; counsel/accountant should verify if needed. |
| “sole trader; registration as autónomo pending initial clients” | **FOUNDER/COUNSEL FACT REQUIRED** | Time-sensitive and potentially commercially/legal materially misleading once status changes. | Confirm current registration status; never leave a future-intent statement indefinitely. |
| Published street address is the correct public business/privacy contact address | **FOUNDER FACT REQUIRED** | Repo cannot establish that the address should remain public or is the legally appropriate contact address. | Confirm or replace with legally appropriate business/contact address. |
| GDPR applies if S&F has an EU establishment processing personal data in its activities | **SUPPORTED BY OFFICIAL LAW** | European Commission says GDPR applies to EU establishments regardless of where processing occurs. | Apply after establishment fact is confirmed. |
| S&F is the controller for the listed public-site/client processing | **FACT-SPECIFIC LEGAL CLASSIFICATION** | GDPR controller status turns on deciding purposes/means. This is likely for first-party site/client workflows but must be mapped per processing activity and processor relationship. | Create controller/processor inventory before definitive blanket wording. |
| No EU Article 27 representative is required because S&F is established in the EU | **CONDITIONALLY SUPPORTED** | Article 27 representative concerns certain non-EU controllers/processors; if actual EU establishment is confirmed, this concern is generally not the same one. | Do not publish until EU establishment fact is confirmed. |
| No GDPR DPO is required “given the scale” | **CONDITIONALLY SUPPORTED, NOT PROVEN** | European Commission: DPO mandatory when core activities involve large-scale sensitive-data processing or large-scale regular/systematic monitoring. Small scale alone can support non-mandatory status, but the actual processing inventory matters. | Document processing inventory and DPO assessment; avoid unsupported blanket conclusion. |
| Privacy notice should disclose identity/contact, purposes, categories, legal basis, retention, recipients, transfers, rights, complaint, withdrawal and applicable automated decision-making | **SUPPORTED BY OFFICIAL LAW** | European Commission Article 13-style guidance. | Use as deterministic notice checklist. |
| AEPD is the “current lead supervisory authority” | **FOUNDER/COUNSEL FACT REQUIRED** | EDPB: lead DPA depends on single/main establishment and where decisions on purposes/means are actually taken; only relevant for qualifying cross-border processing. A planned future Finland move is irrelevant until facts change. | Determine actual establishment(s), decision-making location and whether one-stop-shop lead authority analysis is applicable. Remove speculative future Finland statement unless/when it becomes true. |
| CCPA/CPRA automatically applies to California visitors | **NOT SUPPORTED** | CPPA says CCPA applies to covered for-profit businesses meeting statutory thresholds/relationships. Current 2025 revenue threshold is $26.625m, with alternative 100k-consumer/household or 50%-sale/share tests, plus certain related entities / voluntary certification. Visitor location alone is insufficient. | Determine whether S&F is a covered “business.” If not, phrase California commitments as voluntary policy rather than statutory CCPA rights. |
| “We do not sell or share personal information for cross-context behavioral advertising” | **FOUNDER/RUNTIME FACT REQUIRED** | Requires actual data-flow/vendor configuration analysis, not marketing intent. | Verify PostHog, Stripe, Supabase, Cloudflare and any ad/marketing integrations; preserve evidence. |
| Singapore PDPA automatically applies to a Singapore visitor | **NOT ESTABLISHED** | PDPC states PDPA obligations apply to organisations in scope, but business contact information is generally excluded from PDPA personal-data rules. Territorial/application analysis for a Spain-based business is fact-specific. | Do not equate APAC market routing with PDPA applicability. Obtain scope analysis if serving Singapore personal data beyond business contact info. |
| Singapore business contact information is generally excluded from PDPA personal-data scope | **SUPPORTED BY OFFICIAL LAW** | PDPC lists name/title/business phone/address/email and similar business contact information among exclusions. | Reflect in scope analysis; do not overstate rights for excluded data. |
| If an organisation is subject to Singapore PDPA, it must designate at least one DPO and make business contact information public | **SUPPORTED BY OFFICIAL LAW** | PDPC Accountability Obligation / DPO pages. | Current privacy wording cannot simultaneously imply substantive PDPA coverage while ignoring the DPO consequence. Resolve scope first. |
| “We respond within 30 days (or as required)” | **PARTLY SUPPORTED / OVERGENERALIZED** | GDPR uses one month, subject to conditions/extensions; other regimes have different timelines. One generic number is risky. | State regime-specific timing or “within the period required by applicable law.” |
| 24-month inactivity retention | **FOUNDER POLICY FACT, NOT LAW** | GDPR supports storage limitation, not a universal 24-month period. The period must match purposes and accounting/legal retention needs. | Create retention schedule by data category/system; then publish derived summary. |
| International transfers rely on SCCs / Data Privacy Framework as appropriate | **VENDOR/CONTRACT EVIDENCE REQUIRED** | Generic mechanisms exist, but whether each vendor/entity/region uses a particular mechanism must be verified from current DPA/subprocessor terms and hosting configuration. | Build vendor transfer register with region, legal entity, DPA, mechanism and review date. |
| Cloudflare processing is strictly necessary and needs no analytics consent | **IMPLEMENTATION + LEGAL BASIS REVIEW** | Hosting/security processing is functionally necessary, but cookie/ePrivacy and legitimate-interest conclusions require exact technologies and jurisdictional analysis. | Verify cookies/storage actually used by Cloudflare/public app and legal basis; avoid categorical wording until mapped. |

## 2. Privacy runtime inventory — currently evidenced

| Component / provider | Current repository evidence | Confidence |
|---|---|---|
| PostHog | Explicit opt-in initialization; reset/opt-out on rejection; manual pageview only after consent. | HIGH |
| Cookie preference | Local client preference with explicit Accept / Reject UI. | HIGH |
| Supabase | Client/auth/data provider used across frontend/backend; exact data categories and regional/transfer terms need contract/runtime inventory. | MEDIUM on use, LOW on legal transfer mechanism |
| Stripe | Payment provider; canonical payment metadata stored server-side. Full card numbers are not handled by the app in reviewed code, but exact Stripe-hosted collection/contract terms remain external. | MEDIUM/HIGH |
| Cloudflare | Pages/Functions hosting and delivery are in use. Exact edge/security data retention and transfer terms require current provider evidence. | HIGH on use, LOW on legal details |

## 3. Required founder factual questionnaire — hard gate before Privacy rewrite

The following cannot be responsibly inferred from code:

1. What is Signal & Friction’s **current legal operating status** today: unregistered individual, Spanish autónomo, company/entity, or other?
2. What is the current **country/countries of establishment** for the business, and from where are the purposes/means of personal-data processing actually decided?
3. Is the currently published Teruel street address intended to remain the official/public privacy contact address?
4. Which email should be the durable privacy/data-subject request contact: personal Gmail, `hello@signal-and-friction.com`, or another dedicated address?
5. Do you currently have any clients, workers, contractors, or establishment in Finland, or is Finland only a future possibility? If only future, remove it from present-tense legal policy.
6. Has S&F ever met or voluntarily opted into any CCPA/CPRA “business” coverage condition? If no, do we want voluntary California rights anyway?
7. For Singapore: are we intentionally taking on PDPA-covered processing beyond excluded B2B business contact information? If yes, obtain a DPO/scope decision before promising PDPA compliance.
8. What retention periods do you actually want/need by category: prospect lead, client diagnostic inputs, deliverables, analytics identifiers, payment metadata, accounting records, support correspondence?
9. Are any email marketing, retargeting, advertising pixels, enrichment providers or audience-sharing services active now or planned at launch?
10. Have current DPAs/data-processing terms and hosting regions been recorded for PostHog, Supabase, Stripe and Cloudflare?

Until these are answered, the Privacy Policy should not be labelled “verified current.”

## 4. Terms of Service — audit boundary

The Terms page contains both product truth and legal contract terms. Product-truth reconciliation can be deterministic; legal clauses cannot.

### Product truth to reconcile

- remove historical `Beta Diagnostic` naming if still active in visible terms;
- do not force a “one dominant friction” outcome when abstention is part of the service contract;
- ensure current prices/scope are referenced from the current Pricing page rather than copied into legal text;
- ensure payment/SLA language starts from canonical payment truth, not intake/page load;
- distinguish Diagnostic from later Intervention/Monitoring/Expansion/Autonomy phases.

### Counsel/founder verification required

- contracting party identity and registration status;
- governing law / jurisdiction / dispute forum;
- consumer-vs-business status and any mandatory withdrawal/refund rights;
- limitation of liability / indemnity / warranty wording;
- IP ownership/licence terms for deliverables and client materials;
- tax/VAT invoicing obligations;
- termination/cancellation rules;
- enforceability of the Specificity Guarantee and refund procedure.

## 5. Specificity Guarantee — product truth review

The current Guarantee page is substantially improved relative to the historical frontend:

- no fixed conversion/revenue promise;
- explicit statement that unavailable analytics/private data are not fabricated;
- evidence status must be distinguished;
- projected impact is optional and, when included, must be case-specific and assumption-labelled;
- explicit abstention when evidence is insufficient;
- business outcome excluded from guarantee.

### Remaining cleanup

- `Version 5.1` is presentation-version theatre rather than canonical authority; remove or replace with a dated policy revision identifier if versioning is legally/operationally useful;
- refund timing and eligibility need counsel/founder confirmation because they create a commercial/legal obligation;
- “if the diagnosis doesn’t surface a friction point specific to your product, you don’t pay” must be reconciled carefully with abstention: define whether a valid abstention itself triggers no-charge/refund, and make Pricing/Terms/Guarantee consistent.

## 6. Engineering controls required before legal pages can be called aligned

1. **Legal fact registry**: versioned factual business identity, establishment, privacy contact and effective dates; no page-local future claims.
2. **Vendor/data-flow register**: provider, purpose, data categories, role, region, DPA/source, transfer mechanism, review date.
3. **Retention schedule** by data category, not a global invented period.
4. **Cookie/storage inventory** validated against actual browser/runtime behavior.
5. **Policy regression tests** for runtime-verifiable promises such as PostHog opt-in.
6. **Review dates / revisit triggers** for laws and provider terms.
7. Fail closed on unknown applicability: do not claim a regime applies because a commercial market route exists.

## 7. Current decision

**Privacy:** HOLD rewrite until founder factual questionnaire + provider evidence are complete. Current policy is not certified current.

**Terms:** HOLD substantive legal rewrite; product-truth cleanup should be drafted separately and reviewed before replacing contract language.

**Guarantee:** product semantics are close to V2 truth; remove presentation-version theatre and freeze a reviewed refund/abstention contract before declaring it fully aligned.

**Frontend OS v2.1:** legal pages remain a release/governance gate for the claim “perfectly aligned,” but they do not justify blocking engineering verification of the rest of the frontend. Keep PR draft until the legal-review decision is explicit.
