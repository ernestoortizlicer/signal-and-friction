# Signal & Friction — Frontend Route Alignment Matrix v2.1

**Date:** 2026-08-13  
**Constitution:** Signal & Friction V2 remains canonical.  
**Program:** Frontend OS v2.1 — implementation reconciliation, not a V3 constitution.

## Status vocabulary

- **ALIGNED** — current route behavior/copy matches the relevant V2 authority at the reviewed boundary.
- **REMEDIATE** — deterministic drift exists and can be corrected without new domain architecture.
- **GROUND-TRUTH DEPENDENCY** — UI cannot be made truthful by copy alone; an authoritative backend/state contract is required.
- **LEGAL REVIEW** — the route contains legal/regulatory assertions that must be verified against current law and actual business facts before substantive edits.
- **ARCHIVED** — intentionally non-commercial/non-gating historical surface.
- **REVIEWED-PARTIAL** — no release-blocking contradiction established in the reviewed sections, but the full large component was not rewritten line-by-line.

## Public acquisition and commercial routes

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| `/` | **ALIGNED for public truth; conversion path provisional** | Replaced V1 monolith with one typed market landing. Generic 8–20% lift calculator, `v4.5` label, causal `killing revenue` copy and pathname market branching are no longer active. Primary CTA uses Free Scan so lead capture still exists while native intake is reconciled. | `market-profiles.ts`, `public-claims.ts`. Do not re-add native intake until its backend contract is market/offer-authoritative. |
| `/sg` | **ALIGNED for public truth** | Uses the same landing engine as Global with APAC config. No Singapore code fork and no JCB/PayNow/PDPA capability theatre. | `market-profiles.ts`; market route != jurisdiction capability. |
| Global OpenGraph image | **ALIGNED** | Removed `One friction. One fix.` framing; now evidence/uncertainty/72h aligned. | `public-claims.ts`. |
| Root metadata / JSON-LD (`src/app/layout.tsx`) | **REMEDIATE — P0 OPEN** | Still duplicates causal copy, one-dominant-friction language, hard-coded Diagnostic prices and independent FAQ copy. | Integrate derived `public-metadata.ts`; metadata must not be a second commercial database. Connector blocked safe replacement in this PR so far. |
| `/pricing` visible page | **REMEDIATE — P0 OPEN** | Prices/scopes derive from `offer-catalog.ts` (good), but Diagnostic outcome copy still says `Know exactly which friction is costing you conversions` and forces one dominant friction even where abstention may be required. | Surgical copy patch only; do not rewrite pricing architecture. |
| `/pricing` metadata | **ALIGNED** | Removed hard-coded prices and `One friction. One decision.` metadata; derives description from public evidence/abstention claims. | `public-claims.ts`. |
| `/scan` | **ALIGNED / REVIEWED-PARTIAL** | Explicitly states observation != diagnosis and relabels threshold-derived mechanism names as possible signals. Captures a lead without pretending to be the paid diagnosis. | Keep technical signal producer firewalled from canonical Diagnosis. |
| `/portfolio` | **REMEDIATE — P1** | Fictional samples and evidence counts are clearly disclosed (good). `Everyone else... Most of them are made up` is an unprovable category-wide accusation. | Keep method/evidence contrast; remove competitor-wide assertion. |
| `/certified` | **ARCHIVED / ALIGNED** | Public route is noindex and rejects new enrollments/payments. | `CERTIFIED_TIER` archived in `offer-catalog.ts`. |

## Intake, payment and confirmation

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| Native homepage intake (historical V1 wizard) | **REMOVED from active homepage** | The old wizard mixed market routing, legacy segment labels, causal copy and generic modeled lift. A new shared form was not added because the connector blocked the submit-bearing component. | Temporary lead path is `/scan`. Reintroduce native intake only after end-to-end contract reconciliation. |
| `/api/leads/submit` (frontend dependency) | **GROUND-TRUTH DEPENDENCY — P0 OPEN** | Accepts only legacy `region: US|APAC`, persists that field, maps to `microdosing/high_ticket`, and duplicates Diagnostic prices/price IDs. | Add typed `marketSurface`, optional `countryCode`, language and canonical offer identity while preserving legacy compatibility. |
| `/confirmed` | **REMEDIATE — P0 OPEN** | Legacy page still duplicates `$350/$2000`, Diagnostic price IDs, internal segment labels and starts a visual 72h timer from page load before payment truth exists. Connector blocked replacement/deletion in this PR. | Convert to pre-payment intake confirmation or retire route; no SLA before canonical payment. |
| `/confirmed/success` | **ALIGNED fail-closed** | Payment Link redirect contains no `CHECKOUT_SESSION_ID`, so route presence cannot prove webhook/payment state. Page now says checkout return received and explicitly waits for server-side canonical payment state; no fake workflow phases. | Future enhancement: include a verifiable checkout/session identifier if payment UX needs live confirmation. |
| Stripe Payment Link creation script | **REMEDIATE — payment-infra follow-up** | Historical script still encodes old product set/amounts and Certified products; it is not current offer authority. | Do not rerun as a source of truth. Reconcile separately with `offer-catalog.ts` and live Stripe before any product regeneration. |

## Client delivery

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| `/sla/[clientKey]` API | **ALIGNED at state boundary** | SLA start now derives from the first canonical `payments.created_at` for the client, not project creation. Returns actual payment/project/protocol states and never fabricates delivery. | Payment state machine + `payments` table own start truth. |
| `/sla/[clientKey]` UI | **ALIGNED at reviewed boundary** | Removed elapsed-time pseudo-phases (`>4h`, `>24h`, `>48h`) and `three intervention decisions` promise. Displays only DB-recorded states and a countdown derived from canonical payment time. | Do not reintroduce inferred progress without actual workflow events. |
| `/deliverable/[clientKey]` | **REVIEWED-PARTIAL** | Current client renderer has measured/modeled/pending epistemic labeling, non-fabricating missing states, capability-token access pattern and policy-aware composition. Large legacy branches remain. | Regression-test canonical six-layer Diagnosis semantics before any design refactor. |
| deliverable samples | **REVIEWED-PARTIAL** | Fictional/sample boundary is explicit in public Portfolio. | Preserve sample/prod separation and evidence provenance. |

## Legal surfaces

| Route | Status | Finding | Next action |
|---|---|---|---|
| `/legal/guarantee` | **LEGAL REVIEW + REMEDIATE** | Good outcome boundary (specificity != revenue guarantee), but it promises every diagnostic ships a projected impact range and carries presentation-version language (`Version 5.0`). That is not current public-claim authority. | Separate internal product-truth edits from current legal review. Do not change legal effect by copy cleanup alone. |
| `/legal/terms` | **LEGAL REVIEW + REMEDIATE** | Contains historical `Beta Diagnostic` naming, one-dominant-friction wording, and current/future establishment/governing-law statements. | Verify business/legal facts with qualified review; separately reconcile offer names/scope to catalog after approval. |
| `/legal/privacy` | **LEGAL REVIEW** | Contains GDPR/CCPA-CPRA/PDPA applicability, controller/DPO/representative, transfer, retention and supervisory-authority claims. These are legal assertions, not frontend style. | Verify against current law, actual establishment, processing, providers and consent runtime before edits. |

## Internal operating UI

| Route / module | Status | Finding | Authority / next action |
|---|---|---|---|
| `/admin/layout` | **REMEDIATE — P2** | Global header couples Leads + Net Worth + Pending on every module; client-side email whitelist/session cookie is UX, not security authority; `Engine v2.5` is presentation-version theatre. | Keep server APIs as auth authority. Move module KPIs into modules when touched. |
| `/admin/dashboard` | **REVIEWED-PARTIAL / P2 maintainability** | Very large monolith. No rewrite justified solely for symmetry. | Extract only around real change/performance/regression seams. |
| `/admin/prospecting` | **REVIEWED-PARTIAL** | Must remain evidence/qualification/outreach-draft workflow; no automatic send authority. Market strategy should be configuration, not agent fork. | Opportunity Scout spec + market policy config. |
| `/admin/scaffolds` | **REVIEWED-PARTIAL** | Human review remains important before client publication. | Keep scaffold/provisioning truth guards and approval boundary. |
| `/admin/learning` | **ALIGNED at architecture level / REVIEWED-PARTIAL UI** | Canonical Learning OS and Diagnostic Calibration are the readiness authority; hidden verdict and fail-closed readiness exist in backend/domain contracts. | Pedagogy remains in Learning OS; UI must not derive readiness from course completion. |
| `/admin/finance` + `/admin/finance/jurisdictions` | **ALIGNED at architecture level / BUILD FROZEN** | Finance OS v2.x has deterministic ledger/policy/compliance boundaries and jurisdiction support gates, but commercial Finance build is frozen pending discovery. | Security/production fixes only; no new jurisdiction/product surface without demand evidence. |
| `/admin/priorities` | **REVIEWED-PARTIAL** | Operational task surface; no specific public-truth contradiction established in this audit. | Keep explicit state/error handling; avoid turning priorities into a second source of domain truth. |
| `/admin/certified` | **REMEDIATE — P0 INTERNAL OPEN** | Still presents archived certification as active commercial administration: editable roster, modeled MRR, outbound marketing sequences, live-exam copy and unsupported case/result claims. Connector blocked replacement in this PR. | Make read-only archived/non-gating or remove from nav. Learning OS remains readiness authority. |
| `/admin/login` / auth callback | **REVIEWED-PARTIAL** | Auth plumbing is separate from business authority. | Server-verifiable authorization remains required; client gate is UX only. |

## Shared design/runtime layer

| Surface | Status | Finding | Action |
|---|---|---|---|
| `globals.css` tokens | **FOUNDATION ALIGNED** | Semantic color/font tokens, reduced-motion and focus-visible support exist. Many legacy pages still bypass tokens with literals. | New/refactored code uses tokens; do not churn untouched pages for cosmetic purity. |
| heavy canvas/hex/oscilloscope effects | **MEASURE, DO NOT ASSUME** | Visual identity exists but its conversion/performance value is unproven. | Lighthouse/Web Vitals + funnel metrics before/after. Remove effects only if measured cost exceeds value. |
| public navigation/IA | **IMPROVED, not validated** | Shared landing now gives Method / Free Scan / Pricing hierarchy. | Treat as experiment; validation is funnel behavior, not aesthetic preference. |

## Release blockers for Frontend OS v2.1

1. Root metadata/JSON-LD must stop bypassing claims/offers authority.
2. Pricing visible Diagnostic copy must stop asserting causal certainty/forced one-friction outcome.
3. `/confirmed` must stop duplicating price/offer identity and pre-payment SLA state, or be retired from active routing.
4. `/api/leads/submit` must be reconciled before native homepage intake is reintroduced.
5. `/admin/certified` must be visibly archived/non-gating or removed from normal admin navigation.
6. Legal surfaces need a separate reviewed decision: product-truth cleanup may proceed, but legal/regulatory claims are not accepted as correct merely because they are in the repo.
7. Exact release head must pass Product Integrity, Cloudflare Preview, public acquisition/payment smoke tests, client SLA/deliverable smoke tests and authenticated admin smoke tests.

## Non-blocking follow-up

- Remove Portfolio competitor-wide accusation.
- Reduce admin shell cross-domain KPI coupling.
- Decompose very large pages only where measured change/regression pain justifies it.
- Add deterministic public-truth regression guard after P0 debt is removed, so the allowlist can converge to zero rather than normalize known drift.
- Performance/accessibility baseline before visual polishing.

## Decision

Frontend OS v2.1 is **not complete** while any release blocker above remains. The active Global/APAC acquisition engine and SLA state boundary are now materially closer to V2 truth, but the project should not call the whole frontend `3.0 complete` until commercial, legal and internal-authority drift is closed and verified on the exact release candidate.
