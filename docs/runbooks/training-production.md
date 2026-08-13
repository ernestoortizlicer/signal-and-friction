# Signal and Friction — Learning & Training Production Runbook

**Status:** CANONICAL RUNBOOK v0.2  
**Date:** 2026-08-13  
**Scope:** Daily Learning OS + Diagnostic Calibration + premium-readiness integrity.

## 1. Three different things — never merge them

### A. Learning discipline
`Daily Learning OS` schedules and records external-course study, active recall, diagnostic practice and build/application work. It measures adherence and evidence of practice. It does **not** certify expertise.

### B. Practice calibration
`Diagnostic Calibration` builds and measures judgment on staged cases. Practice cases may be useful even when they are not certification-eligible. Practice feedback does **not** authorize premium client delivery.

### C. Premium authorization
Premium authorization is a separate fail-closed evidence gate using only eligible, independently verified first-attempt evidence. As of 2026-08-13 the certification bank is not ready; the correct status remains **NOT AUTHORIZED**.

## 2. Canonical user path

Primary UI: `/admin/learning`

Default tab: **Today**.

Daily operating loop:

`Study → Retrieve → Diagnose → Apply`

A normal day is materialized from editable targets in `learning_daily_settings`:
- course / primary-reference study;
- Diagnostic Calibration practice;
- active recall / Reasoning Lab;
- build or applied artifact.

Each completed block may record actual minutes, an outcome statement, an evidence reference and retrieval score. Passive course completion alone is not evidence of operational skill.

The highest-priority active external resource (Udemy or another source) is placed into the course block. Historical Learning surfaces remain preserved but are archived/non-gating.

## 3. Diagnostic Calibration canonical sequence

`Observation → Evidence Review → Hypothesis → Counter-Hypothesis → Socratic Challenge → Revision → Judgment → Recommendation → Reference Verdict → Comparative Reflection`

The reference verdict remains structurally absent until the preregistered reasoning trail and recommendation are locked. `verdict_revealed` is not completion. `completed_at` is written only after all seven Comparative Reflection answers are submitted and stage becomes `reflection_complete`.

## 4. Professional abstention

Final disposition can be:
- `behavioral_diagnosis`
- `technical_blocker`
- `mixed_condition`
- `insufficient_evidence`
- `scope_change_required`

Behavioral/mixed judgments require a mechanism. Abstention/scope-change judgments require no forced mechanism. This is enforced in database constraints and finalization.

## 5. Authorities

Daily Learning OS:
- `supabase/migrations/20260813140000_learning_os_v2.sql`
- `functions/api/learning/daily.ts`
- `src/app/admin/learning/DailyTrainingPlan.tsx`
- `src/app/admin/learning/page.tsx`

Diagnostic Calibration:
- `src/domain/reasoning/types.ts`
- `src/domain/reasoning/mechanisms.ts`
- `src/lib/training-workflow.ts`
- `functions/api/training/_shared.ts`
- `src/app/admin/learning/DiagnosticCalibration.tsx`
- `functions/api/training/cases.ts`
- `functions/api/training/attempt.ts`
- `functions/api/training/readiness.ts`
- `supabase/functions/diagnostic-calibration-tutor/index.ts`
- production RPC `finalize_and_reveal_attempt`
- views `v_case_eligibility_derived`, `v_bank_readiness`, `v_training_attempt_scores`

Repository reconciliation:
- `supabase/migrations/20260813125000_training_hardened_reconciliation.sql`
- `20260813130000_training_reflection_completion_gate.sql`
- `20260813131000_training_finalize_stage_integrity.sql`
- `20260813132000_training_freeze_full_reasoning.sql`

## 6. Integrity contract

- Attempts bind to the verified Supabase user id, never caller-supplied analyst ids.
- Hidden reference fields are structurally omitted pre-reveal.
- Database finalization requires stage `recommendation` and the complete canonical reasoning payload, including at least one non-empty Socratic exchange and explicit revision.
- Deterministic correctness is computed in the database, not by an LLM.
- AI feedback can enrich learning but cannot manufacture certification credit.
- Defensible disagreement requires its independent adjudication contract.
- Repeated post-reveal attempts cannot become fresh certification evidence.
- Gate attempts snapshot ground truth at reveal.
- Preregistered reasoning becomes immutable after reveal.
- Comparative Reflection is mandatory for completion.

## 7. Certification-bank gate

Current bank contract requires at least:
- 30 eligible cases;
- all 6 canonical mechanisms;
- at least 3 eligible cases per mechanism;
- at least 8 eligible abstention cases;
- allowed provenance and rights basis;
- current independent rights + answer-key verification.

Do not lower these values merely to create a green badge. Change only through a versioned evidence-backed decision.

## 8. Production truth verified on 2026-08-13

Production Supabase: `signal-and-friction` (`tsaarsuuclvkjsgjcmoj`).

Verified during the remediation/audit cycle:
- hardened schema live;
- 4 published practice cases at audit time;
- zero certification-eligible cases at audit time;
- `diagnostic-calibration-tutor` ACTIVE;
- transactional production smoke passed with zero residual synthetic rows;
- wrong-stage finalization rejected;
- missing Socratic/revision preregistration rejected;
- valid reveal leaves `completed_at=NULL`;
- post-reveal reasoning mutation rejected;
- Product Integrity CI includes Training and Learning OS authority checks.

## 9. Application acceptance test

Before calling a new deployment fully verified, use a real authenticated admin session:
1. Open `/admin/learning`; confirm **Today** is default.
2. Add/activate a real course resource and materialize the daily plan.
3. Complete one course/retrieval/build block with evidence.
4. Open Diagnostic Calibration from Today.
5. Confirm stages cannot be skipped and hidden verdict fields do not appear early.
6. Complete Socratic challenge, revision, disposition/judgment, recommendation and unknowns.
7. Reveal the reference only after preregistration.
8. Complete all seven reflection questions.
9. Confirm the attempt is `reflection_complete` and practice metrics update.
10. Confirm no practice-only attempt becomes gate evidence.

Until authenticated browser E2E passes for a deployment, report **database/runtime integrity verified; authenticated application E2E pending**, not “fully production verified.”

## 10. CI / incident rule

CI must run `check:training-unit` and `check:learning-os`. If a change risks answer-key leakage, ownership bypass, mutable preregistration, false certification evidence, skipped mandatory stages or passive-course completion being treated as skill evidence: fail closed, preserve history, create a regression case/test, and reopen only after the invariant is enforced at the authoritative layer.
