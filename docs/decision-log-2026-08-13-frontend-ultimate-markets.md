# Decision Log — Frontend Ultimate Market Architecture

**DATE:** 2026-08-13  
**QUESTION:** How should Signal & Friction serve Global, US, Canada, UK, Singapore and Australia without fragmenting product truth or creating localisation theatre?

## EVIDENCE

### Internal product truth
- `docs/architecture/frontend-os-v2-audit.md` requires one commercial engine, multiple market surfaces, evidence-governed claims, scan != diagnosis, no hard-coded FX, and instrumentation as a first-class concern.
- `src/lib/offer-catalog.ts` is the canonical public offer authority.
- `src/lib/public-claims.ts` is the canonical public-claims boundary and explicitly forbids generic fixed-lift claims, unsupported revenue causality and unimplemented APAC compliance capabilities.

### External primary guidance reviewed
- Google Search Central recommends distinct URLs for regional/language variants, reciprocal `hreflang` annotations, `x-default` for fallback/selector surfaces, and user-accessible links between variants. Google cautions against automatic locale redirects that can prevent users and crawlers from seeing all versions.
- Next.js App Router guidance treats locale as language plus optional region and supports locale-aware routing/rendering.
- Stripe documents Adaptive Pricing for Payment Links as the mechanism for supported local-currency presentment, avoiding a second hard-coded FX/pricing authority.

### Strategic research reviewed
- McKinsey State of AI 2025: higher-performing organizations are more likely to redesign workflows rather than limit AI to incremental efficiency.
- Bessemer Building Vertical AI 2026: defensibility starts with specific workflow/customer requirements and measurable value rather than a technology thesis.
- Anthropic Building Effective Agents / Context Engineering: prefer simple, composable, high-signal systems and add complexity only when it improves outcomes.

## OPTIONS

1. **Single global page with IP-based automatic redirects.**
   - Low implementation cost.
   - Weak user control, weaker crawlability, and high risk of conflating market inference with customer intent.

2. **Independent country sites / copied page implementations.**
   - Maximum local freedom.
   - High drift risk across claims, offers, pricing, analytics and customer journey.

3. **One canonical engine + explicit country market projections.**
   - Shared product/offer/claim logic.
   - Market-specific positioning, route, metadata, selector state and buying context.
   - Country routes remain commercial projections, not claims of legal/tax/payment capability.

## DECISION

Choose **Option 3**.

Architecture:

```text
Canonical product truth
  ├─ offer-catalog.ts
  ├─ public-claims.ts
  └─ diagnostic / delivery contracts
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

Rules:
1. No copied market business logic.
2. No automatic country redirect; user choice remains available and explicit.
3. `/` is the `x-default` / Global surface.
4. Market copy may change commercial context, examples, expectations and positioning; it may not invent compliance, payment or regulatory capability.
5. Canonical offers remain authoritative in USD. Local-currency presentment belongs to Stripe Adaptive Pricing unless a separate approved multi-currency pricing policy is created.
6. Scan/intake gathers evidence; it never claims to be the diagnosis.
7. Payment/confirmation pages may show only verified states. No decorative fake progress such as “analysis live” unless backed by real workflow state.
8. Market/country attribution must ultimately be preserved in operational data so conversion, paid rate, ticket and ROI can be measured by market.

## CONFIDENCE

**High (0.91)** on architecture.  
**Medium (0.68)** on the exact winning copy per country until paid traffic and customer conversations provide evidence.

## COST

Moderate implementation cost; low long-term maintenance cost because product logic remains shared.

## REVERSIBLE?

Yes. Country profiles/routes are projections over one engine. Markets can be added, removed or consolidated without re-platforming product logic.

## REVISIT CONDITION

Revisit a country surface when any of the following is true:
- at least 20 qualified visits produce enough funnel evidence to identify a meaningful conversion difference;
- at least 5 qualified conversations reveal country-specific buying objections not handled by current copy;
- paid engagement volume supports local proof/case material;
- a jurisdiction-specific tax, privacy or payment workflow is actually implemented and evaluated;
- local-currency pricing (not just presentment) has a measured commercial reason to become canonical.

## CURRENT KNOWN GAP

The frontend now submits market/country context, but the legacy lead endpoint historically persisted only the coarse `US | APAC` region. Structured `market_surface`, `country_code`, `company_stage` and `acquisition_source` persistence remains a release gate for full market analytics. Do not claim market-level attribution is complete until that contract is live and verified.
