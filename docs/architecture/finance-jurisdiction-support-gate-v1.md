# Finance OS — Jurisdiction Support Gate v1

**Status:** CANONICAL SUPPORT POLICY v1  
**Date:** 2026-08-13  
**Purpose:** Prevent Finance OS from claiming a country is supported when only fragments of that country's rules are understood.

## Constitutional rule

Finance OS never supports a **country in the abstract**. It supports a bounded **Jurisdiction Profile**:

`jurisdiction + entity type + registrations + employment state + transaction scope + exclusions + supported obligations + evidence version`

A profile is supported only when every automated decision inside that boundary is testable against authoritative sources or deterministic accounting state. Any fact pattern outside the boundary must abstain and escalate.

## Required support levels

- `RESEARCH` — official sources mapped; no customer-facing compliance claim.
- `BETA` — bounded profile frozen; deterministic rules + regression suite exist; professional review still mandatory before consequential filing/payment actions.
- `ACTIVE` — bounded profile has passed source review, expert adjudication, regression, live shadow runs, freshness monitoring, and explicit product/legal sign-off.
- `UNSUPPORTED` — ambiguity/judgment density or maintenance burden is too high for current economics.

## Hard gates before BETA

A pack cannot enter BETA unless all are true:

1. **Bounded ICP** — exact entity/person profile is named. No generic “all businesses”.
2. **Deterministic trigger map** — each supported obligation has observable triggers and explicit due-date/status logic.
3. **Official-source authority** — every legal/compliance rule points to a current government/regulator source and version/check date.
4. **Exception taxonomy** — known exceptions that invalidate automation are enumerated and machine-detectable where possible.
5. **Abstention contract** — unknown/ambiguous facts terminate automation and create `professional_review`; no model guess.
6. **No hidden jurisdiction inference** — residence, nexus, permanent establishment, worker classification, beneficial ownership, treaty position, tax characterization, and similar legal statuses are never inferred from weak proxies.
7. **Regression suite** — happy paths, thresholds, boundary dates, exceptions, missing evidence, contradictory evidence, changed rules, multi-jurisdiction cases.
8. **Freshness SLA** — owner, review cadence, change detection and kill-switch are defined.
9. **Economic fit** — expected annual customer value materially exceeds pack maintenance + professional-review + support cost.
10. **Regulatory perimeter** — product scope is bookkeeping/compliance orchestration and decision support; regulated legal/tax/investment advice is excluded unless separately authorized.

## Automatic disqualifiers for a supported profile

The pack must return `OUT_OF_SCOPE_REQUIRES_PROFESSIONAL_REVIEW` when any excluded condition appears. Typical examples:

- cross-border permanent-establishment or tax-residency determination;
- multiple entities or consolidated/group tax unless the profile explicitly supports them;
- controlled foreign corporation / transfer-pricing / treaty analysis;
- uncertain worker/contractor classification;
- sector-specific regulated tax treatment;
- unresolved sales-tax/VAT/GST nexus or place-of-supply characterization;
- mergers, equity compensation, restructurings, insolvency, complex capital gains;
- legal interpretation where the official rule explicitly depends on facts-and-circumstances judgment.

## Provisional jurisdiction research order

This is **not** a support claim. It is the order in which bounded profiles should be investigated.

### 1. Singapore — strongest first research candidate

Why:
- IRAS publishes centralized corporate-income-tax and GST filing flows and current due dates.
- IRAS explicitly supports filing from accounting/payroll software and maintains digital business services.
- Strong fit with the existing APAC commercial surface.

Candidate bounded profile:
- Singapore private limited company;
- domestic single entity;
- digital/professional services;
- no complex international tax position;
- optionally no employees in v0, then payroll/CPF as a later sub-pack;
- supported scope initially limited to bookkeeping state, filing-calendar orchestration, verified GST/CIT obligations, treasury policy and evidence collection.

### 2. United Kingdom — strong second research candidate

Why:
- Companies House + HMRC publish clear annual-account, confirmation-statement and company-tax deadlines.
- Centralized company registry and tax authority create a relatively clean evidence surface.
- UK is a first-wave commercial market.

Candidate bounded profile:
- UK private limited company;
- single entity, owner-managed B2B digital/professional services;
- no group, no international tax analysis;
- VAT/PAYE treated as explicit optional registrations/sub-packs, never inferred.

### 3. Australia — promising bounded-company profile

Why:
- ASIC annual company review has explicit recurring steps and deadlines.
- Federal company/GST/PAYG obligations can be separated from state-specific layers.
- Australia fits the APAC English commercial surface.

Candidate bounded profile:
- Australian proprietary company;
- single entity, domestic digital/professional services;
- no employees initially or payroll as a separate sub-pack;
- state-specific duties outside initial scope.

### 4. Canada — viable only with province-bounded profiles

Why:
- CRA provides corporation, GST/HST and payroll digital services and due-date guidance.
- Federal/provincial layers and Quebec-specific administration make “Canada” too broad as one ruleset.

Candidate bounded profile:
- federally incorporated or specifically province-defined corporation;
- one named province;
- no cross-province payroll/sales complexity in v0;
- GST/HST registration explicit, never inferred from incomplete revenue data.

### 5. United States — highest commercial priority, lower jurisdiction simplicity

Why:
- Huge commercial importance, but federal, state and local obligations vary by structure/location.
- IRS explicitly directs businesses to state websites for state-level requirements.

Decision:
- Do **not** build a generic “US pack”.
- Research narrow profiles such as `Delaware C-Corp + named operating state` or another evidence-backed ICP after real customer discovery.
- Sales-tax nexus, multi-state payroll, entity elections, reasonable-compensation questions and cross-border issues remain out of scope until separately modeled.

### 6. Germany — attractive market, intentionally later for Finance compliance automation

Why:
- ELSTER provides strong digital filing infrastructure.
- The obligation surface includes corporate tax, VAT, trade tax, electronic balance/profit-loss submissions and newer e-invoice requirements; trade-tax administration introduces municipal structure.

Decision:
- Commercial market may be tested before a Finance pack exists.
- Do not promise Germany compliance support until a narrow GmbH profile demonstrates low enough judgment density and acceptable maintenance economics.

## Buyer gate

Jurisdiction eligibility and customer eligibility are separate.

Finance OS should not target every freelancer/sole trader merely because their rules are simple. A commercial customer should have enough recurring financial/compliance work that the product creates measurable value.

Initial ICP hypothesis for validation:
- incorporated owner-managed digital / professional-service / SaaS company;
- recurring revenue and recurring operating spend;
- existing accountant/bookkeeper or meaningful founder/admin time spent on finance operations;
- enough cash flow that compliance misses, poor treasury allocation, weak runway visibility or fragmented finance tooling create material economic cost;
- complexity below the pack's abstention boundary.

No revenue threshold is canonical until willingness-to-pay data exists. The gate is economic: `annual measurable value created > annual product + review cost by a healthy margin`.

## Evidence standard

Country-pack development uses this hierarchy:
1. government/tax authority/company registry/regulator;
2. professional expert adjudication of the bounded profile;
3. deterministic tests;
4. calibrated model assistance only where deterministic truth cannot express the task.

A model-generated explanation can never promote a rule to `verified`.
