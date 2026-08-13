# Decision Log — Global Markets + Finance OS v2.1

DATE: 2026-08-13

QUESTION: How should Signal and Friction, the future AI workflow/agent business, and Finance OS expand internationally without creating country forks, unsupported regulatory claims, or premature localization work?

EVIDENCE:
- Finance OS v2 is already an evidence-bound control plane: deterministic ledger, verified compliance-source records, versioned Treasury Policy, Investment Policy Statement, traced agent runs, and human approval for consequential recommendations.
- Production currently has no jurisdiction asserted for the Signal & Friction finance profile and no compliance source loaded. This is intentionally an honest unknown state.
- Eurostat 2025 enterprise data: AI usage was highest in Denmark (42.0%), Finland (37.8%), and Sweden (35.0%); EU paid-cloud uptake reached 52.7%, with Finland at 79.2%.
- U.S. Census 2026 BTOS analysis: overall U.S. business AI use was roughly 17–20%; use is materially higher in larger and knowledge-intensive firms.
- Statistics Canada Q2 2026: 19.2% of businesses used AI; information/cultural industries, finance/insurance, and professional/scientific/technical services had substantially higher adoption.
- Singapore IMDA 2025: 95.1% of SMEs adopted at least one digital area; AI adoption reached 14.5% of SMEs and 62.5% of non-SMEs.
- UK official 2026 business data shows high AI usage in information/communication and other knowledge-intensive sectors and meaningful but still incomplete integration with business systems.
- Australian Bureau of Statistics 2024–25: AI usage is concentrated in information/media/telecom and professional/financial services rather than the whole economy.
- Startup Genome GSER 2026 keeps Silicon Valley, New York and London as the top three global startup ecosystems; Toronto-Waterloo rose to #13; Stockholm and Amsterdam-Delta tied at #23. The report also shows strong Asian ecosystems including Singapore and Tokyo, while several Chinese ecosystems remain globally significant.
- EF EPI 2025 is only a voluntary-test proxy, not a population census, but it indicates very high English proficiency in the Netherlands/Germany/Nordics and substantially lower English proficiency in Japan. Treat this only as a localization-friction signal.
- SEC guidance treats automated personalized investment advisory services as investment-adviser activity; MiFID II suitability requirements apply when providing investment advice/portfolio management. A Finance product must therefore keep an explicit boundary between operating/compliance support and personalized securities advice unless the relevant licensed/regulatory model exists.

OPTIONS:
1. Build a separate full website and a full Finance rule engine for every attractive country.
2. Keep one generic English website and one single-country Finance implementation.
3. Build one canonical product/codebase with market-specific commercial surfaces, while Finance uses a global deterministic core plus evidence-versioned jurisdiction packs.

DECISION:
- Choose Option 3.

## A. Finance OS jurisdiction architecture
- Canonical architecture: `global finance core -> profile -> jurisdiction stack -> jurisdiction pack -> verified source -> obligation/policy -> reviewable agent recommendation`.
- One profile may simultaneously carry different time-bounded jurisdiction roles: business registration, tax-residency review, VAT/GST, payroll/social system, personal residence, banking, work authorization, and permanent-establishment review.
- `finance_profiles.jurisdiction_code` is compatibility metadata only; it is not tax-residency truth.
- A user may self-report/mark unknown jurisdiction facts. `authority_verified` and `professional_verified` statuses require evidence and cannot be self-assigned from the browser.
- No country pack is considered supported because a prompt knows general tax facts. A pack is supported only after official-source research, scope definition, dated verification, regression tests, and a review cadence.
- Do not encode every country now. The first pack backlog is chosen by real internal need + paid-market evidence.
- Finance OS remains bookkeeping/compliance orchestration + treasury policy + education/scenarios. Personalized securities recommendations/trading are not approved product scope without a separate regulatory/licensing decision.

## B. Commercial market priority — Signal and Friction
FIRST-WAVE ENGLISH TESTS:
1. United States — deepest buyer/startup density and strongest high-growth ecosystem concentration.
2. United Kingdom — London is a top-three startup ecosystem; English-first and strong knowledge-service/AI adoption.
3. Canada — Toronto-Waterloo is a top-tier ecosystem; AI use is rising quickly in professional/finance/information sectors.
4. Singapore — small but exceptionally digital, internationally oriented, and strong as an APAC gateway.
5. Australia — English-first, affluent, with material technology/professional-services adoption.

SECOND-WAVE TESTS, NOT FULL LOCALIZATIONS YET:
- Netherlands.
- Denmark, Sweden, Finland.
- Germany.
- Ireland.
These markets have strong digital/AI signals and/or low English friction, but smaller addressable pools or localization considerations mean they should earn additional build effort through outreach evidence.

LOCALIZED EXPERIMENT ONLY AFTER DISCOVERY:
- Japan. Attractive economic/startup market, but language/trust/localization friction is high enough that an English clone is not a serious go-to-market strategy. Require Japanese-language discovery evidence before a dedicated site.

HOLD / DEDICATED RESEARCH BEFORE ENTRY:
- Mainland China. It is economically significant, but the expected localization, operating-stack, regulatory and go-to-market complexity warrants a separate market-entry thesis rather than treating it as another locale.

## C. Commercial market priority — AI workflow / agent business
STATUS: PROVISIONAL because the exact first paid workflow/ICP must still win through discovery.

FIRST-WAVE PROVISIONAL TESTS:
- United States.
- United Kingdom.
- Singapore.
- Canada.
- Australia.

SECOND-WAVE PROVISIONAL TESTS:
- Nordics (especially Denmark/Finland/Sweden because of enterprise AI adoption).
- Netherlands.
- Germany.

Japan remains a later localized/partner-led test unless the selected workflow has unusually strong Japanese demand and low integration friction.

## D. Website architecture
- Do NOT create independent code/content forks per market.
- One canonical repository, design system, offer catalog, analytics model, proof/evidence authority, and deployment pipeline.
- Represent markets as data/config + routes/locales, e.g. `/us`, `/uk`, `/ca`, `/sg`, `/au`, and later localized routes only when justified.
- Market surfaces may vary: headline/problem language, proof, currency display, relevant legal notices, timezone/support expectations, case ordering, and language.
- Core offer definitions, pricing authority, claims, instrumentation, forms, and backend workflows must remain canonical.
- A separate domain/site is allowed only when evidence shows a material SEO, regulatory, brand, distribution, or localization advantage. Cloudflare's ability to host more sites is an infrastructure capability, not commercial evidence that more sites should exist.

## E. Market-entry gate
Before a market earns a dedicated localized surface or jurisdiction pack, collect evidence from a bounded experiment:
- target-account density and ICP fit;
- outreach deliverability/reply/positive-reply rates;
- qualified conversations;
- paid pilot rate and ticket;
- sales-cycle time;
- delivery/integration friction;
- language/localization burden;
- regulatory/compliance burden;
- measured client outcome and willingness to repeat/refer.

Payment + outcome outrank interest. A translated website without paid traction does not validate a market.

CONFIDENCE:
- High (0.90) on global-core + jurisdiction-pack architecture.
- High (0.90) on avoiding separate website code forks.
- Medium-high (0.78) on Signal and Friction first-wave market ordering.
- Medium (0.62) on the AI workflow/agent business ordering until its winning workflow/ICP is frozen.

COST:
- Low immediate implementation cost: schema/API/UI abstraction now; actual jurisdiction packs and localization only when evidence demands them.
- Ongoing cost is dominated by regulatory-source maintenance and localization QA, not hosting.

REVERSIBLE?:
- Market ordering: yes.
- Website route/domain presentation: yes.
- Finance jurisdiction abstractions: yes at the pack level; the global-core separation is intended as the long-lived boundary.

REVISIT CONDITION:
1. A market produces paid pilots at materially higher/lower rates than the current tier suggests.
2. A winning AI workflow/ICP changes the buyer geography.
3. Localization materially improves conversion after a controlled test.
4. A customer requires a Finance jurisdiction not in the current backlog and the economics justify maintaining it.
5. Legal advice confirms a different regulatory perimeter for Finance education/advisory features.
6. Country-specific operational constraints make a shared commercial surface materially inferior to a dedicated deployment.

STATUS: FROZEN v0.1 for architecture; market ranks remain evidence-reversible.
