# Decision Log — Backend OS v3

## 2026-08-13 — Replace route inventory with an outcome-driven operating system

**QUESTION**  
How should the admin backend be organized so the operator can understand what every module does, what truth it owns, and how modules interact without reading repository history?

**EVIDENCE**  
- The repository already has canonical domain/runbook authorities and a capability registry; greenfield module redesign would create duplicate authority.
- Existing navigation exposed implementation-history labels (`Pipeline`, `Prospecting`, `Scaffolds`, `Learning`, `Certified`, `Priorities`) with overlapping responsibilities.
- `src/app/admin/dashboard/page.tsx` combines commercial pipeline and other historical concerns, increasing cognitive load and making route names a poor architecture map.
- Current product integrity already treats Training, Finance, diagnosis, payments and scaffolds as governed domains with deterministic boundaries.
- Backend OS v3 already established two live cross-domain projections: `beta_projects`/`ai_incidents` → `priority_tasks`, plus stricter Training completion truth.

**OPTIONS**  
1. Keep all existing top-level modules and improve labels locally.
2. Build a new backend/platform from scratch.
3. Preserve canonical domain authorities but introduce one operator module registry and control plane over them.

**DECISION**  
Choose option 3.

Primary operator vocabulary becomes:

`Overview / Command / Sales / Delivery / Training / Finance / Reliability`

Each module contract declares purpose, source of truth, inputs, outputs, surfaces and connections. Connections are explicitly `LIVE` or `PLANNED`; planned edges are admitted integration debt and cannot be presented as implemented.

`src/lib/admin-module-registry.ts` is the canonical **operator projection**, while the domain authorities named in `docs/architecture/capability-registry.md` remain canonical business truth.

`GET /api/system/overview` provides read-only live health signals and degrades per-module rather than manufacturing a global green state.

**CONFIDENCE**  
High. This reduces parallel authority and aligns the UI with existing canonical contracts rather than inventing new domain objects.

**COST**  
Moderate UI/control-plane refactor; low data migration cost. Existing routes remain available as compatibility surfaces.

**REVERSIBLE?**  
Yes for navigation/UI. No domain truth is deleted or redefined.

**REVISIT CONDITION**  
Revisit module boundaries only when a repeated workflow demonstrates that two modules must share one transaction boundary, or a module cannot be described with a single operator outcome without persistent ambiguity.

---

## 2026-08-13 — Make Stripe payment truth project into canonical Finance truth

**QUESTION**  
How should a successful Stripe payment become visible in Finance OS without creating a second ledger write path or silently losing profile/idempotency context?

**EVIDENCE**  
- The payment webhook already persists `payments` as canonical external-payment truth.
- The legacy webhook also attempted a raw `transactions` + `transaction_entries` write, bypassing `post_finance_transaction`.
- That raw write omitted `profile_id`, `created_by`, `external_source` and `external_id`; Finance OS reads transactions by profile, so a nominally successful write could be operationally invisible and non-idempotent at the Finance boundary.
- Production has a hardened `post_finance_transaction` RPC that checks actor ownership, profile/currency consistency and idempotent external IDs.
- Preview runtime validation of the replacement projection produced a profile-scoped, actor-bound, two-entry journal with zero entry sum from a synthetic USD payment.

**OPTIONS**  
1. Keep Finance posting inside the webhook using raw table writes.
2. Call the Finance RPC directly from every payment/event handler.
3. Treat `payments` as canonical payment truth and project new payment rows into Finance through one database-owned, idempotent Finance integration contract.

**DECISION**  
Choose option 3.

`payments` remains the payment authority. `finance_external_integrations` explicitly maps Stripe to one Finance profile and its cash/revenue/fee accounts. An `AFTER INSERT` projection calls the canonical `post_finance_transaction` RPC using `stripe_checkout_session` + `stripe_session_id` as the idempotency key. Projection failures are durable state in `finance_projection_issues`; payment truth is never rolled back because Finance projection failed.

Direct application writes to `transactions` and `transaction_entries` are revoked; the canonical RPC remains the write boundary.

Stripe fees are not estimated. Exact fee posting is a separate idempotent reconciliation path using Stripe balance-transaction fee truth (`stripe_balance_transaction_fee` + balance transaction ID).

**CONFIDENCE**  
High for gross USD payment projection: deterministic contract + runtime preview smoke + CI guard. Medium for automatic fee completeness because exact balance-transaction fee availability is asynchronous and currently recovered through the explicit reconciliation endpoint rather than the payment-row trigger.

**COST**  
One integration mapping, one projection trigger, one issue queue and one admin-only reconciliation endpoint. The legacy raw-write block becomes redundant and should be removed after the migration is promoted.

**REVERSIBLE?**  
Yes. The projection is derived from canonical `payments`; Finance journal entries are idempotent and can be corrected through the existing Finance reversal contract rather than destructive edits.

**REVISIT CONDITION**  
Revisit when multi-currency sales are accepted, Stripe Connect/multiple merchant accounts appear, or fee reconciliation volume justifies an automatic balance-transaction event consumer.
