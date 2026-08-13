# Decision Log — Finance OS v2

## 2026-08-13 — What is the financial source of truth?
**EVIDENCE:** Existing double-entry tables and deferred balance constraint already exist; the old UI mutated them non-atomically and could delete history.  
**OPTIONS:** (A) replace ledger; (B) keep ledger and harden mutation; (C) let AI infer financial state.  
**DECISION:** B. Existing ledger remains canonical; posting is atomic RPC; corrections are explicit reversals.  
**CONFIDENCE:** High.  
**COST:** Low/moderate migration + UI rewrite.  
**REVERSIBLE?** Architecture yes; accounting history is intentionally append/reversal.  
**REVISIT CONDITION:** Only if real accounting requirements exceed the current ledger model.

## 2026-08-13 — Should Finance Copilot calculate taxes/residency?
**EVIDENCE:** Jurisdiction-specific tax/residency is high-consequence, time-sensitive and often depends on facts not represented in the product. Bessemer's workflow-selection framework explicitly warns against high-risk regulatory workflows where mistakes create compliance risk.  
**OPTIONS:** (A) AI tax adviser; (B) evidence registry + professional review + model explains only stored verified obligations; (C) no compliance layer.  
**DECISION:** B.  
**CONFIDENCE:** High.  
**COST:** Additional evidence/status workflow.  
**REVERSIBLE?** Yes, but expanding authority requires professional/legal design and eval evidence.  
**REVISIT CONDITION:** A specific jurisdiction/service is validated with licensed professional ownership, verified sources, deterministic calculations and liability controls.

## 2026-08-13 — How should surplus cash be allocated?
**EVIDENCE:** Generic percentage rules are not tailored to obligations, liquidity, jurisdiction, risk capacity or business volatility.  
**OPTIONS:** (A) hardcoded internet rule; (B) model decides each month; (C) human-approved, versioned Treasury Policy + deterministic arithmetic.  
**DECISION:** C. Policy totals 100%; reserve target is based on real trailing expense data; model can flag deviations but cannot activate policy.  
**CONFIDENCE:** High.  
**COST:** Small policy state/UI.  
**REVERSIBLE?** Yes; activate a new version.  
**REVISIT CONDITION:** Real cashflow history shows the allocation categories are insufficient.

## 2026-08-13 — What role should real estate / investing have?
**EVIDENCE:** Asset choice depends on horizon, liquidity, concentration, leverage, costs and risk capacity; the product has no current-market research workflow.  
**OPTIONS:** (A) recommend current assets opportunistically; (B) prohibit wealth education; (C) IPS-first education/scenarios, no trading.  
**DECISION:** C. Real estate is one scenario/asset class, not a privileged default.  
**CONFIDENCE:** High on architecture; investment outcomes remain uncertain.  
**COST:** IPS + scenario engine.  
**REVERSIBLE?** Yes.  
**REVISIT CONDITION:** Add a current-evidence investment research workflow with source quality, timestamps, jurisdiction/tax boundaries and evals.

## 2026-08-13 — Is Finance OS a sellable product now?
**EVIDENCE:** It has been designed for one internal operator and has not demonstrated external payment, repeated demand or client ROI.  
**OPTIONS:** (A) productize now; (B) internal dogfood and collect outcome evidence.  
**DECISION:** B.  
**CONFIDENCE:** High.  
**COST:** Opportunity cost of not prematurely launching another product.  
**REVERSIBLE?** Yes.  
**REVISIT CONDITION:** Repeated external requests for the same workflow + paid pilot + measurable outcome + viable professional/compliance operating model.
