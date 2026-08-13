# Signal & Friction — Backend OS v3

**Status:** ACTIVE OPERATOR ARCHITECTURE  
**Effective:** 2026-08-13  
**Governing authorities:** `docs/canonical/V2-OPERATING-STANDARD.md`, `docs/architecture/capability-registry.md`  
**Runtime projection:** `src/lib/admin-module-registry.ts`

## Purpose

The backend is an operating system, not a route inventory. A page or table does not earn first-class module status by existing.

A first-class module must answer, without inference:
1. what operator outcome it owns;
2. what canonical truth it reads/writes;
3. what enters it;
4. what it produces;
5. what other modules consume that output;
6. whether each connection is LIVE or PLANNED;
7. what live signal proves the module is operating.

If any answer is missing, the module is incomplete or wrongly bounded.

## Operator modules

| Module | Outcome | Canonical truth / authority | Primary surface |
|---|---|---|---|
| Command | Decide what deserves attention now | `priority_tasks` as a **derived projection**; source state remains canonical elsewhere | `/admin/priorities` |
| Sales | Move a qualified company toward paid work | `clients`, `beta_projects`, `prospect_candidates`, offer/payment contracts | `/admin/dashboard`, `/admin/prospecting` |
| Delivery | Turn evidence into reviewable diagnosis and deliverable | `diagnostic_scaffolds` + canonical reasoning/delivery policy | `/admin/scaffolds` |
| Training | Build and prove analyst capability | `learning_sessions`, `training_attempts`, readiness views | `/admin/training` |
| Finance | Keep money truth deterministic and judgment reviewable | ledger + `finance_*` evidence/policy objects | `/admin/finance` |
| Reliability | Turn failure into fix and regression evidence | `ai_incidents` + CI/eval/runtime evidence | `/admin/reliability` |

`/admin/overview` is the control plane over these modules; it is not a seventh business authority.

## Connection truth

### LIVE

- Sales → Command: `beta_projects` state projects into ranked commercial actions.
- Reliability → Command: unresolved high/critical incidents project into ranked actions.
- Sales → Delivery: paid/project provisioning can create the diagnostic scaffold/workspace.
- Training → Premium Authorization: readiness is deterministic and fail-closed; course completion never authorizes premium work.

### PLANNED — explicitly not yet implemented

- Sales → Finance: Stripe/payment events need canonical idempotent ledger posting, including fees/external IDs.
- Finance → Command: verified economic state should inform Priority Engine v2 without duplicating ledger truth.
- Delivery/Reliability/Training improvement loop: material failures should become incident → eval/regression → training/tool/harness improvements with privacy controls.

A planned edge must remain visible as a gap. UI language may not imply the connection exists before the data/action contract is implemented and tested.

## Runtime health projection

`GET /api/system/overview` is an admin-gated, read-only projection of current module state. It probes canonical stores independently so one stale/missing subsystem degrades to `unavailable` without making the whole control plane lie or fail.

Current signals:
- Command: active `priority_tasks`.
- Sales: active `beta_projects`.
- Delivery: draft `diagnostic_scaffolds`.
- Training: today's `learning_sessions`.
- Finance: open `finance_obligations`.
- Reliability: unresolved `ai_incidents` and high/critical count.

The health projection is observability, not a new source of truth.

## Navigation rule

Primary navigation uses outcome vocabulary only:

`Overview / Command / Sales / Delivery / Training / Finance / Reliability`

Implementation-history labels such as `Scaffolds`, `Learning`, `Certified`, or duplicated pipeline/prospecting top-level modules may remain as routes for compatibility but do not define the operator mental model.

## Architectural invariants

1. **One module, one job.** If two modules own the same decision/state, fix the boundary.
2. **One canonical authority.** UI projections and caches never become parallel truth.
3. **Live beats implied.** A connection is LIVE only if code/data currently enforce it.
4. **Deterministic first.** Facts, state transitions, permissions and side effects stay outside model judgment where specifiable.
5. **Failures compound into evidence.** Material incidents become regression/eval work, not anecdotal patches.
6. **No module theater.** A pretty card without action/state/connection contracts is not a finished module.

## Regression guard

`scripts/check-backend-os-contract.mjs` protects the visible module set, shared registry, health endpoint, truth boundaries and removal of legacy vocabulary from first-class navigation.

This guard is part of Product Integrity CI.
