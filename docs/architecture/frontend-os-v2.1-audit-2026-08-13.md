# Signal & Friction — Frontend OS v2.1 Alignment Audit

**Status:** ACTIVE REMEDIATION PLAN  
**Date:** 2026-08-13  
**Scope:** public acquisition, intake/conversion, client delivery, internal admin OS, shared design/runtime shell  
**Canonical authority remains:** Signal & Friction V2. This document does not create a V3 operating standard.

## Executive decision

The frontend does not need a new product constitution. It needs implementation reconciliation.

`docs/canonical/V2-OPERATING-STANDARD.md` explicitly says V3 should exist only when new primary evidence, production failure, economic result, or protocol/regulatory change materially invalidates V2. The current problem is different: backend/domain/commercial authority has moved to V2 while several public and internal surfaces still encode historical V1 assumptions.

Therefore the target is **Frontend OS v2.1: V3-grade execution of V2 truth**.

The priority order is:

1. truth and authority;
2. conversion path coherence;
3. market/config reuse;
4. accessibility/performance;
5. maintainability;
6. visual refinement only where it supports the above.

No redesign is approved merely because it looks newer.

## Source-of-truth map

| Concern | Authority |
|---|---|
| Product/engineering constitution | `docs/canonical/V2-OPERATING-STANDARD.md` |
| Current authority pointers | `docs/canonical/CURRENT.md` |
| Commercial offers/prices/scope | `src/lib/offer-catalog.ts` |
| Public claims | `src/lib/public-claims.ts` |
| Commercial market routing | `src/lib/market-profiles.ts` |
| Diagnosis semantics | `src/domain/reasoning/types.ts` + `mechanisms.ts` |
| Training/premium readiness | canonical Learning + Diagnostic Calibration contracts |
| Finance truth | Finance OS v2.x contracts, independent of commercial market route |

## Frontend zones

### Z1 — Public Acquisition
Routes: `/`, `/sg`, `/scan`, `/portfolio`, `/pricing`, OpenGraph/metadata/JSON-LD.

Purpose: earn attention and convert qualified prospects without overstating evidence.

Authority requirements:
- only approved public claims;
- Scan is observable/technical triage, not behavioral diagnosis;
- prices and scope derive from offer catalog;
- market surface derives from market config;
- no causal revenue claim before evidence;
- abstention remains possible and visible.

### Z2 — Intake / Purchase / Confirmation
Routes: homepage intake, `/confirmed`, `/confirmed/success`, payment transitions.

Purpose: preserve user intent and commercial truth through purchase.

Authority requirements:
- marketSurface and countryCode are distinct;
- offer/price identity comes from canonical catalog/payment state;
- no internal segment labels leak to customers;
- 72h commitment begins at the documented commercial trigger, not an arbitrary page-load timer;
- UI state must not imply analysis has begun before the underlying workflow actually has.

### Z3 — Client Delivery
Routes: `/deliverable/[clientKey]`, `/sla/[clientKey]` and associated client-facing components.

Purpose: make evidence, observation, hypotheses, judgment, recommendation and uncertainty reviewable.

Authority requirements:
- derive from canonical Diagnosis semantics;
- clearly distinguish measured / modeled / pending / unknown;
- never turn a technical signal into a mechanism by presentation alone;
- client copy may be persuasive but cannot erase uncertainty or provenance.

### Z4 — Internal Operating UI
Routes: `/admin/*` including Pipeline, Prospecting, Scaffolds, Finance, Priorities, Learning, Certified/archive surfaces.

Purpose: operator control, evidence review, approvals and learning — not public marketing.

Authority requirements:
- each module must expose its own source of truth and approval boundary;
- archived/non-gating surfaces must say so;
- no status chip may imply production/certification truth that the underlying authority does not support;
- consequential writes remain server-authorized;
- UI should surface unknown/error state instead of manufacturing certainty.

## P0 — truth/integrity drift

### P0.1 Homepage causal overclaim
`src/app/page.tsx` still renders:
- `Behavioral Diagnostic System v4.5`;
- `single friction point killing your revenue`;
- `Find the one friction killing your conversion.`

These contradict the current claim authority and evidence model. A diagnosis can abstain; observed friction is not automatically causal revenue proof; presentation-version labels are not canonical authority.

**Required cut:** render hero/method language from `market-profiles.ts` + approved `public-claims.ts`, preserving the current funnel behavior while removing causal certainty.

### P0.2 Homepage contains a generic modeled lift calculator
The homepage still defines `LIFT_LOW = 0.08` and `LIFT_HIGH = 0.20` as generic modeled-impact bounds.

`public-claims.ts` explicitly forbids publishing a fixed/generic conversion or revenue lift as an expected client outcome until a defensible benchmark exists.

**Required cut:** remove the generic lift range from public decision framing. If an economic calculator remains, it must be scenario math driven by user assumptions and clearly separated from expected outcome/probability.

### P0.3 Root metadata and JSON-LD bypass claims/offer authority
`src/app/layout.tsx` still includes:
- `I find where revenue breaks...`;
- structured copy asserting one dominant friction without an abstention boundary;
- hard-coded `$350` and `$2000` JSON-LD prices and offer descriptions;
- FAQ copy maintained separately from `public-claims.ts`.

**Required cut:** generate consequential metadata/structured data from canonical claims/offers. Metadata must not be a second marketing database.

### P0.4 Pricing copy overstates causal certainty
`src/app/pricing/page.tsx` correctly derives live price/scope from `offer-catalog.ts`, but Diagnostic outcome copy says `Know exactly which friction is costing you conversions`.

That is stronger than the evidence contract. The product can isolate the highest-confidence defensible friction/hypothesis and can abstain when evidence is insufficient.

**Required cut:** preserve offer architecture; replace only unsupported causal/certainty language with approved evidence-ranked/abstention copy.

### P0.5 Confirmation route duplicates offer identity/pricing
`src/app/confirmed/page.tsx` derives `$350` vs `$2000` from legacy segment labels and hard-codes Stripe price IDs. It also starts a 72-hour visual countdown from page load and labels analysis phases as if they were live workflow state.

**Required cut:** confirmation derives active diagnostic phase, displayed price and payment identity from canonical offer data. Timeline labels must be truthful UI states; 72h SLA clock starts only from the actual contractual trigger.

### P0.6 Legacy Singapore fork remains in repository
`src/app/sg/page.tsx` correctly reuses the global engine as a migration bridge, but `src/app/sg/SingaporeClient.tsx` remains a large historical duplicate containing forbidden regional/causal copy.

**Required cut:** confirm zero imports/references, then delete the dead implementation. Historical code remains in Git history; dead capability theatre should not remain an attractive copy/paste path.

## P1 — architecture/conversion drift

### P1.1 Homepage still detects market through `window.location.pathname`
The public engine has canonical `MARKET_PROFILES`, but the active homepage does not consume it. Market semantics remain implicit path branches and the lead submission still sends only legacy `region: US|APAC` from the client.

**Required cut:** pass a typed MarketProfile to one shared landing engine. Lead payload carries `marketSurface`, optional user-selected `countryCode`, language and legacy region compatibility.

### P1.2 Public shell is duplicated instead of componentized
Homepage/pricing/portfolio/scan repeat header/footer/grid/clock/brand primitives with literal Tailwind colors and page-local copy.

**Required cut:** introduce a small public shell/design primitive layer only after P0 truth cuts. Do not build a design-system platform; extract repeated primitives when the second real consumer exists.

### P1.3 Visual style has tokens but pages bypass them
`globals.css` defines canonical color/font tokens and reduced-motion behavior, but many pages use literal `[#0A0908]`, `[#D4A853]`, etc. This makes future accessibility/contrast changes expensive and creates subtle palette drift (`#5C9A6B`, `#6B8F5E`, multiple error reds).

**Required cut:** new/refactored components use semantic tokens. Do not churn every historical class solely for cosmetic purity.

### P1.4 Acquisition IA is unclear
Current public experience exposes Homepage Wizard, Free Scan, Portfolio Samples and Pricing, but their roles are not encoded in a single navigation/value path. The homepage itself behaves like both landing page and multi-step intake.

**Required experiment:** define one primary conversion path and one secondary proof path. Recommended initial hierarchy:
`evidence-ranked diagnostic → see method/sample → qualify/intake → pricing/payment` with Free Scan explicitly top-of-funnel triage, not a competing diagnosis product.

Do not implement a new nav mega-system without funnel evidence.

### P1.5 Portfolio is responsibly labeled but rhetorically aggressive
`/portfolio` correctly states samples are fictional and evidence counts are not outcomes. However `Everyone else shows you logos and percentages. Most of them are made up.` is an unnecessary unprovable market-wide accusation.

**Required cut:** keep the useful contrast (show method/evidence, not vanity metrics) without asserting competitors fabricate claims.

## P2 — internal/productivity drift

### P2.1 Admin shell mixes unrelated headline metrics
Global header currently shows Active Leads, Net Worth and Pending tasks on every module. This forces Finance data fetches into Learning/Prospecting/etc and gives one horizontal dashboard bar authority it does not need.

**Recommendation:** retain a thin shell; move module-specific KPIs into modules. Global shell should show only cross-system health/action state that has operator value.

### P2.2 Admin authorization UX is client-driven
`src/app/admin/layout.tsx` checks a client-visible email whitelist and writes the Supabase access token into a JS-created cookie. Server APIs still need to remain the true authorization boundary.

**Recommendation:** treat the client gate as UX only, never security authority. Migrate to a server-verifiable session boundary when touching auth architecture. Do not widen privileges to simplify frontend routing.

### P2.3 Admin dashboard is a monolith
`src/app/admin/dashboard/page.tsx` is roughly 200 KB, while Prospecting, Finance, Scaffolds and other modules are also large page-local implementations.

**Recommendation:** decomposition is justified only by change frequency, runtime performance or regression pain. Extract domain panels/hooks around real seams; do not rewrite the command center for aesthetic symmetry.

### P2.4 Archived Certified surface needs persistent non-authority treatment
Commercial `CERTIFIED_TIER` is archived and current diagnostic certification is fail-closed. Any `/certified` or admin Certified UI must remain visibly historical/non-enrolling/non-gating unless a new product decision explicitly reactivates it.

## P2 — performance/accessibility

- Heavy canvas/hex/oscilloscope effects must earn their cost with measured funnel impact.
- Root/pricing currently lazy-load major visual effects, which is directionally correct, but performance must be measured rather than assumed.
- Reduced-motion support exists globally; any future motion primitive must inherit it.
- Focus-visible support exists; audit labels, form errors, semantic headings and mobile touch targets during route refactors.
- Avoid `h-screen`/`overflow-hidden` on transactional routes where mobile browser chrome, zoom or validation errors can make controls unreachable.

## What is already aligned

- `offer-catalog.ts` is a strong singular commercial authority and pricing already consumes it for most pricing cards.
- `public-claims.ts` establishes an explicit approved/conditional/forbidden claim model.
- `market-profiles.ts` correctly separates Global/APAC commercial routing from jurisdiction/compliance truth.
- `/sg/page.tsx` already removed the unsupported JCB/PayNow/PDPA public capability theatre from the active route.
- `/scan` explicitly says it observes rather than diagnoses and relabels threshold-derived mechanisms as possible signals.
- `/portfolio` prominently states its cases are fictional and its numbers are evidence counts, not client outcomes.
- global CSS has reduced-motion and keyboard-focus foundations.

## Target component architecture — minimal, not platform-first

```text
src/lib/market-profiles.ts        # existing authority
src/lib/public-claims.ts          # existing authority
src/lib/offer-catalog.ts          # existing authority
src/lib/public-metadata.ts        # derived metadata/JSON-LD only
src/components/public/
  PublicShell.tsx                 # only if reuse pays for extraction
  MarketLanding.tsx               # one engine, typed profile input
  EvidenceBoundary.tsx
  DiagnosticIntake.tsx
src/app/page.tsx                  # Global wrapper
src/app/sg/page.tsx               # APAC wrapper
src/app/pricing/page.tsx          # offer catalog consumer
src/app/confirmed/page.tsx        # active-offer consumer
```

No country forks. No independent APAC product logic. No new marketing CMS.

## Remediation sequence

### Cut A — P0 commercial truth
1. homepage hero/callout → market profile + approved claims;
2. remove generic 8–20% expected-lift framing;
3. pricing Diagnostic copy → evidence-ranked + abstention-safe;
4. metadata/JSON-LD → derived claims/offers;
5. confirmation → canonical offer/price + truthful state;
6. delete dead Singapore client after reference guard.

### Cut B — market/config reconciliation
1. extract one `MarketLanding`;
2. typed `marketSurface`/country contract;
3. preserve legacy analytics `region` only as compatibility field;
4. add country self-selection only if it changes routing/measurement.

### Cut C — public shell + performance
1. extract repeated shell primitives opportunistically;
2. Lighthouse/Web Vitals baseline for `/`, `/pricing`, `/scan`, `/sg`;
3. retain/remove visual effects based on measured cost/value;
4. mobile/accessibility regression pass.

### Cut D — internal OS
1. module-specific KPIs;
2. admin monolith decomposition where active change pain justifies it;
3. server-session/auth boundary hardening as separate security change;
4. preserve Learning/Finance/Diagnostic authority labels.

## Regression gates

Add deterministic checks that fail CI when active public surfaces introduce:
- forbidden causal phrases (`killing your revenue`, generic `where revenue breaks` as fact);
- fixed/generic conversion-lift ranges;
- active offer prices outside `offer-catalog.ts` or an explicit test fixture;
- JCB/PayNow/PDPA capability claims without a registered capability;
- active imports of `SingaporeClient.tsx`;
- `/scan` described as the paid behavioral diagnosis;
- Certified presented as active enrollment while catalog remains archived.

These string guards are not sufficient evidence of correctness, but they cheaply prevent known regressions while route-level tests cover behavior.

## Acceptance criteria

Frontend OS v2.1 is aligned when:

- public commercial truth derives from the three canonical authorities (market, claims, offers);
- no active public route asserts causal revenue impact before evidence;
- abstention is not erased by marketing copy;
- Global/APAC share one landing implementation with config differences only;
- lead intake records marketSurface separately from countryCode and legacy region;
- confirmation/payment UI derives offer identity rather than legacy segment magic numbers;
- Scan remains a technical/observable triage product in copy and structured data;
- metadata/JSON-LD do not maintain a second copy of prices/claims;
- client deliverables preserve canonical evidence/uncertainty semantics;
- internal modules expose accurate authority/status boundaries;
- Lighthouse/Web Vitals, accessibility and funnel events are measured before/after material visual changes;
- public checkout/intake and authenticated admin smoke tests pass on the exact release candidate.

## Decision

**Do not create Signal & Friction V3 yet.** Ship the frontend reconciliation as V2.1. Revisit a V3 constitution only when evidence shows a material product/business architecture change rather than frontend drift.
