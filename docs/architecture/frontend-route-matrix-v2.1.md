# Signal & Friction — Frontend Route Alignment Matrix v2.1

**Date:** 2026-08-13  
**Constitution:** Signal & Friction V2 remains canonical.  
**Program:** Frontend OS v2.1 — implementation reconciliation, not a V3 constitution.

## Status vocabulary

- **ALIGNED** — active runtime behavior/copy matches the relevant V2 authority at the reviewed boundary.
- **REMEDIATE** — deterministic drift exists and can be corrected without new domain architecture.
- **GROUND-TRUTH DEPENDENCY** — UI cannot be made truthful by copy alone; an authoritative backend/state contract is required.
- **LEGAL REVIEW** — the route contains legal/regulatory assertions that must be verified against current law and actual business facts before substantive edits.
- **ARCHIVED** — intentionally non-commercial/non-gating historical surface.
- **REVIEWED-PARTIAL** — no release-blocking contradiction established in the reviewed sections, but the full large component was not rewritten line-by-line.

A legacy file may remain in Git while the active route is **ALIGNED** when a route/layout/template bridge deterministically prevents that legacy implementation from rendering. Such dead code remains cleanup debt, not runtime authority.

## Public acquisition and commercial routes

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| `/` | **ALIGNED for public truth; conversion path provisional** | V1 monolith was removed from active runtime and replaced with one typed market landing. Generic 8–20% lift, `v4.5`, causal `killing revenue` copy and pathname market branching are gone. | `market-profiles.ts`, `public-claims.ts`. Primary lead path is the Technical Signal Scan until native intake has a reconciled backend contract. |
| `/sg` | **ALIGNED for public truth** | Same landing engine as Global with APAC config. No Singapore implementation fork and no JCB/PayNow/PDPA capability theatre. | `market-profiles.ts`; market route != jurisdiction capability. |
| Global OpenGraph image | **ALIGNED** | Removed `One friction. One fix.` framing; social card now emphasizes evidence/uncertainty/72h. | `public-claims.ts`. |
| Root metadata / structured data | **ALIGNED conservatively** | Root metadata derives from `PUBLIC_SITE_COPY`. Historical JSON-LD/FAQ/hard-coded price markup was removed instead of preserving a second marketing database. | Reintroduce structured data only through a derived builder after catalog/claim semantics pass the same truth gate as visible UI. |
| `/pricing` active runtime | **ALIGNED at public-claim boundary** | `PricingV21` is rendered by the route layout. Prices derive from `offer-catalog.ts`; checkout URLs come from `stripe_payment_links`; Diagnostic copy uses evidence-ranking + abstention rather than legacy causal/one-friction claims. | Exact-head checkout smoke test still required. Legacy 35KB page remains in tree but is not rendered. |
| `/pricing` metadata | **ALIGNED** | No hard-coded prices or `One friction. One decision.` metadata; description derives from evidence/abstention claims. | `public-claims.ts`. |
| `/scan` | **ALIGNED at product-truth boundary; visual QA open** | Rebuilt as generic B2B Technical Signal Scan. Displays observable performance/page signals only; does not show mechanism labels, friction score or revenue-causality claims. Optional email stores observable context for human review. | `/api/leads` remains intake-only. Verify public input styling/visual quality on preview. |
| `/scan` metadata | **ALIGNED** | No Shopify/checkout/revenue-leak SEO copy; canonical is `signal-and-friction.com/scan`. | Preserve observation != diagnosis in future metadata changes. |
| `/portfolio` | **REMEDIATE — P1** | Fictional samples and evidence counts are clearly disclosed. `Everyone else... Most of them are made up` is an unprovable category-wide accusation. | Keep method/evidence contrast; remove the competitor-wide assertion. |
| `/certified` | **ARCHIVED / ALIGNED** | Public route is noindex and rejects new enrollments/payments. | `CERTIFIED_TIER` remains archived in `offer-catalog.ts`. |

## Intake, payment and confirmation

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| Native homepage intake | **REMOVED from active homepage** | Historical wizard mixed market routing, legacy segment labels, causal copy and generic modeled lift. | Reintroduce only after end-to-end market/offer contract reconciliation. Current acquisition path is `/scan`. |
| `/api/leads` | **ALIGNED for Technical Scan intake** | Records observable lead context only and explicitly does not invoke or persist a behavioral diagnosis. | Keep narrow; no diagnosis side effects. |
| `/api/leads/submit` | **LEGACY / GROUND-TRUTH DEPENDENCY** | Still accepts legacy `region: US|APAC`, maps `microdosing/high_ticket`, and duplicates old commercial identity/price logic. It is no longer called by the active homepage. | Reconcile before any native homepage intake is restored. Do not treat it as current market/offer authority. |
| `/confirmed` active runtime | **ALIGNED fail-closed via template bridge** | `confirmed/template.tsx` intercepts the legacy pre-payment page. It states intake != payment/diagnosis, exposes no price IDs, and starts no 72h clock. Legacy page remains in tree but does not render at `/confirmed`. | Remove legacy page after regression/smoke coverage proves bridge unnecessary. |
| `/confirmed/success` | **ALIGNED progressive verification** | Optional `session_id` is checked read-only against Stripe; canonical `payments` presence is checked separately. Without verifiable evidence the page fails closed. | Current live Payment Link redirect may not yet include `{CHECKOUT_SESSION_ID}`; page remains safe when absent. |
| `/api/stripe/session-status` | **ALIGNED at payment-verification boundary** | GET-only Checkout Session retrieval plus canonical Supabase payment check. Integrity guard fails if write methods are introduced. | Preserve least privilege/read-only semantics. |
| historical Payment Link creation script | **REMEDIATE — infra/tooling debt** | Script contains old product set/amounts/Certified and old redirect construction; it is not current offer authority. | Do not rerun blindly. Replace/retire only after live Stripe reconciliation. |

## Client delivery

| Route / surface | Status | Finding | Authority / next action |
|---|---|---|---|
| `/sla/[clientKey]` API | **ALIGNED at state boundary** | SLA starts from first canonical `payments.created_at`, not project creation. Returns actual payment/project/protocol states and never fabricates delivery. | Payment state machine + payments table own commercial start truth. |
| `/sla/[clientKey]` UI | **ALIGNED at reviewed boundary** | Removed elapsed-time pseudo-phases and unsupported deliverable-count promises. Displays recorded DB states and countdown from canonical payment time only. | Do not reintroduce inferred progress without workflow events. |
| `/deliverable/[clientKey]` | **REVIEWED-PARTIAL** | Renderer has measured/modeled/pending epistemic labels, non-fabricating missing states, capability-token access and policy-aware composition. Large legacy branches remain. | Regression-test canonical six-layer Diagnosis semantics before design refactor. |
| deliverable samples | **REVIEWED-PARTIAL** | Public Portfolio explicitly distinguishes fictional samples from real client outcomes. | Preserve sample/prod separation and evidence provenance. |

## Legal surfaces

| Route | Status | Finding | Next action |
|---|---|---|---|
| `/legal/guarantee` | **LEGAL REVIEW + PRODUCT-TRUTH CLEANUP** | Good specificity != revenue boundary, but promises every Diagnostic ships a projected impact range and carries `Version 5.0` presentation language. | Verify legal effect separately; reconcile product statements only with reviewed wording. |
| `/legal/terms` | **LEGAL REVIEW + PRODUCT-TRUTH CLEANUP** | Historical `Beta Diagnostic`, one-dominant-friction wording, and current/future establishment/governing-law claims remain. | Verify business/legal facts and current law before substantive edits. |
| `/legal/privacy` | **LEGAL REVIEW** | Contains GDPR/CCPA-CPRA/PDPA applicability, controller/DPO/representative, transfer, retention and supervisory-authority claims. | Verify against current law, actual establishment, processing, providers and consent runtime. Do not certify from repository text alone. |

## Internal operating UI

| Route / module | Status | Finding | Authority / next action |
|---|---|---|---|
| `/admin/layout` | **REMEDIATE — P2** | Global header couples Leads + Net Worth + Pending across modules; client email whitelist/session cookie is UX rather than security authority; `Engine v2.5` is presentation-version theatre. | Keep server APIs as auth authority; simplify when touching shell. |
| `/admin/dashboard` | **REVIEWED-PARTIAL / P2 maintainability** | Very large monolith. No rewrite justified solely for symmetry. | Extract only around real change/performance/regression seams. |
| `/admin/prospecting` | **REVIEWED-PARTIAL** | Must remain evidence/qualification/outreach-draft workflow; no automatic send authority. Market strategy belongs in config, not agent forks. | Opportunity Scout spec + market policy config. |
| `/admin/scaffolds` | **REVIEWED-PARTIAL** | Human review remains important before client publication. | Keep scaffold/provisioning truth guards and approval boundary. |
| `/admin/learning` | **ALIGNED at architecture level / REVIEWED-PARTIAL UI** | Learning OS + Diagnostic Calibration are readiness authority; hidden verdict/fail-closed readiness live in domain/backend contracts. | UI must never substitute completion for readiness evidence. |
| `/admin/finance` + jurisdictions | **ALIGNED at architecture level / BUILD FROZEN** | Finance deterministic boundaries exist, but commercial Finance build remains frozen pending discovery. | Security/production fixes only; no feature expansion without evidence. |
| `/admin/priorities` | **REVIEWED-PARTIAL** | No specific product-truth contradiction established in this audit. | Keep explicit state/error handling. |
| `/admin/certified` active runtime | **ARCHIVED / ALIGNED via template bridge** | Route template fail-closes the historical admin page and renders only `Archived · non-gating`, stating Learning OS / Diagnostic Calibration own readiness. The active roster/marketing monolith remains in Git but does not render. | Later remove dead legacy page/nav label after regression; do not reactivate without product/eval decision. |
| `/admin/login` / auth callback | **REVIEWED-PARTIAL** | Auth plumbing is separate from business authority. | Server-verifiable authorization remains required; client gate is UX only. |

## Shared design/runtime layer

| Surface | Status | Finding | Action |
|---|---|---|---|
| `globals.css` tokens | **FOUNDATION ALIGNED** | Semantic color/font tokens, reduced-motion and focus-visible support exist. Legacy pages still use literals. | New/refactored code uses tokens; avoid cosmetic churn on untouched pages. |
| heavy canvas/hex/oscilloscope effects | **MEASURE, DO NOT ASSUME** | Visual identity exists but conversion/performance value is unproven. | Lighthouse/Web Vitals + funnel metrics before/after. |
| public navigation/IA | **IMPROVED, not validated** | Shared landing exposes Method / Free Scan / Pricing hierarchy. | Treat as funnel experiment, not final truth. |

## Remaining release gates

1. Exact candidate head must pass Product Integrity and Cloudflare Preview after all final bridges/guards.
2. Smoke-test public `/`, `/sg`, `/scan`, `/pricing`, `/confirmed`, `/confirmed/success` on the exact preview candidate.
3. Smoke-test checkout-link resolution without creating a charge; verify unavailable/missing links fail closed.
4. Smoke-test SLA/deliverable access and state boundaries using non-destructive fixtures/demo paths.
5. Authenticated admin smoke: Learning remains readiness authority; Certified route renders archived/non-gating; Finance remains bounded.
6. Make an explicit **LEGAL REVIEW** decision before claiming the legal pages are current/compliant. Product-truth alignment is not legal validation.
7. Native homepage intake remains intentionally disabled until `/api/leads/submit` or its replacement has typed marketSurface/country/offer semantics and no duplicated price truth.

## Non-blocking debt

- Remove Portfolio competitor-wide accusation.
- Fix/verify Technical Scan public input styling and accessibility on preview.
- Remove legacy dead Pricing, Confirmed and Certified implementations after rollback confidence is no longer needed.
- Reconcile `offer-catalog.ts` Diagnostic wording with abstention semantics when the canonical-offer change can pass its governance gate; current public runtime overrides that legacy scope wording for Diagnostic.
- Retire or replace historical Stripe product-creation script after live reconciliation.
- Reduce admin shell cross-domain KPI coupling and remove presentation-version labels when that shell is next touched.
- Add deterministic public-truth regression guard after remaining known debt is removed; converge allowlist to zero rather than normalize drift.
- Performance/accessibility baseline before visual polishing.

## Decision

The active public acquisition, Pricing, payment-return, SLA and archived-Certified runtime surfaces are now materially aligned with V2 product truth. Frontend OS v2.1 is **not yet declared complete** because exact-candidate smoke testing and legal review remain, and native intake intentionally stays disabled until its backend contract is reconciled. A V3 constitution is still not justified by these frontend changes alone.
