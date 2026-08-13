# Repository / Runtime Reconciliation Audit — v2 Closure

**Date:** 2026-08-13  
**Scope:** whole-repository governance, with deep remediation of Learning/Training and Finance.  
**Status:** CODE + CI VERIFIED; PRODUCTION SUPABASE DB/EDGE VERIFIED; AUTHENTICATED CLOUDFLARE UI E2E PENDING.

## Executive result

The failure mode that triggered this audit was not a missing feature. It was **authority drift**: production, repository, UI and agent behavior could disagree about what was canonical. The remediation therefore changed the system at four levels: canonical authority, runtime enforcement, application surfaces and CI regression gates.

No “perfect production” claim is made until the authenticated browser acceptance tests in the Training and Finance runbooks are executed against the deployed Cloudflare application.

## 1. Repository governance — closed

- `docs/canonical/CURRENT.md` declares v2 authority while preserving v1 as provenance.
- `docs/canonical/V2-OPERATING-STANDARD.md` governs agent/tool/context/eval/approval/source/runtime design.
- `docs/architecture/capability-registry.md` is the mandatory pre-build inventory.
- Every governed agent requires manifest + spec + decision log + eval path.
- CI has product-truth guards including Training, Learning OS and Finance OS.

## 2. Training repository/runtime drift — closed for the audited contract

The hardened production Training controls acquired during the Aug 7/8 batches are now represented in GitHub by `20260813125000_training_hardened_reconciliation.sql` before the later completion/finalization/freeze migrations.

Production verification includes:
- professional abstention/disposition contract;
- analyst ownership;
- hidden reference verdict;
- case version/hash/provenance/rights/independence verification;
- independent adjudication boundary;
- answer-key locking;
- first-attempt gate evidence;
- reflection-only completion;
- immutable preregistered reasoning;
- deterministic database correctness/gate scoring.

## 3. Learning OS v2 — implemented

Active learning authority is now:

`Today / Daily Learning OS → Diagnostic Calibration → Reasoning Lab`

Daily loop:

`Study → Retrieve → Diagnose → Apply`

Implemented:
- external course/reference queue (Udemy supported as a provider, not hard-coded);
- editable daily targets;
- daily plan materialization;
- actual minutes;
- outcome statement;
- evidence reference;
- retrieval score;
- recent calibration failure focus;
- link to canonical training attempts;
- historical Learning surfaces explicitly archived/non-gating.

Critical invariant: passive course completion/adherence never becomes certification evidence.

## 4. Finance OS v2 — implemented

Architecture:

`Ledger → Compliance Evidence → Treasury Policy → IPS / Wealth Lab → Finance Copilot`

### Ledger
- existing double-entry ledger retained as canonical;
- atomic posting RPC;
- correction-by-reversal, no destructive posted-history edit/delete;
- external idempotency keys;
- profile/actor binding;
- liquid-cash classification;
- trailing 30/90 day income/expense metrics;
- normalized monthly burn + runway;
- no silent multi-currency consolidation.

### Compliance
- working jurisdiction context is explicit and can remain unknown;
- source records distinguish `recorded | verified | revoked`;
- unverified evidence cannot become authoritative;
- obligations can fail closed to `needs_review`;
- tax residency/liability and legal interpretation remain outside model authority without a professionally owned deterministic workflow.

### Treasury
- versioned human-approved allocation policy;
- all percentages must total 100%;
- no universal “30/70” or internet millionaire rule;
- reserve target precedes deployable surplus;
- deterministic waterfall displays allocations but moves no money.

### Wealth / investing
- versioned Investment Policy Statement: horizon, liquidity, risk capacity, concentration, illiquidity and allowed/prohibited asset classes;
- real estate is one asset-class scenario, not a privileged default;
- scenario calculator exposes assumptions and is not a forecast/trading engine.

### Finance Copilot
- server builds authoritative snapshot; caller cannot supply balances/policy/evidence;
- internal Edge Function is service-role only;
- structured JSON output;
- trace/input hash/model/cost/latency;
- only verified compliance sources enter authoritative model context;
- no tax liability/residency invention;
- no current “best investment” claim without current evidence workflow;
- no money movement, trades, filings, policy activation or obligation-completion tool;
- recommendations persist as `proposed` and require human decision; approval is not execution.

## 5. Security verification — passed for new audited surfaces

Supabase Security Advisor initially reported security-definer view errors in hardened Training/legacy Learning plus privileged Finance RPC warnings.

Remediation:
- Training verification views changed to security-invoker/internal service-role access;
- legacy `mechanism_mastery` removed from authenticated authority;
- Finance mutation/policy/source-verification RPCs are service-role only with explicit verified actor identity;
- authenticated sessions cannot execute post/void/policy/source-verification RPCs directly;
- mutable search-path warnings fixed for finance ledger helper functions within scope.

Post-remediation privilege check:
- authenticated post: false;
- authenticated void: false;
- authenticated activate cash policy: false;
- authenticated activate IPS: false;
- authenticated verify compliance source: false;
- service_role post: true.

The whole historical database is **not** declared security-warning-free. Remaining Security Advisor warnings outside the remediated Learning/Training/Finance scope stay in the audit backlog and must not be mass-modified without dependency tests.

## 6. Performance verification — remediated scope

Added covering indexes for audited Training/Learning/Finance foreign-key paths and changed owner RLS policies to init-plan-safe `(SELECT auth.uid())` form.

Current advisor output no longer reports the audited Learning/Training FK/RLS problems as missing-index/initplan issues. It still reports historical unindexed FKs/multiple permissive policies elsewhere, and “unused index” informational findings including newly created indexes. New/empty-system indexes are intentionally not deleted merely because usage counters are still zero.

## 7. Production transactional smoke — PASS / zero residue

A production Supabase transaction with final `ROLLBACK` verified:
- Finance post created exactly 2 balanced ledger legs;
- actor/profile binding;
- reversal changed original to `voided` and netted original+reversal to zero;
- Treasury Policy activation;
- IPS activation;
- compliance source recorded then verified;
- Learning resource/session completion and progress view.

Result: `PASS`.

Follow-up residue query: zero synthetic smoke rows in transactions, compliance sources, learning resources, Treasury policies and IPS policies.

## 8. CI — PASS

Latest `Product Integrity` on `main` completed successfully after v2 authority/guard changes. CI now includes:
- typecheck;
- commercial/domain/diagnostic/intake/payment/scaffold truth;
- agent manifest governance;
- Training unit tests;
- Learning OS authority guard;
- Finance OS authority guard.

## 9. What is not yet proven

### Authenticated Cloudflare application E2E
Not yet verified from this tool environment. Required before stating “fully production verified”:
- real admin login;
- `/admin/learning` Today plan + course resource + evidence completion + Diagnostic Calibration full path;
- `/admin/finance` ledger post/reversal + compliance source/obligation + Treasury + IPS + Finance Agent model call;
- browser refresh/persistence/error handling on deployed Cloudflare build.

### Finance model live end-to-end
The internal Edge Function v6 is deployed and its authority boundary is verified, but a real `/api/finance/advisor` call under an authenticated admin Cloudflare session has not been run from this environment. Do not claim model E2E until that acceptance test passes.

### Historical database debt
Unrelated legacy Supabase advisor warnings remain. They are backlog, not a reason to destabilize current production with blind cleanup.

### Migration history
Historical repository ↔ production migration drift outside reconciled slices remains a known deployment risk. Do not perform blind production `supabase db push` until full migration-history reconciliation is explicitly completed.

## 10. Next operational action

The next step is not another feature build. It is one authenticated production acceptance session following:
- `docs/runbooks/training-production.md`
- `docs/runbooks/finance-production.md`

Any failure becomes a regression test/guard before further agent work.
