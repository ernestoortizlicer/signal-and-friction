# Signal & Friction — Current Canonical Authority

**Version:** 2.0  
**Effective:** 2026-08-13  
**Rule:** historical v1 documents are preserved as provenance. Where v1 conflicts with a CURRENT v2 contract below, v2 governs new implementation and operational decisions.

## Governing architecture

- `docs/canonical/V2-OPERATING-STANDARD.md` — engineering/agent/eval/source/approval constitution.
- `docs/architecture/capability-registry.md` — what already exists; mandatory discovery before new builds.
- `docs/architecture/backend-os-v3.md` — operator module map, LIVE/PLANNED connection truth and runtime health projection.
- `docs/architecture/project-design-system-v1.md` — project-wide visual authority: typography, spacing, surfaces, responsive composition and cross-surface consistency.
- `docs/decision-log-2026-08-13-backend-os-v3.md` — decision record for the outcome-driven admin/backend cutover.
- `docs/decision-log-2026-08-13-agent-roadmap.md` — agent roadmap decisions.

## Learning / diagnostic authority

- `docs/runbooks/training-production.md` — Learning OS v2 + Diagnostic Calibration production contract.
- `src/lib/training-workflow.ts` — staged workflow/disposition/hidden-verdict logic.
- `supabase/migrations/20260813125000_training_hardened_reconciliation.sql` — repository representation of hardened training integrity.
- `supabase/migrations/20260813140000_learning_os_v2.sql` — deliberate-practice operating layer.

## Finance authority

- `docs/runbooks/finance-production.md` — Finance OS v2 production contract.
- `docs/agents/finance-copilot-spec-v0.1.md` — Finance Copilot authority and non-authority.
- `docs/decision-log-2026-08-13-finance-os-v2.md` — financial architecture decisions.
- `supabase/migrations/20260813150000_finance_os_v2.sql` + later finance migrations — ledger/compliance/policy/agent state.

## Commercial/product authority

- `src/lib/offer-catalog.ts` — commercial offer truth.
- `src/domain/reasoning/types.ts` — canonical diagnosis domain object.
- `src/domain/reasoning/mechanisms.ts` — internal reasoning-mechanism registry.

## Agent authority

Every directory under `agents/` must contain `AGENT_MANIFEST.json` and point to its spec, decision log and eval suite. CI enforces this contract.

Current registered agents:
- `opportunity_scout` — experimental build, no send tool.
- `finance_copilot` — internal reviewed loop, no money/tax/trading execution tool.

## Source hierarchy

For changing technical/regulatory claims:
1. live runtime/database truth for what is deployed;
2. official vendor/protocol/government documentation for current external rules;
3. original papers / primary research for empirical claims;
4. versioned internal specs and decision logs;
5. secondary analyses only when primary evidence is unavailable or explicitly useful.

A source does not become canonical because it is newer. It becomes canonical when it is relevant, primary/authoritative enough for the claim, dated/versioned, and reconciled against runtime truth.

## Change rule

A material v2 change requires:
- evidence / failure mode / economic reason;
- affected authority identified;
- deterministic boundary defined before model behavior;
- eval or regression guard;
- human-approval boundary for consequential actions;
- Decision Log entry;
- CURRENT pointer update if authority changes.
