# Signal & Friction — Frontend OS v2 Audit

**Status:** CANONICAL REMEDIATION PLAN v0.1  
**Date:** 2026-08-13

## Executive finding

The public frontend is materially behind the backend/domain architecture.

Backend/domain truth now includes:
- canonical six-layer diagnosis model and 21-mechanism registry;
- hardened Learning/Calibration v2;
- Finance OS v2.1;
- canonical offer catalog;
- strict evidence/abstention boundaries;
- global market strategy with one canonical product engine.

Public frontend still contains v1 assumptions:
- nearly duplicated Global and Singapore/APAC landing implementations;
- hard-coded `US | APAC` lead region model;
- hard-coded regional MRR bands;
- route-specific claims such as JCB/PayNow/PDPA framed as if they were diagnostic capabilities;
- language implying a single friction is necessarily “killing revenue” rather than a defensible hypothesis/diagnosis subject to evidence;
- version labels (`Behavioral Diagnostic System v4.5`) that are presentation artifacts rather than canonical product/version authority;
- several claims duplicated across page body, metadata, JSON-LD and FAQ rather than sourced from one claims registry;
- modelled conversion-lift ranges embedded in page logic rather than evidence-governed claims;
- market logic implemented as page forks instead of data/config.

## Frontend OS v2 constitutional rules

1. **One commercial engine, multiple market surfaces.** No copied country sites.
2. **Market != jurisdiction.** A commercial surface may serve several countries; Finance support is independently gated.
3. **Offer authority is canonical.** Prices/scope come from `src/lib/offer-catalog.ts` only.
4. **Claims are evidence-governed.** Public claims must be declared centrally with status/evidence/review date.
5. **Abstention is part of the product.** Copy must allow “evidence insufficient” rather than promise a diagnosis where evidence cannot support one.
6. **Scan != diagnosis.** Technical/observable signals never become a behavioral or revenue claim in copy without diagnostic evidence.
7. **No regional capability theatre.** Do not mention payment rails, privacy laws or local compliance checks unless the actual workflow performs them and evidence exists.
8. **No hard-coded FX economics.** Local-currency displays, if introduced, derive from a defined pricing/FX policy; payment authority remains canonical.
9. **Instrumentation is first-class.** Every market surface emits market, country (if known/self-selected), offer, acquisition source and funnel state.
10. **Accessibility/performance before decoration.** Remove expensive effects if they degrade LCP/CLS/interaction quality without measurable conversion benefit.

## Market-surface decision

### GLOBAL
Initial served markets:
- US
- Canada
- United Kingdom

Default language: English.  
Canonical offer currency: USD until a pricing policy says otherwise.

### APAC
Initial served markets:
- Singapore
- Australia

Default language: English.  
APAC is a commercial acquisition surface, not a claim that the product performs APAC tax/privacy/payment compliance.

### Later route experiments
- `/uk` or another dedicated route may be added inside the same engine if controlled experiments show material conversion lift.
- Japan requires native-language discovery before localization.
- No country receives an independent code fork by default.

## Critical copy corrections

### Replace causal overstatement
Avoid:
- “the friction killing your revenue”
- “where revenue breaks” as established fact before diagnosis
- “exactly one” when evidence may support abstention or several competing hypotheses

Prefer:
- “isolate the highest-confidence friction we can defend from your evidence”
- “separate measured signals from hypotheses and uncertainty”
- “if evidence is insufficient, we say so”

### APAC correction
Remove public capability claims for JCB/PayNow/PDPA unless those checks are actually implemented as explicit tools/workflows.

APAC messaging should focus on the same canonical outcome with market-relevant context, not pretend regional regulatory/payment expertise.

## Target component architecture

```text
src/lib/market-profiles.ts       # canonical commercial market configuration
src/lib/public-claims.ts         # claim registry + evidence/freshness status
src/components/MarketLanding.tsx # one landing engine
src/components/MarketSelector.tsx
src/components/DiagnosticIntake.tsx
src/components/PublicEvidenceBoundary.tsx
src/app/page.tsx                 # GLOBAL config wrapper
src/app/sg/page.tsx              # APAC config wrapper / compatibility route
src/app/pricing/page.tsx         # canonical offers + market presentation only
functions/api/leads/submit.ts     # marketSurface + countryCode + backward-compatible region
```

## Data contract v2

Lead/intake records should distinguish:

```ts
{
  marketSurface: "global" | "apac";
  countryCode?: "US" | "CA" | "GB" | "SG" | "AU";
  language: "en";
  acquisitionSource?: string;
  targetUrl: string;
  funnelSituation: string;
  deliveryMode: "dwy" | "dfy";
  companyStage?: string;
  urgency?: string;
}
```

`countryCode` is user-supplied/inferred only for commercial routing; it is never reused as Finance tax-residency truth.

## Migration sequence

### Phase F0 — integrity foundation
- add `market-profiles.ts`;
- add `public-claims.ts`;
- expand lead API contract while keeping `region` compatibility;
- add CI guard against new hard-coded public prices/market claims.

### Phase F1 — shared landing engine
- extract common homepage and `/sg` logic into `MarketLanding`;
- delete duplicated behavioral/funnel logic;
- route Global/APAC through config;
- preserve analytics event continuity.

### Phase F2 — claims + metadata reconciliation
- regenerate metadata/JSON-LD from canonical claims/offers;
- remove unsupported APAC capability claims;
- reconcile FAQ, OpenGraph, homepage, pricing and legal language.

### Phase F3 — conversion/performance pass
- instrument per-surface funnel;
- run Lighthouse/Web Vitals regression;
- test whether canvas/hex effects improve or hurt conversion/performance;
- only retain visual complexity that earns its cost.

### Phase F4 — controlled market experiments
- Global: US vs Canada vs UK messaging through config/experiment IDs, not forks.
- APAC: Singapore vs Australia through config/experiment IDs, not forks.
- dedicated localized route only after paid-demand evidence.

## Acceptance criteria

Frontend OS v2 is not complete until:
- no Global/APAC duplicated landing business logic remains;
- no public price/scope duplication outside canonical offer authority;
- every consequential quantitative/causal claim is registered and evidence-statused;
- Scan and diagnosis are clearly distinguished everywhere;
- lead records preserve `marketSurface` separately from `countryCode`;
- public metadata/JSON-LD match visible product truth;
- Lighthouse/Web Vitals and funnel analytics are measured before/after;
- authenticated admin and public payment/intake E2E pass in production.
