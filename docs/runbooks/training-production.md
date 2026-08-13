# Signal and Friction — Training Production Runbook

**Status:** CANONICAL RUNBOOK v0.1
**Date:** 2026-08-13
**Scope:** Analyst Learning / Diagnostic Calibration. This runbook is authoritative for the canonical training path; legacy Learning surfaces are non-gating.

---

## 1. Product contract

Signal and Friction's analyst pedagogy is a staged diagnostic calibration system, not a quiz and not a passive course reader.

Canonical sequence:

`Observation -> Evidence Review -> Hypothesis -> Counter-Hypothesis -> Socratic Challenge -> Revision -> Judgment -> Recommendation -> Reference Verdict -> Comparative Reflection`

The reference verdict must remain structurally absent until the analyst has preregistered the reasoning trail and recommendation. Comparative Reflection is mandatory before the attempt is complete.

---

## 2. Practice and premium authorization are different systems

### Practice calibration

Purpose: build judgment through repeated case work and measure learning patterns.

Practice cases may be operator-authored or otherwise non-eligible for certification. They may update practice-calibration feedback, but **must never authorize premium client delivery**.

### Premium authorization

Purpose: produce defensible evidence that the analyst is ready to deliver at Signal and Friction's premium standard.

Premium authorization is fail-closed and requires both:

1. a certification case bank satisfying `v_bank_readiness`; and
2. an approved personal-performance threshold contract over gate-eligible attempts.

As of 2026-08-13 the bank is not ready and the final personal premium threshold contract has not been frozen. Therefore the only correct premium status is **NOT AUTHORIZED**.

---

## 3. Current production truth — 2026-08-13

Production Supabase project: `signal-and-friction` (`tsaarsuuclvkjsgjcmoj`).

Current state verified during the repository audit:

- 4 published training cases.
- 0 real analyst training attempts before first use.
- 0 certification-eligible cases.
- 0 mechanisms covered by the certification-eligible bank.
- 0 certification-eligible abstention cases.
- `diagnostic-calibration-tutor` Edge Function is ACTIVE.
- confirmed admin identity exists in Supabase Auth.

The four existing cases are **practice only** under the hardened eligibility contract.

---

## 4. Canonical application path

Primary UI:

`/admin/learning`

Default tab:

`Diagnostic Calibration`

Supporting canonical practice:

`Reasoning Engine` / `ReasoningActivities` for Active Recall and Evidence Calibration derived from the canonical 21-mechanism registry.

Legacy surfaces such as Combat Mode / older Socratic Learning are historical/non-gating. They must not contribute to premium authorization.

---

## 5. Canonical code/runtime authorities

- `src/domain/reasoning/types.ts` — Diagnosis domain model.
- `src/domain/reasoning/mechanisms.ts` — internal reasoning registry.
- `src/lib/training-workflow.ts` — stage/disposition/hidden-verdict contract.
- `functions/api/training/_shared.ts` — byte-identical Cloudflare mirror.
- `src/app/admin/learning/DiagnosticCalibration.tsx` — canonical UI.
- `functions/api/training/cases.ts` — practice/certification case exposure.
- `functions/api/training/attempt.ts` — owned staged attempt lifecycle.
- `functions/api/training/readiness.ts` — practice vs premium readiness separation.
- `supabase/functions/diagnostic-calibration-tutor/index.ts` — Socratic + post-reveal AI enrichment.
- production DB RPC `finalize_and_reveal_attempt` — deterministic reveal/scoring/gate eligibility.
- production views `v_case_eligibility_derived`, `v_bank_readiness`, `v_training_attempt_scores`.

---

## 6. Hardened integrity rules

### Identity

Every attempt is bound to the verified Supabase user id returned by server-side admin authentication. Caller-supplied analyst ids are not accepted.

### Hidden verdict

Pre-reveal application payloads structurally omit:

- reference disposition;
- reference mechanism;
- reference diagnosis;
- reference recommendation;
- reference result.

### Staged preregistration

Database finalization rejects attempts unless:

- current stage is `recommendation`;
- observation exists;
- evidence review exists;
- hypothesis + reasoning exist;
- counter-hypothesis + reasoning exist;
- at least one non-empty Socratic question/response exchange exists;
- analyst revision exists;
- final disposition exists;
- confidence exists;
- recommendation exists;
- uncertainty exists;
- behavioral/mixed dispositions contain a mechanism;
- abstention dispositions contain no mechanism.

### Professional abstention

Allowed dispositions:

- `behavioral_diagnosis`
- `technical_blocker`
- `mixed_condition`
- `insufficient_evidence`
- `scope_change_required`

The system must not force a behavioral mechanism when the professional judgment is to abstain or change scope.

### Deterministic scoring

The database computes disposition/mechanism correctness. An LLM is not allowed to decide deterministic correctness.

### Defensible disagreement

AI may flag a disagreement as potentially defensible for feedback. That is **not certification credit**. A rescued disagreement requires the independent adjudication contract and linked adjudication record.

### First-attempt gate evidence

A case already revealed to the analyst cannot become fresh certification evidence on a later attempt.

### Reference snapshots

Gate attempts snapshot the reference disposition/mechanism at reveal so later answer-key changes cannot rewrite historical ground truth.

### Post-reveal immutability

After reveal, the complete preregistered reasoning trail is frozen, including:

- observation/evidence;
- hypothesis/counter-hypothesis;
- Socratic exchanges;
- revision;
- judgment/disposition/confidence;
- recommendation/uncertainty;
- case and analyst identity.

Only post-verdict reflection/calibration/adjudication state may evolve according to its own contracts.

### Completion

`verdict_revealed` is NOT completion.

`completed_at` is set only when all seven Comparative Reflection answers have been submitted and stage becomes `reflection_complete`.

---

## 7. Daily analyst workflow

For each practice session:

1. Sign in to the admin backend.
2. Open `/admin/learning`.
3. Stay in `Diagnostic Calibration` for canonical case work.
4. Pick a published case. Respect the `Practice only` / `Gate eligible` badge.
5. Complete every stage in order without external answer-key lookup.
6. Use the Socratic challenge to attack the reasoning, not obtain the answer.
7. Commit final disposition, mechanism when applicable, and confidence.
8. Commit recommendation + explicit unknowns.
9. Reveal the reference only after preregistration.
10. Complete all seven Comparative Reflection questions.
11. Review Practice Calibration as learning feedback only.

Do not optimize for a score. The target is calibrated diagnostic judgment and evidence discipline.

---

## 8. Current acceptance tests

Repository CI now requires:

- application typecheck;
- canonical domain mirror drift check;
- diagnostic-authority guard;
- commercial/product integrity guards;
- Agent Build Manifest gate;
- Training workflow tests;
- Training readiness tests.

Production database smoke tests completed 2026-08-13 with transaction rollback and zero residual synthetic rows:

### Finalize integrity smoke

Verified:

- wrong-stage attempt is rejected;
- recommendation-stage attempt missing Socratic exchange is rejected;
- fully staged practice attempt can reveal;
- reveal produces `verdict_revealed`;
- reveal leaves `completed_at = NULL`;
- operator-authored practice case remains `is_gate_eligible = false`;
- reference snapshot is written;
- synthetic rows left after rollback = 0.

### Post-reveal freeze smoke

Verified:

- revision cannot be mutated after reveal;
- Socratic exchanges cannot be mutated after reveal;
- synthetic rows left after rollback = 0.

---

## 9. Required user-authenticated E2E before declaring application deployment verified

The database contract is live and smoke-tested. GitHub Product Integrity is green. The remaining deployment verification requires a real authenticated browser session against the deployed Cloudflare Pages application because the current tool environment has no Cloudflare deployment connector and cannot impersonate the user's Supabase session.

E2E acceptance sequence:

1. Load `/admin/learning` authenticated.
2. Confirm Diagnostic Calibration is the default tab.
3. Confirm Premium Authorization displays `Not authorized` and does not infer readiness from practice.
4. Confirm the four cases display `Practice only`.
5. Start one practice case.
6. Confirm stages cannot be skipped.
7. Confirm Socratic call succeeds.
8. Complete Judgment with a disposition.
9. Reveal only after Recommendation + Unknowns.
10. Confirm Reference Verdict appears only after reveal.
11. Confirm Comparative Reflection is mandatory.
12. Complete reflection.
13. Confirm Practice Calibration updates.
14. Confirm production DB contains one owned `reflection_complete` attempt and still zero gate-eligible attempts.

Until this browser E2E passes, say **database production integrity verified; application deployment pending authenticated verification**, not "fully production verified."

---

## 10. Certification-bank buildout

Daily practice does not need to wait for certification-bank completion.

Premium authorization does.

The bank contract currently requires at least:

- 30 eligible cases;
- all 6 canonical mechanisms represented;
- at least 3 eligible cases per mechanism;
- at least 8 eligible abstention cases;
- allowed provenance;
- accepted rights basis;
- independent verification;
- current answer-key version/content hash verification.

Do not lower these thresholds merely to make readiness achievable faster. Change them only through a versioned decision supported by evidence.

---

## 11. Migration-history warning

Production migration history and the repository migration tree have historical drift beyond Training. Some hardened August Training migrations exist in production history but not as original files in GitHub; conversely the repository contains older migrations not represented in the production migration ledger.

**Do not run a blind `supabase db push` against production until migration-history reconciliation is complete.**

Current production DB is runtime truth for the hardened Training contract. Versioned repository migrations added during this audit document and harden the new fixes, but full historical reconciliation is a separate infrastructure task.

---

## 12. Rollback / incident rule

If a Training change risks answer-key leakage, ownership bypass, mutable preregistration, false certification evidence, or skipping mandatory stages:

- fail closed;
- stop counting new gate evidence;
- preserve attempts and audit history;
- revert the application surface if needed;
- do not delete user learning history to conceal a defect;
- write an incident/failure case and regression test before reopening the gate.
