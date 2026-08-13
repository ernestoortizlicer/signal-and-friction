# Frontend OS v2.1 — Route Release Matrix

**Date:** 2026-08-13  
**Authority:** Signal & Friction V2  
**Purpose:** release-oriented truth matrix, not a visual-design wishlist.

Status meanings:
- **PASS** — no known material truth/authority contradiction in the audited surface.
- **RESOLVED IN BRANCH** — material drift was found and a branch fix exists; still requires exact-head CI/preview/smoke.
- **DRIFT** — incorrect or duplicated copy/config exists but does not itself manufacture a consequential state.
- **BLOCKER** — can falsely assert payment, workflow, commercial, legal, or authorization truth.
- **UNKNOWN** — cannot be certified without current external/operator evidence.

| Surface | Status | Finding / release condition |
|---|---|---|
| `/` | RESOLVED IN BRANCH | V1 33KB landing, generic lift calculator and causal “single friction” copy replaced by `MarketLandingV21` using `market-profiles.ts` + `public-claims.ts`. New flow currently routes to Free Scan/Pricing rather than preserving the old embedded intake; conversion impact must be measured, not assumed. |
| `/sg` | RESOLVED IN BRANCH | Uses the same `MarketLandingV21` with `marketId="apac"`; duplicated Singapore implementation removed. No JCB/PayNow/PDPA capability theatre. |
| `/scan` | RESOLVED IN BRANCH | Branch removes friction score/mechanism pseudo-diagnosis and keeps observable technical B2B signals. Must preserve “observation != diagnosis” in page + metadata. |
| `/pricing` | DRIFT | Prices/scope mostly derive from offer catalog, but Diagnostic outcome/metadata still contain “one friction” / causal-certainty language. |
| `/portfolio` | DRIFT | Fictional/evidence-count labels are sound. Remove unsupported market-wide accusation that competitors’ logos/percentages are “mostly made up.” |
| root metadata / JSON-LD | DRIFT | `public-metadata.ts` exists as derived authority; root integration still incomplete. Stale duplicate claims/prices must not remain a second commercial database. |
| OpenGraph image | RESOLVED IN BRANCH | Social card now uses evidence/uncertainty/abstention language instead of “One friction. One fix.” |
| `/confirmed` | BLOCKER | Legacy `microdosing/high_ticket`, hard-coded Diagnostic amounts/Stripe price IDs, and presentation timer/state need replacement with canonical offer/payment/workflow state. |
| `/confirmed/success` | RESOLVED IN BRANCH | Browser redirect no longer proves payment. Branch adds Checkout Session verification plus canonical `payments.stripe_session_id` check. Requires Payment Links to pass `{CHECKOUT_SESSION_ID}` before release. |
| Stripe Payment Links | BLOCKER UNTIL LIVE CUT | Production links currently redirect with `?product=...` only. Must add `session_id={CHECKOUT_SESSION_ID}` to relevant live redirects after verifier passes exact-head checks. Webhook remains fulfillment/payment-state authority. |
| `/sla/[clientKey]` | RESOLVED IN BRANCH | Branch stops manufacturing phases from elapsed hours. SLA clock starts from first canonical payment; UI displays recorded `protocolStage/projectStatus/paymentStatus`; published deliverable is terminal truth. Requires production schema/API smoke. |
| `/deliverable/[clientKey]` | PASS WITH REGRESSION GATE | Evidence tiers, unknown/pending handling and delivery-policy composition are materially aligned. Legacy fallback branches should remain covered during commercial cleanup. |
| `/legal/terms` | BLOCKER | Terms still describe DFY as “diagnose and implement” and a Diagnostic as identifying “the one dominant friction point,” while current catalog separates Diagnostic from Intervention and public authority permits abstention. Requires explicit commercial/legal policy reconciliation before copy edit. |
| `/legal/guarantee` | BLOCKER | Specificity guarantee and “projected impact range” language needs reconciliation with abstention and current delivery contract. Do not silently redefine the legal promise in UI code. |
| `/legal/privacy` | UNKNOWN | Contains time-sensitive establishment/registration and processor-location claims. Requires current operator/legal/vendor evidence; frontend code cannot infer them. |
| `/certified` | PASS | Archived/noindex/non-enrolling public state matches archived commercial tier. |
| `/admin/login` | P2 SECURITY UX | Cosmetic “encrypted session” copy is not authority. Real security depends on Supabase/server API boundaries. |
| `/auth/callback` | P2 SECURITY ARCH | Client-side OAuth/session handling exists; migrate only as a dedicated auth/session hardening cut. |
| `/admin/*` shell | P1/P2 | Client email allowlist is UX only; JS-written access-token cookie is not HttpOnly; shell fetches Finance/Leads/Priorities everywhere. Server APIs must remain authority. Move module KPIs local and harden session boundary separately. |
| `/admin/dashboard` | P2 | Large monolith. Refactor only along actual change/performance/regression seams; no aesthetic rewrite mandate. |
| `/admin/prospecting` | PASS WITH DOMAIN GATES | Must keep Scan/evidence/contact confidence distinct from diagnosis and market policy configurable. |
| `/admin/learning` | PASS WITH E2E GATE | Canonical Learning OS/Calibration authority preserved. Visual Coach v0.1 remains separate PR pending authenticated runtime smoke. |
| `/admin/finance` | PASS WITH AUTHORITY GATES | Finance OS v2.x is backend-authoritative; jurisdiction/compliance/investment boundaries must remain visible. No new finance product expansion from frontend work. |
| `/admin/certified` | P2 | Must remain visibly historical/non-gating while commercial Certified tier is archived. |

## Release blockers for Frontend OS v2.1

The branch is not releasable as “aligned” until all of the following are true:

1. `/confirmed` derives offer/payment truth rather than legacy segment magic numbers.
2. Live Stripe Payment Links pass `{CHECKOUT_SESSION_ID}` and `/confirmed/success` verifies it.
3. Terms + Guarantee are reconciled with current Diagnostic/Intervention separation and abstention policy.
4. Root/pricing/scan metadata no longer publish contradictory claims or duplicate active prices.
5. Exact branch head passes Product Integrity + Cloudflare Preview.
6. Smoke tests cover Global/APAC landing, Free Scan, Pricing → Checkout return, canonical payment recording, SLA, and one authenticated Admin route.

## Deliberately not release blockers

- redesigning every admin module;
- replacing every literal Tailwind color with a token;
- adding more animation/3D effects;
- building a new design-system platform;
- country-specific website forks;
- preserving the old homepage calculator or embedded intake without evidence that either improves paid conversion.

Those items only earn engineering time when they improve measured conversion, reliability, accessibility/performance, or operator throughput.
