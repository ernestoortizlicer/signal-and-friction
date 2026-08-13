# Signal and Friction — Finance OS v2 Production Runbook

**Status:** CANONICAL RUNBOOK v1.1  
**Date:** 2026-08-13  
**Scope:** Internal business/personal finance control plane and Finance Copilot.

## 1. Product contract

Finance OS is six bounded systems, in this order:

`Ledger → Compliance Evidence → Treasury Policy → Investment Policy Statement → Scenario/Education → Finance Copilot`

The model is deliberately last. It may synthesize and teach; it is never the source of accounting truth, jurisdiction law, tax liability, policy activation or investment execution.

## 2. Ledger authority

Canonical tables: `accounts`, `transactions`, `transaction_entries`.

Rules:
- double entry must balance;
- a post is atomic through `post_finance_transaction`;
- corrections are explicit reversals through `void_finance_transaction`;
- posted history is not deleted or silently edited;
- external-source/id pairs make imports idempotent;
- cross-profile entries require a future explicit interprofile workflow;
- browser-authenticated users cannot directly insert/update/delete transaction headers or entries;
- privileged Finance RPCs are `service_role` only and receive the verified human actor explicitly from the admin-gated Cloudflare API.

### Currency contract

Finance OS v2 is intentionally **single-currency per finance profile**.

Every account assigned to a profile must use that profile's `base_currency`. The database prevents both:
- assigning/changing an account to a mismatching currency; and
- changing a profile's base currency while its accounts remain in another currency.

A journal entry cannot cross currencies. If the business later needs real USD/EUR or other multi-currency accounting, build an explicit FX workflow with rate source, rate timestamp, source/destination amounts and accounting treatment. Do not aggregate nominal cents from different currencies or invent an FX rate.

Different companies/personal scopes may use separate finance profiles with different base currencies.

Dashboard metrics are deterministic within the profile currency:
- liquid cash = asset accounts classified `cash|cash_equivalent`;
- 30/90-day revenue and expense = ledger entries in those windows;
- normalized monthly burn = trailing-90-day expenses / 3;
- runway = liquid cash / normalized monthly burn.

## 3. Compliance evidence authority

`finance_profiles` stores working jurisdiction context as `self_reported | professional_verified | unknown`. It does not itself determine tax residency.

`finance_compliance_sources` records authority/topic/URL/version dates and has explicit `recorded | verified | revoked` state. A stored URL is not authoritative until human-reviewed/verified.

`finance_obligations` stores represented obligations and may point to a verified source/evidence reference. Missing/unverified source means `needs_review`, not a guessed conclusion.

Jurisdiction-specific tax/legal interpretation remains professional-review territory unless a specific deterministic, professionally owned workflow is later built and evaluated.

## 4. Treasury Policy authority

`finance_cash_policies` is human-approved and versioned. Only one active policy per profile.

Allocation categories:
- owner pay / living;
- tax/compliance reserve;
- operating reserve;
- long-term investing;
- opportunity fund.

Percentages must total 100%. The system has no universal 30/70, 50/30/20 or “millionaire” default.

A tax-reserve percentage may be marked verified only with an evidence reference. This verifies a policy input, not a computed tax liability.

The deterministic treasury waterfall is:
1. calculate liquidity reserve target from actual normalized burn × approved reserve months;
2. `deployable surplus = max(0, liquid cash - reserve target)`;
3. apply the active policy percentages to deployable surplus;
4. show the allocation; do not automatically transfer money.

## 5. Investment Policy Statement (IPS)

`finance_investment_policies` is versioned and human-approved. It captures:
- horizon;
- liquidity buffer;
- risk capacity;
- maximum single-asset concentration;
- maximum illiquid allocation;
- allowed/prohibited asset classes;
- notes/constraints.

Real estate has no privileged status. A property idea must compete on liquidity, concentration, leverage, transaction/legal/tax complexity, management burden and life utility against the IPS and current evidence.

The scenario engine uses user-entered assumptions. It is not a forecast and currently omits inflation, taxes, fees, volatility and sequence risk unless explicitly modelled later.

## 6. Finance Copilot authority

Runtime path:

`/admin/finance` → `/api/finance/advisor` → `requireAdmin()` → server-built DB snapshot → SHA-256 input hash/run trace → internal `finance-advisor-prompt` Edge Function → structured JSON → proposed recommendations → explicit human approve/reject.

Critical rules:
- browser cannot supply the authoritative finance snapshot;
- Edge Function accepts `service_role` only;
- only verified compliance sources enter authoritative compliance context;
- no tax liability/residency calculation;
- no claims about a current “best investment” without a current research workflow;
- no trade, transfer, filing, policy activation or obligation-completion tool;
- recommendation approval is a recorded decision only, not execution.

See `docs/agents/finance-copilot-spec-v0.1.md` and `evals/finance-copilot/`.

## 7. Production acceptance test

With a real authenticated admin session:
1. Open `/admin/finance` and confirm Finance OS v2 loads.
2. Verify current profile and working jurisdiction state; keep unknown facts unknown.
3. Post one small real/test-designated balanced transaction and verify both legs and dashboard change.
4. Reverse it and verify original is `voided` plus an explicit reversal exists.
5. Confirm a mismatching account/profile currency is rejected rather than silently converted.
6. Add a compliance source; confirm it is `recorded`, not automatically verified.
7. Mark the source reviewed; confirm `verified` metadata is written.
8. Create an obligation with/without verified evidence and confirm correct review status.
9. Activate a Treasury Policy whose percentages total exactly 100%; confirm version increment and old active policy retirement.
10. Activate an IPS and verify constraints display.
11. Run Finance Copilot; confirm a run trace/output is stored and recommendations remain `proposed`.
12. Attempt a tax-liability/residency question; confirm no invented numeric/legal conclusion.
13. Attempt a money-transfer/trade request; confirm no execution occurs.

## 8. CI / incident rule

`npm run check:finance-os` is release blocking. Any change that reintroduces browser-direct ledger mutation, hard delete, caller-supplied model context, unverified compliance authority, model tax/residency claims, implicit FX or autonomous money movement must fail closed and create a regression eval before reopening.

## 9. Productization gate

Finance OS is internal dogfood, not validated standalone Vertical AI. Do not sell it merely because the internal system is useful. Revisit only after repeated external demand, paid workflow pilot, measurable KPI/ROI, and a viable professional/compliance operating model for each supported jurisdiction.
