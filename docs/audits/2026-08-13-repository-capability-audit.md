# Repository Capability Audit — 2026-08-13

**Scope:** Signal and Friction repository + connected production Supabase state, focused on AI/agentic capabilities, diagnostic authority, Learning/Training, prospecting, data/permissions, evals, deployment truth, and reusable infrastructure.

**Audit status:** PHASE 1 COMPLETE — capability inventory and critical training-path drift identified. Production training must remain blocked from certification claims until Phase 2 reconciliation and end-to-end smoke tests complete.

---

## Executive result

The repository contains substantially more reusable architecture than the current agent roadmap initially assumed. The largest lesson is not that one feature was missed; it is that Signal and Friction lacks a single canonical capability inventory and there is material drift between repository code and production database truth.

The immediate architecture decision is therefore:

> No new agent or autonomous workflow is specified from a blank page. Every build starts with the canonical Capability Registry and a repository/runtime discovery pass.

The immediate operational decision is:

> Do not use the current `/admin/learning` Diagnostic Calibration flow as certification evidence until its Cloudflare/API code is reconciled with the hardened production database contract and the path passes authenticated end-to-end tests.

Practice and certification are separate concerns: the four current published cases may remain useful as practice material, but production reports **zero gate-eligible certification cases** today.

---

## 1. Audited capability map

### Canonical domain
- `src/domain/reasoning/types.ts` — canonical Diagnosis model.
- `src/domain/reasoning/mechanisms.ts` — canonical 21-mechanism internal registry.
- `src/domain/reasoning/learning-prompts.ts` — Learning prompts derived from the registry.
- mirrored runtime copies under `supabase/functions/_shared/reasoning/`.
- drift guard: `scripts/check-domain-drift.mjs`.

### Evidence / Scan
- `functions/api/_scan.ts` — shared Scan/evidence engine.
- `functions/api/scan-url.ts` — Scan surface.
- `functions/api/prospecting/scan.ts` — prospecting-specific deterministic triage.

### Human diagnostic execution
- `src/app/admin/scaffolds/*`.
- `functions/api/scaffolds/*`.
- `functions/api/scaffolds/challenge-reasoning.ts` — AI challenger, explicitly not diagnostic authority.
- `functions/api/diagnose.ts` — retired autonomous public diagnosis boundary.
- `scripts/check-diagnostic-authority.mjs` — CI guard for that boundary.

### Learning / Training
- `src/app/admin/learning/DiagnosticCalibration.tsx`.
- `src/lib/training-workflow.ts` + Cloudflare mirror.
- `src/lib/calibration-readiness.ts` + Cloudflare mirror.
- `functions/api/training/{cases,attempt,readiness}.ts`.
- `supabase/functions/diagnostic-calibration-tutor/index.ts`.
- `src/app/admin/learning/ReasoningActivities.tsx`.
- legacy paths in `src/app/admin/learning/page.tsx`, older tables, and `learning-socratic-tutor`.

### Prospecting
- `supabase/functions/prospecting-suggest-leads/index.ts`.
- `functions/api/prospecting/*`.
- `supabase/functions/prospecting-discover-contact/index.ts`.
- `src/app/admin/prospecting/*`.
- `prospect_candidates` state.

### Commercial truth
- `src/lib/offer-catalog.ts`.
- dosing/delivery policy modules and their tests/guards.

### AI infrastructure
- `supabase/functions/_shared/ai-router.ts`.
- model/provider tiers, cost estimation, PostHog capture, optional search-grounded route.

### Operator automation / MCP
- `scripts/mcp-supabase-server.mjs` — broad service-role-backed MCP tool surface spanning pipeline, outreach, incidents, finance, priorities, learning, certification, guarantees, Stripe, etc.

### Agent work already started
- `agents/opportunity_scout/`.
- `evals/opportunity-scout/`.
- `docs/agents/*`.

Full paths and reuse rules are maintained in `docs/architecture/capability-registry.md`.

---

## 2. Critical finding A — production training database is ahead of GitHub main

The live Supabase database contains a hardened training-integrity architecture not represented by the current GitHub migration tree or current Cloudflare training endpoints.

Production migration history contains, among others:

- `batch_a_abstention_disposition_layer`
- `batch_a2_allow_null_mechanism_for_abstention`
- `batch_b_gate_controls_enforcement`
- `batch_c_2026_08_08_final_r2`
- `rd10_2026_08_08_final`
- `finalize_reconcile_2026_08_08`

These migration versions/statements exist in `supabase_migrations.schema_migrations` in production, but equivalent migration files are absent from GitHub main.

### Production-only/hardened concepts discovered

- `case_disposition` supporting:
  - `behavioral_diagnosis`
  - `technical_blocker`
  - `mixed_condition`
  - `insufficient_evidence`
  - `scope_change_required`
- `training_adjudications`.
- `analyst_id` ownership.
- `judgment_disposition` and `disposition_correct`.
- `is_gate_eligible`.
- immutable reference snapshots per attempt.
- one eligible attempt per analyst/case.
- answer-key locking and revision audit.
- `case_verification` for rights and independence.
- case version/content hashing.
- `v_case_eligibility_derived`.
- `v_bank_readiness`.
- `v_training_attempt_scores`.
- `gate_track_a`.
- `finalize_and_reveal_attempt` RPC.

This production design already addresses an important false-positive risk identified during the conversational audit: repeating a case after seeing its verdict cannot become fresh gate evidence if the production eligibility path is used correctly.

### Risk

GitHub main's `functions/api/training/attempt.ts` still writes/reveals using the older v3 model rather than treating the production `finalize_and_reveal_attempt` contract as authority. GitHub main's readiness endpoint also computes readiness from completed attempts using its older local algorithm rather than the production gate-eligible scoring surface.

Therefore repository code and production schema can disagree about what an attempt means, who owns it, what counts toward readiness, and how abstention/independent verification work.

**Severity: CRITICAL.**

---

## 3. Critical finding B — current certification bank is not ready

Production currently contains:

- 4 `training_cases`, all published.
- 0 `training_attempts`.
- 0 cases satisfying the derived certification eligibility contract.

Current `v_bank_readiness` reports:

- `eligible_cases = 0`
- `mechanisms_covered = 0`
- `eligible_abstention_cases = 0`
- `provenance_allowed = false`
- `rights_ok = false`
- `independence_ok = false`
- all bank sufficiency booleans false.

The four existing cases are marked `reference_source = operator_authored`, have no accepted `rights_basis`, and are not reference-locked/gate-eligible under the hardened production model.

### Interpretation

They may be useful **practice cases**. They are not valid evidence for the premium-readiness gate under the current hardened production contract.

This distinction is essential. Training can begin before the certification bank is complete, but the software must never tell the analyst they are premium-ready based on non-eligible practice cases.

**Severity: CRITICAL for readiness claims; LOW for practice availability once the app path is fixed.**

---

## 4. Critical finding C — legacy and canonical pedagogies coexist in one Learning surface

`src/app/admin/learning/page.tsx` still contains older Learning/Hyper Leap/education/mastery flows alongside Diagnostic Calibration v3 and Reasoning Activities.

Some legacy flows were built around prior deliverables/ground-truth exposure and a different scoring architecture. The new Diagnostic Calibration v3 deliberately uses hidden verdicts, staged commitment, Socratic challenge, and post-reveal reflection.

### Risk

A user can be presented with multiple training metaphors and scoring systems, weakening the canonical pedagogy and creating ambiguity about what counts as real readiness evidence.

### Decision

- Preserve legacy tables/data for history/backward compatibility.
- Make Diagnostic Calibration + canonical Reasoning Activities the authority for analyst training.
- Move legacy modes out of the primary readiness path and label them explicitly as non-gating historical/practice surfaces if retained.

**Severity: HIGH.**

---

## 5. High finding D — CI does not protect the training system strongly enough

Current Product Integrity CI runs typecheck plus multiple business truth guards, but does not run:

- `src/lib/training-workflow.test.mjs`
- `src/lib/calibration-readiness.test.mjs`
- any integration contract ensuring the Cloudflare training API uses the hardened database finalize/gate path.

### Required remediation

Add a `check:training-integrity` gate that eventually covers:

- hidden verdict structural absence before reveal;
- fixed stage ordering;
- disposition/abstention correctness;
- authenticated analyst ownership;
- immutable preregistered judgment after reveal;
- first-attempt-only gate eligibility;
- independent/rights verified case requirement;
- answer-key snapshot/version integrity;
- no model-authored deterministic correctness;
- adjudication required for defensible-disagreement rescue;
- readiness reads gate-eligible attempts only;
- bank readiness separate from personal calibration;
- no legacy path can increment premium-readiness evidence.

**Severity: HIGH.**

---

## 6. High finding E — broad MCP server must not become an autonomous-agent tool belt

`scripts/mcp-supabase-server.mjs` exposes a large number of tools backed by a service-role Supabase client, including write operations for pipeline/outreach, finance, incidents, priorities, certification and payments.

### Risk

Connecting this entire MCP surface to a future agent would violate least privilege and make approval/authorization reasoning extremely difficult.

### Decision

- Treat the current MCP server as an operator/admin integration surface.
- Future agents receive explicit narrow wrappers or allowlisted tools only.
- Tool schemas, idempotency, authorization, human approval and side-effect classes must be documented per agent.

**Severity: HIGH for future agent safety; no immediate production change required.**

---

## 7. Medium finding F — production runbook is stale for Training

`PRODUCTION_RUNBOOK.md` predates the live hardened Training integrity layer and therefore cannot currently be treated as the complete production source of truth for Learning/Training.

### Required remediation

After reconciliation, update the runbook with:

- canonical Training architecture;
- database objects/RPCs;
- deployment order;
- rollback path;
- authenticated smoke-test procedure;
- readiness/bank-readiness queries;
- Edge Function dependency;
- legacy-mode status.

**Severity: MEDIUM.**

---

## 8. Architecture findings that are good and should be preserved

The audit also found strong patterns that should become default engineering rules:

- canonical Diagnosis model rather than output-specific parallel schemas;
- byte-identical cross-runtime mirrors checked in CI;
- public diagnosis authority deliberately retired/guarded;
- AI reasoning challenger cannot write the analyst's decision;
- Socratic tutor lacks hidden verdict data structurally pre-reveal;
- prospecting suggestions grounded in fetched search evidence before model extraction;
- contact discovery preserves provenance and does not fake verification;
- Scan technical score explicitly separated from diagnosis/purchase intent;
- offer catalog is canonical rather than prompt-hardcoded;
- production Training DB already models abstention, first-attempt eligibility, reference snapshots, adjudication, rights and independence.

These patterns should be reused by Opportunity Scout and every future agent.

---

## 9. Remediation sequence

### Phase 2A — Source-of-truth reconciliation

1. Capture the hardened production Training contract in versioned repository code/migrations.
2. Prevent the older `20260813000000_diagnostic_calibration_v3.sql` migration from becoming an unsafe divergent schema source.
3. Make clean/preview environments reproduce the canonical training schema.
4. Update the Capability Registry whenever architecture changes.

### Phase 2B — Application alignment

1. Make authenticated analyst identity part of every attempt.
2. Add `judgment_disposition` / abstention to UI and API.
3. Use the hardened finalize/reveal transaction/RPC as deterministic truth.
4. Keep AI calibration strictly after preregistration/finalize.
5. Implement the adjudication lifecycle rather than allowing a model result to write `disagreement_defensible` without the required record.
6. Replace old readiness authority with personal gate metrics + bank readiness.
7. Clearly label practice-only cases versus gate-eligible cases.

### Phase 2C — Pedagogy surface cleanup

1. Make Diagnostic Calibration the canonical default Learning path.
2. Keep Reasoning Activities as active-recall/calibration support.
3. Remove legacy Learning/Hyper Leap from the premium readiness calculation.
4. Hide or label legacy paths instead of deleting historical data.

### Phase 2D — Verification before production use

Required before the user begins daily tracked calibration:

- static/type tests green;
- training integrity tests green;
- preview database schema verified;
- authenticated start/save/Socratic/reveal/reflect path verified;
- hidden verdict leakage test;
- repeated-case eligibility test;
- abstention case test;
- readiness endpoint test;
- production deployment;
- production authenticated smoke test;
- production database post-check; and
- no certification claim while `v_bank_readiness` is insufficient.

---

## 10. Build gate for all future agents

The audit is now institutionalized through `docs/architecture/capability-registry.md`.

Before any new agent is designed, the engineer must identify:

- existing overlapping capabilities;
- canonical domain/data authorities;
- active vs legacy runtime paths;
- production/schema drift;
- tool permission surface;
- existing evals/tests/incidents;
- human approval boundaries;
- economic baseline.

A greenfield build without that discovery pass is an architecture failure.

---

## Final audit verdict

**Repository capability reuse:** strong, but previously undocumented as a unified system.

**Agent build governance before this audit:** insufficient.

**Training pedagogy design:** strong.

**Training production integrity database:** substantially stronger than GitHub main suggested.

**Training app/database alignment:** currently unsafe to assume; reconciliation required.

**Certification bank:** not ready; zero gate-eligible cases today.

**Daily practice:** should be enabled as soon as the canonical app path is reconciled and smoke-tested, independent of the slower certification-bank buildout.
