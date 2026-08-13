# Decision Log — Finance Jurisdiction Gate + Frontend OS v2

DATE: 2026-08-13

QUESTION: How should Signal & Friction choose Finance jurisdictions and reconcile the public frontend with the new backend/domain architecture?

EVIDENCE:
- Finance OS v2.1 now supports a role-specific jurisdiction stack rather than one guessed country.
- The existing public frontend still has near-duplicated Global and `/sg` implementations, hard-coded `US|APAC` routing, hard-coded regional MRR bands and unsupported regional capability language.
- Official authorities show materially different rule shapes: Singapore has centralized IRAS digital filing flows; UK company compliance is centralized across HMRC/Companies House; Australia has separable ATO/ASIC recurring obligations; Canada requires federal/provincial scoping; US state/local obligations vary by location and entity; Germany has strong ELSTER digitization but a broader corporate/VAT/trade-tax/e-invoice surface.
- Commercial attractiveness and compliance-rule simplicity are different variables.

OPTIONS:
1. Support every attractive market as a full country Finance ruleset and create separate websites.
2. Choose a few bounded jurisdiction profiles and keep Global/APAC as market surfaces on one product engine.
3. Avoid jurisdiction support entirely and keep Finance as generic education only.

DECISION:
- Choose Option 2.
- Finance support is certified at `jurisdiction profile`, not country level.
- Provisional research order: Singapore -> UK -> Australia -> Canada (province-bounded) -> US (state/entity-bounded) -> Germany later.
- Commercial order remains independent: US/UK/Canada are first-wave Global; Singapore/Australia are first-wave APAC.
- No generic US, Canada or Germany compliance claim is approved.
- No revenue threshold is frozen for the Finance ICP until willingness-to-pay data exists. Target incorporated digital/professional businesses with enough recurring finance/compliance cost to create measurable ROI.
- Frontend architecture becomes `one commercial engine -> Global/APAC market profiles`, not duplicated sites.
- `/sg` immediately stops using its duplicated capability-specific landing and temporarily reuses the canonical Global engine while `MarketLanding` is extracted.
- Add canonical market-profile and public-claim registries. Public regional capabilities must be backed by actual tools/evals.

CONFIDENCE:
- 0.95 on bounded-profile jurisdiction support.
- 0.90 on separating commercial market from Finance jurisdiction support.
- 0.88 on Singapore/UK being the strongest first jurisdiction research candidates.
- 0.95 on eliminating Global/APAC business-logic duplication.

COST:
- Low near-term: architecture/config + copy/integrity migration.
- Main future cost: official-source maintenance, expert adjudication and regression cases per active jurisdiction profile.

REVERSIBLE?:
- Jurisdiction research order: yes.
- Market grouping: yes.
- Bounded-profile support gate: intentionally difficult to reverse because it is a safety/quality invariant.

REVISIT CONDITION:
1. Paid Finance discovery shows a different entity/jurisdiction ICP with materially better economics.
2. A candidate jurisdiction cannot achieve low enough ambiguity after profile bounding.
3. Official API/digital-filing access changes materially.
4. Global/APAC conversion data demonstrates a dedicated market route/domain earns its maintenance cost.
5. Legal/professional review changes the permitted product perimeter.

STATUS: FROZEN v0.1 — evidence-reversible on market ranking; strict on support integrity.
