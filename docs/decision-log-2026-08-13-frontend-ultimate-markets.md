# Decision Log — Frontend Ultimate Market Architecture

**DATE:** 2026-08-13  
**QUESTION:** How should Signal & Friction serve Global, US, Canada, UK, Singapore and Australia without fragmenting product truth or creating localisation theatre?

## EVIDENCE

### Internal
- `docs/architecture/frontend-os-v2-audit.md`: one commercial engine, multiple market surfaces; market != jurisdiction; canonical offer authority; evidence-governed claims; scan != diagnosis; no hard-coded FX; instrumentation first-class.
- `src/lib/offer-catalog.ts`: canonical public offer authority.
- `src/lib/public-claims.ts`: approved delivery/method/guarantee claims and explicit forbidden claims for generic fixed lift, unsupported revenue causality and unimplemented APAC compliance capability.

### External primary guidance reviewed
- Google Search Central: distinct URLs for regional variants, reciprocal `hreflang`, `x-default`, and user-accessible links between versions; avoid automatic locale redirects that can hide variants from users/crawlers.
- Next.js App Router: locale-aware routing and metadata-file conventions support regional projections and localized sitemaps.
- Stripe: Payment Links use Adaptive Pricing for supported local-currency presentment, so local display does not require a second hard-coded price authority.

### Strategic research reviewed
- McKinsey State of AI 2025: higher-performing organizations are more likely to redesign workflows than limit AI to incremental efficiency.
- Bessemer Building Vertical AI 2026: start from specific workflow/customer requirements and measurable value; avoid easily commoditized applications.
- Anthropic Building Effective Agents / Context Engineering: prefer simple, composable, high-signal systems; add complexity only when it improves outcomes.

## OPTIONS

1. **Single global page + automatic IP redirect:** low build cost; weak user control and regional crawlability; conflates inference with intent.
2. **Copied country sites:** maximum local freedom; maximum drift across claims, offers, pricing, analytics and customer journey.
3. **One canonical engine + country projections:** shared product truth with market-specific route, copy, metadata, selector state, buying context and attribution.

## DECISION

Choose **Option 3**.

```text
Canonical product truth
  ├─ offer-catalog.ts
  ├─ public-claims.ts
  └─ diagnostic/delivery contracts
          ↓
Market engine
  ├─ MarketLanding
  ├─ MarketPricing
  ├─ MarketSelector
  └─ market-profiles.ts
          ↓
Country projections
  ├─ /us
  ├─ /ca
  ├─ /uk
  ├─ /sg
  └─ /au
```

### Invariants
1. No copied market business logic.
2. No automatic country redirect; user choice remains explicit.
3. `/` is Global and `x-default`.
4. Market copy may change commercial context and positioning; it may not invent compliance, payment, tax or regulatory capability.
5. Canonical offers remain USD-authoritative. Local-currency presentment belongs to Stripe Adaptive Pricing unless a separately approved pricing policy exists.
6. Scan/intake gathers evidence; it never claims to be the diagnosis.
7. Confirmation/payment UI shows verified states only. No decorative fake progress.
8. Lead intake persists `market_surface`, `country_code`, `company_stage`, `acquisition_source` and legacy region so paid rate, ticket and ROI can later be measured by market.

## CONFIDENCE

- **Architecture:** 0.91 / High.
- **Country-specific winning copy:** 0.68 / Medium until customer conversations and paid traffic provide evidence.

## COST

Moderate initial implementation; low marginal cost per new market because product/offer/claim logic remains shared.

## REVERSIBLE?

Yes. Market routes are projections over one engine and can be added, removed or consolidated without re-platforming product logic.

## REVISIT CONDITION

Revisit a country surface when:
- at least 20 qualified visits provide enough funnel evidence to see a meaningful conversion difference;
- at least 5 qualified conversations reveal country-specific buying objections not handled by current copy;
- paid volume supports local proof/case material;
- a jurisdiction-specific tax/privacy/payment capability is actually implemented and evaluated;
- local-currency pricing, not just presentment, has a measured reason to become canonical.

## IMPLEMENTATION STATUS

Implemented on `frontend-ultimate-markets-v1`:
- market selector + Global/US/Canada/UK/Singapore/Australia projections;
- shared landing and pricing engines;
- structured market attribution in lead intake;
- Singapore/Australia-specific commercial context without capability theatre;
- canonical offer/claim reuse;
- localized sitemap and hreflang cluster;
- truthful confirmation and payment-success surfaces.

**Release gate:** Product Integrity CI → merge → production deployment → browser smoke test. Branch code is never called live before those checks pass.
