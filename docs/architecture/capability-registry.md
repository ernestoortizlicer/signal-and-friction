# Signal and Friction — Capability Registry

**Status:** CANONICAL INVENTORY v0.3  
**Last audited:** 2026-08-13  
**Current authority index:** `docs/canonical/CURRENT.md`  
**Purpose:** prevent duplicate agents, duplicate sources of truth and greenfield rebuilding of capabilities that already exist.

## Constitutional rule

Before specifying/building any agent, automation, tool, workflow or AI-assisted feature:
1. search this registry and the repository;
2. identify existing domain/runtime authorities;
3. reuse/extend unless evidence proves a clean new boundary is superior;
4. separate deterministic truth from model judgment;
5. define permissions/approval/evals;
6. record material architecture changes in a Decision Log.

A feature is not an agent merely because it calls an LLM.

## Status vocabulary

- **CANONICAL** — source of truth.
- **ACTIVE** — intended production/current use.
- **LEGACY** — historical/compatibility only; never new authority.
- **CONDITIONAL** — approved idea, not approved build.
- **EXPERIMENTAL** — deliberately narrow/pre-production.
- **FAIL-CLOSED** — insufficient evidence must remain unauthorized/unknown.

---

## 1. Diagnostic domain / evidence / reasoning

### Diagnosis model
- **Status:** CANONICAL.
- **Authority:** `src/domain/reasoning/types.ts`.
- **Runtime mirror:** `supabase/functions/_shared/reasoning/types.ts`.
- **Guard:** `scripts/check-domain-drift.mjs`.
- **Core chain:** evidence → observation → hypothesis → judgment → recommendation → uncertainty.
- No future agent/learning/scaffold/deliverable may invent a parallel diagnosis object.

### Internal reasoning registry
- **Status:** CANONICAL.
- **Authority:** `src/domain/reasoning/mechanisms.ts`.
- **Runtime mirror:** `supabase/functions/_shared/reasoning/mechanisms.ts`.
- 21 internal reasoning mechanisms; do not duplicate into hand-maintained prompts.

### Public friction vocabulary
Six canonical mechanisms: `cognitive_load`, `trust_deficit`, `commitment_anxiety`, `ordering_error`, `identity_friction`, `value_uncertainty`. Technical signals are evidence, not a seventh mechanism.

### Scan
- **Status:** ACTIVE / CANONICAL measured-signal producer.
- **Authority:** `functions/api/_scan.ts`.
- **Prospecting:** `functions/api/prospecting/scan.ts`.
- Scan outputs evidence/triage, not behavioral proof, revenue impact or purchase intent.

---

## 2. Diagnostic workspace / scaffolds

### Scaffolds
- **Status:** ACTIVE.
- **UI:** `src/app/admin/scaffolds/page.tsx`.
- **API:** `functions/api/scaffolds/*`.
- **State:** `diagnostic_scaffolds`.

### Reasoning Panel / Challenge
- **Status:** ACTIVE AI ASSISTANCE, HUMAN DECISION AUTHORITY.
- **UI:** `ReasoningPanel.tsx`, `ReasoningChallenge.tsx`.
- **API:** `functions/api/scaffolds/challenge-reasoning.ts`.
- AI may challenge evidence/alternatives but cannot commit the diagnosis or recommendation.

### Public autonomous diagnosis
- **Status:** RETIRED/FORBIDDEN.
- **Guard:** `scripts/check-diagnostic-authority.mjs`.

---

## 3. Learning OS v2

### Daily Learning OS
- **Status:** ACTIVE / CANONICAL DAILY CONTROL SURFACE.
- **UI:** `/admin/learning` default `Today`; `src/app/admin/learning/DailyTrainingPlan.tsx`.
- **API:** `functions/api/learning/daily.ts` (admin-gated).
- **DB:** `learning_daily_settings`, `learning_resources`, `learning_sessions`, `v_learning_resource_progress`.
- **Migration:** `20260813140000_learning_os_v2.sql`.
- **Loop:** Study → Retrieve → Diagnose → Apply.
- Tracks external course resources, daily targets, actual minutes, outcomes, evidence refs, retrieval scores and linked diagnostic attempts.
- **Boundary:** course completion/adherence is learning evidence, not certification authority.
- **Guard:** `scripts/check-learning-os-truth.mjs` / `check:learning-os`.

### Diagnostic Calibration
- **Status:** ACTIVE / CANONICAL DIAGNOSTIC PRACTICE.
- **UI:** `src/app/admin/learning/DiagnosticCalibration.tsx`.
- **Workflow:** `src/lib/training-workflow.ts`; Cloudflare mirror `functions/api/training/_shared.ts`.
- **APIs:** `functions/api/training/{cases,attempt,readiness}.ts`.
- **AI tutor:** `supabase/functions/diagnostic-calibration-tutor/index.ts`.
- **Pedagogy:** Observation → Evidence Review → Hypothesis → Counter-Hypothesis → Socratic Challenge → Revision → Judgment → Recommendation → hidden Reference Verdict → Comparative Reflection.
- Hidden verdict is a server/data-boundary invariant. Reveal is not completion. Post-reveal preregistration is immutable. Professional abstention is first-class.
- **Runbook:** `docs/runbooks/training-production.md`.

### Reasoning Activities
- **Status:** ACTIVE SUPPORTING PRACTICE.
- **UI:** `ReasoningActivities.tsx`.
- **Authority:** `src/domain/reasoning/learning-prompts.ts` + canonical reasoning registry.

### Legacy Learning / Hyper Leap / old Socratic
- **Status:** LEGACY / NON-GATING.
- Historical state preserved; removed from active Learning authority. `learning-socratic-tutor` must not be extended for new canonical training.

---

## 4. Premium readiness / training integrity

### Practice calibration
- **Status:** ACTIVE FEEDBACK ONLY.
- **Authority:** `src/lib/calibration-readiness.ts` + runtime mirror/API.
- Cannot authorize premium work.

### Premium authorization
- **Status:** ACTIVE FAIL-CLOSED.
- Live/repository authority includes `case_disposition`, analyst ownership, gate eligibility/reference snapshots, `training_adjudications`, `case_verification`, `finalize_and_reveal_attempt`, `v_case_eligibility_derived`, `v_bank_readiness`, `v_training_attempt_scores`, `gate_track_a`.
- Repository reconciliation: `20260813125000_training_hardened_reconciliation.sql` plus the 2026081313xxxx completion/finalization/freeze migrations.
- Repeated revealed cases cannot become fresh gate evidence. Answer keys/rights/independence are versioned/verified. Deterministic correctness lives in Postgres.
- Current certification bank remains insufficient; premium status is **NOT AUTHORIZED** until all bank + personal-performance contracts pass.

---

## 5. Prospecting / Agent #1

### Lead discovery
- **Status:** ACTIVE primitive.
- **Edge:** `prospecting-suggest-leads` — search-first extraction, domain checks, human review before persistence.
- **State/UI/API:** `prospect_candidates`, `/admin/prospecting`, `functions/api/prospecting/*`.

### Contact discovery
- **Status:** ACTIVE primitive.
- **Edge:** `prospecting-discover-contact`.
- Candidate/inferred contact is never silently upgraded to verified.

### Opportunity Scout
- **Status:** EXPERIMENTAL BUILD.
- **Manifest:** `agents/opportunity_scout/AGENT_MANIFEST.json`.
- **Spec:** `docs/agents/agent-01-opportunity-scout-spec-v0.1.md`.
- **Evals:** `evals/opportunity-scout/`.
- One agent + narrow reused tools + deterministic gates + human approval. No send tool v0.1.

---

## 6. Finance OS v2

### Finance ledger
- **Status:** ACTIVE / CANONICAL FINANCIAL RECORD.
- **Authority:** `accounts`, `transactions`, `transaction_entries` + deferred double-entry constraint.
- **Posting:** `post_finance_transaction` atomic RPC.
- **Correction:** `void_finance_transaction` reversal RPC; no destructive history edit/delete.
- **Metrics:** server-derived liquid cash, trailing revenue/expense, normalized burn/runway; no silent FX consolidation.
- **API/UI:** `functions/api/finance/index.ts`, `/admin/finance`.

### Compliance evidence
- **Status:** ACTIVE / FAIL-CLOSED.
- **Objects:** `finance_profiles`, `finance_compliance_sources`, `finance_obligations`.
- Source state: recorded → verified/revoked. A URL alone is not authority. Unverified obligation evidence produces `needs_review`.
- Jurisdiction working context does not itself determine tax residency.

### Treasury Policy
- **Status:** ACTIVE HUMAN POLICY AUTHORITY.
- **Object:** `finance_cash_policies`.
- Versioned/atomic activation; percentages total 100%; no universal allocation default.
- Deterministic waterfall protects reserve target before allocating deployable surplus; no automatic money movement.

### Investment Policy Statement / Wealth Lab
- **Status:** ACTIVE HUMAN POLICY + EDUCATION.
- **Object:** `finance_investment_policies`.
- Horizon, liquidity, risk capacity, concentration/illiquidity caps and asset-class constraints.
- Scenario engine uses explicit assumptions; no current-market forecast authority. Real estate is an asset-class scenario, not a default recommendation.

### Finance Copilot
- **Status:** INTERNAL ACTIVE REVIEWED LOOP.
- **Manifest:** `agents/finance_copilot/AGENT_MANIFEST.json`.
- **Spec:** `docs/agents/finance-copilot-spec-v0.1.md`.
- **Evals:** `evals/finance-copilot/`.
- **API:** `functions/api/finance/advisor.ts` builds authoritative server snapshot + trace/hash.
- **Internal Edge:** `finance-advisor-prompt` v6; service-role only; structured JSON.
- **Write surface:** run/recommendation records only. No ledger/tax/trade/filing tool.
- **Runbook:** `docs/runbooks/finance-production.md`.
- **Guard:** `scripts/check-finance-os-truth.mjs` / `check:finance-os`.
- **Productization:** NOT VALIDATED; internal dogfood until repeated paid external workflow evidence.

---

## 7. Commercial offer authority

### Offer catalog
- **Status:** CANONICAL.
- **Authority:** `src/lib/offer-catalog.ts`.
- Agents/prompts consume current catalog; do not hardcode parallel pricing/scope.

### Dosing/delivery
- **Status:** ACTIVE.
- **Authorities:** `src/lib/dosing.ts`, `src/lib/delivery-policy.ts` and checked mirrors where required.

---

## 8. AI provider/runtime infrastructure

### Shared AI Router
- **Status:** ACTIVE.
- **Authority:** `supabase/functions/_shared/ai-router.ts`.
- Cost/quality routing, model/provider selection, telemetry.
- Current provider IDs/pricing are time-sensitive and must be reverified before material new dependency.

### Edge functions relevant to AI
Active/represented functions include `diagnostic-calibration-tutor`, legacy `learning-socratic-tutor`, `prospecting-suggest-leads`, `prospecting-discover-contact`, `finance-advisor-prompt`, `outreach-scanner`.

---

## 9. MCP / operator tooling

### Supabase MCP server
- **Status:** ACTIVE / BROAD OPERATOR SURFACE, NOT SAFE WHOLESALE AGENT TOOLSET.
- **Path:** `scripts/mcp-supabase-server.mjs`.
- Broad service-role-backed side effects across business domains.
- New autonomous agents must whitelist/create narrow least-privilege tools rather than expose this server wholesale.
- Any new MCP implementation should target current 2026-07-28 stateless protocol semantics and avoid newly deprecated protocol primitives.

---

## 10. Observability / incidents / evals

- PostHog: active telemetry primitive.
- Existing incident/iteration DB/MCP paths should be reused before inventing new failure stores.
- Agent evals: `evals/opportunity-scout/`, `evals/finance-copilot/`.
- Traces must capture model/config/tools/errors/cost/latency/outcome while minimizing unnecessary sensitive raw context.

---

## 11. Production / CI truth

### Product Integrity
- **Status:** ACTIVE RELEASE GATE.
- **Workflow:** `.github/workflows/product-integrity.yml`.
- Covers typecheck, offers, domain drift, diagnostic authority, intake truth, Stripe/webhook/payment/scaffold contracts, agent manifests, Training unit tests, Learning OS authority and Finance OS authority.

### Deployment truth
A green repository/CI is not proof of authenticated production UI. Database/Edge runtime can be separately verified. For a material surface, use its runbook E2E before saying “fully production verified.”

### Migration warning
Historical repository ↔ production migration drift exists beyond the reconciled slices. Do not run a blind production `supabase db push` until full migration-history reconciliation is complete.

---

## 12. Conditional future systems

- Diagnostic & Delivery Copilot — evolution of canonical Diagnosis/Calibration, not greenfield.
- Sales Conversation Agent — wait for enough real conversations/tools/KPI evidence.
- Client Follow-up/Success Agent — wait for repeated measurable post-sale workflow.
- Finance external product — wait for paid repeated demand + professional/compliance operating model.

## Mandatory pre-build questions

No new agent/tool/workflow enters BUILD until it answers:
- what existing capability already performs part of the outcome?
- which canonical state/domain model must it consume?
- why is extension insufficient?
- what is deterministic before model?
- what exact tools/permissions are necessary?
- what consequential action needs human approval?
- what state must not be duplicated?
- what eval/ground truth determines success?
- what business KPI/baseline proves value?
- what runtime/repository drift must be resolved first?

Unknown answers mean **DISCOVER/AUDIT**, not BUILD.
