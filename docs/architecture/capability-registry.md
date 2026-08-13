# Signal and Friction — Capability Registry

**Status:** CANONICAL INVENTORY v0.2
**Last audited:** 2026-08-13
**Purpose:** Prevent duplicate agents, duplicate sources of truth, and accidental rebuilding of capabilities that already exist.

## Constitutional rule

Before specifying or building any new agent, automation, tool, workflow, or AI-assisted feature:

1. Search this registry and the repository.
2. Identify the existing domain authority and runtime capabilities that overlap the proposed outcome.
3. Reuse or extend an existing capability unless evidence shows a clean new boundary is economically or operationally superior.
4. Record any material architecture decision in a Decision Log.
5. Do not call a feature an agent merely because it uses an LLM.

A new system is allowed only when its outcome, state, permissions, tools, evaluation criteria, or lifecycle is materially different from the existing system.

---

## Status vocabulary

- **CANONICAL** — source of truth; other systems must consume/derive from it.
- **ACTIVE** — currently implemented and intended for use.
- **LEGACY** — retained for backward compatibility/history; must not become the authority for new work.
- **CONDITIONAL** — approved concept, not approved for build until evidence triggers it.
- **EXPERIMENTAL** — deliberately narrow or pre-production.
- **DRIFTED** — implementation and production truth are not aligned; do not extend until reconciled.

---

## 1. Diagnostic domain and reasoning

### Canonical Diagnosis model
- **Status:** CANONICAL
- **Authority:** `src/domain/reasoning/types.ts`
- **Mirrored runtime copy:** `supabase/functions/_shared/reasoning/types.ts`
- **Invariant:** `scripts/check-domain-drift.mjs` must fail on divergence.
- **Core layers:** `evidence -> observation -> hypothesis -> judgment -> recommendation -> uncertainty`.
- **Rule:** no future agent, Learning surface, scaffold, or deliverable may invent a parallel diagnostic object.

### Internal reasoning registry
- **Status:** CANONICAL
- **Authority:** `src/domain/reasoning/mechanisms.ts`
- **Mirrored runtime copy:** `supabase/functions/_shared/reasoning/mechanisms.ts`
- **Scope:** 21 reasoning mechanisms with evidence strength, epistemic warnings, diagnostic questions, misinterpretations, contraindications, references, and only defensible measured-signal mappings.
- **Rule:** never duplicate these mechanisms into prompts as a second hand-maintained registry.

### Six canonical friction mechanisms
- `cognitive_load`
- `trust_deficit`
- `commitment_anxiety`
- `ordering_error`
- `identity_friction`
- `value_uncertainty`

These are the public/product-level diagnostic vocabulary. Technical signals are evidence; they are not a seventh mechanism.

---

## 2. Scan / evidence engine

### Shared Scan
- **Status:** ACTIVE / CANONICAL measured-signal producer
- **Authority:** `functions/api/_scan.ts`
- **Surfaces:** public Scan, prospecting Scan, scaffold generation inputs.
- **Measured/observed domain:** Core Web Vitals/performance and observable website trust/disclosure/CTA/mobile signals.
- **Hard boundary:** Scan outputs are evidence/triage. They do not prove a behavioral mechanism, commercial pain, revenue impact, or purchase intent.

### Prospecting Scan
- **Status:** ACTIVE
- **Path:** `functions/api/prospecting/scan.ts`
- **State:** `prospect_candidates.technical_signals`, deterministic `technical_score`, score breakdown.
- **Rule:** never overload `technical_score` with model judgment or purchase propensity.

---

## 3. Human diagnostic workspace

### Diagnostic scaffolds
- **Status:** ACTIVE
- **UI:** `src/app/admin/scaffolds/page.tsx`
- **API:** `functions/api/scaffolds/*`
- **State:** `diagnostic_scaffolds`
- **Purpose:** analyst-authored diagnostic work and deliverable preparation.

### Reasoning Panel
- **Status:** ACTIVE
- **Path:** `src/app/admin/scaffolds/ReasoningPanel.tsx`
- **Authority consumed:** canonical reasoning registry / Diagnosis model.

### Reasoning Challenge
- **Status:** ACTIVE AI ASSISTANT, NOT DECISION MAKER
- **UI:** `src/app/admin/scaffolds/ReasoningChallenge.tsx`
- **API:** `functions/api/scaffolds/challenge-reasoning.ts`
- **Purpose:** challenge the analyst with contradictions, alternatives, missing evidence, counterarguments, and one probing question.
- **Hard boundary:** AI may not commit the diagnosis, dominant mechanism, or recommendation.

### Public autonomous diagnosis endpoint
- **Status:** RETIRED / FORBIDDEN
- **Path:** `functions/api/diagnose.ts`
- **Guard:** `scripts/check-diagnostic-authority.mjs`
- **Invariant:** public intake does not autonomously produce a final premium diagnosis.

---

## 4. Learning and analyst calibration

### Diagnostic Calibration System
- **Status:** ACTIVE / MAIN RECONCILED TO HARDENED CONTRACT; authenticated Cloudflare deployment E2E still required.
- **UI:** `src/app/admin/learning/DiagnosticCalibration.tsx`
- **Workflow authority:** `src/lib/training-workflow.ts`
- **Cloudflare mirror:** `functions/api/training/_shared.ts`
- **API:** `functions/api/training/{cases,attempt,readiness}.ts`
- **AI tutor:** `supabase/functions/diagnostic-calibration-tutor/index.ts`
- **Production state:** `training_cases`, `training_attempts`, hardened integrity objects/RPCs/views in live Supabase.
- **Sacred pedagogy:** observation -> evidence review -> hypothesis -> counter-hypothesis -> Socratic challenge -> revision -> judgment -> recommendation -> hidden reference verdict -> comparative reflection.
- **Hard boundary:** reference verdict must be absent from pre-reveal model/user context, not merely hidden by prompt/UI convention.
- **Build rule:** no separate Learning Agent. Future diagnostic/delivery copilot work must extend this architecture.
- **Integrity hardening 2026-08-13:** finalization requires stage=Recommendation + saved Socratic exchange + revision; reveal is not completion; full preregistered reasoning is immutable post-reveal; professional abstention is first-class.
- **Operational runbook:** `docs/runbooks/training-production.md`.

### Reasoning Activities
- **Status:** ACTIVE
- **UI:** `src/app/admin/learning/ReasoningActivities.tsx`
- **Prompt authority:** `src/domain/reasoning/learning-prompts.ts`
- **Current real activities:** Active Recall; Evidence Calibration.
- **Intentionally unavailable until real content exists:** Mechanism Comparison; Case Analysis; Diagnostic Practice.
- **Rule:** no fabricated exercises to make UI look complete.

### Legacy Learning / Hyper Leap / older Socratic paths
- **Status:** LEGACY / NON-GATING
- **Locations:** large portions of `src/app/admin/learning/page.tsx`; `hyper_leap_sessions`; `education_content`; `education_drafts`; `education_progress`; `mechanism_mastery`; `practice_queue`; `supabase/functions/learning-socratic-tutor`.
- **Risk:** parallel pedagogies can contradict the canonical Diagnostic Calibration integrity model.
- **Rule:** preserve historical data; do not use legacy paths as premium-readiness authority. Diagnostic Calibration remains the default Learning tab.

### Client Autonomy curriculum
- **Status:** ACTIVE product curriculum, NOT analyst certification
- **Authority:** `src/lib/autonomy-curriculum.ts`
- **Purpose:** transfer a safe, simplified repeatable discipline to DWY/DFY Autonomy Kit clients.
- **Boundary:** deliberately does not expose the proprietary 21-mechanism analyst registry.

---

## 5. Analyst readiness / certification evidence

### Practice-calibration implementation
- **Status:** ACTIVE FEEDBACK ONLY / NOT PREMIUM AUTHORITY
- **Authority:** `src/lib/calibration-readiness.ts` + `functions/api/training/_shared-readiness.ts`
- **API:** `functions/api/training/readiness.ts`
- **Role:** transparent named criteria for practice feedback and confusion tracking.
- **Hard boundary:** practice results carry `certificationAuthority: false`; repeated/non-eligible practice cannot authorize premium work.

### Premium authorization / production training-integrity layer
- **Status:** ACTIVE, FAIL-CLOSED
- **Live objects include:**
  - `case_disposition`
  - `training_adjudications`
  - analyst ownership (`analyst_id`)
  - `is_gate_eligible`
  - reference snapshots
  - unique eligible attempt per analyst/case
  - `finalize_and_reveal_attempt`
  - `case_verification`
  - `v_case_eligibility_derived`
  - `v_bank_readiness`
  - `v_training_attempt_scores`
  - `gate_track_a`
- **Integrity:** repeated/revealed cases do not become fresh gate evidence; answer keys are versioned/locked; abstention is first-class; independent/rights verification gates the certification bank; deterministic correctness lives in the database.
- **Current bank state:** the four published cases are practice-only; certification bank is insufficient and premium status must remain NOT AUTHORIZED.
- **Remaining unknown:** final personal premium-performance threshold contract has not yet been frozen. Even after bank readiness, authorization must remain fail-closed until that contract exists.
- **Infrastructure caveat:** historical Supabase migration ledger and repository migration tree still have broader drift; do not run blind production `supabase db push` until that is reconciled.

---

## 6. Prospecting / Opportunity Scout

### AI-suggested lead discovery
- **Status:** ACTIVE primitive
- **Edge Function:** `supabase/functions/prospecting-suggest-leads/index.ts`
- **Behavior:** real search first; model extraction/synthesis constrained to fetched text; domain cross-check; lightweight live fetch; human review before persistence.

### Prospect candidate pipeline
- **Status:** ACTIVE
- **State:** `prospect_candidates`
- **UI:** `src/app/admin/prospecting/page.tsx`
- **API:** `functions/api/prospecting/*`
- **Lifecycle:** suggestion/manual seed -> candidate -> Scan -> review/promotion/dismissal.

### Contact discovery
- **Status:** ACTIVE primitive
- **Edge Function:** `supabase/functions/prospecting-discover-contact/index.ts`
- **UI:** `src/app/admin/prospecting/ContactDiscoveryCell.tsx`
- **Boundary:** `candidate`/`inferred` are not silently upgraded to `verified`; inferred emails must not be treated as verified.

### Agent #1 — Opportunity Scout
- **Status:** EXPERIMENTAL BUILD
- **Spec:** `docs/agents/agent-01-opportunity-scout-spec-v0.1.md`
- **Manifest:** `agents/opportunity_scout/AGENT_MANIFEST.json`
- **Code:** `agents/opportunity_scout/`
- **Evals:** `evals/opportunity-scout/`
- **Architecture:** one agent + narrow tools + deterministic gates + explicit state + human approval.
- **Reuse mandate:** discovery, Scan, contact discovery, offer catalog, and existing prospect state must be tools/primitives rather than rebuilt subsystems.
- **No send tool in v0.1.**

---

## 7. Commercial offer authority

### Offer catalog
- **Status:** CANONICAL
- **Authority:** `src/lib/offer-catalog.ts`
- **Rule:** agents and prompts must consume current offer data rather than hardcoding names/prices/scope.

### Commercial dosing / delivery policy
- **Status:** ACTIVE
- **Authorities:** `src/lib/dosing.ts`, `src/lib/delivery-policy.ts` and mirrored/runtime equivalents where required.
- **Guards:** offer integrity and domain drift checks.

---

## 8. AI provider/router infrastructure

### Shared AI Router
- **Status:** ACTIVE
- **Authority:** `supabase/functions/_shared/ai-router.ts`
- **Purpose:** cost/quality routing, cost estimates, provider/model selection, telemetry.
- **Rule:** do not create another model-provider abstraction inside a new agent unless the Python agent runtime genuinely requires a separate adapter; preserve provider replaceability.
- **Audit requirement:** model IDs/pricing/current provider contracts must be independently reverified before material new dependency on a tier.

### AI-enabled Edge Functions currently represented in repo
- `diagnostic-calibration-tutor`
- `learning-socratic-tutor` (legacy)
- `prospecting-suggest-leads`
- `prospecting-discover-contact`
- `finance-advisor-prompt`
- `outreach-scanner`
- plus non-AI operational functions for certification/payments.

---

## 9. MCP / operator automation

### Supabase MCP server
- **Status:** ACTIVE/LEGACY-MIXED; requires least-privilege audit before becoming an Agent #1 tool surface.
- **Path:** `scripts/mcp-supabase-server.mjs`
- **Scope:** broad operator tools across pipeline, outreach logging, incidents, finance, priorities, learning, certification, guarantees, Stripe, and more.
- **Risk:** service-role-backed broad write surface; tool names/descriptions include actions with material side effects.
- **Rule:** do not expose this entire MCP server wholesale to an autonomous agent. Create or whitelist narrow least-privilege tools with explicit schemas and approval boundaries.

---

## 10. Observability and incident-learning primitives

### PostHog
- **Status:** ACTIVE telemetry primitive in product and AI router.

### Incident / iteration tooling
- **Status:** EXISTING operator capability in MCP/server/database paths.
- **Rule:** evaluate for reuse in agent failure taxonomy rather than inventing a second incident store.

### Agent-specific evals
- **Status:** EXPERIMENTAL
- **Location:** `evals/opportunity-scout/`
- **Rule:** agent improvements require regression evidence; deterministic graders preferred where possible.

---

## 11. Production, CI, and deployment truth

### Product Integrity CI
- **Status:** ACTIVE
- **Workflow:** `.github/workflows/product-integrity.yml`
- **Current guards:** typecheck, offer integrity, domain drift, diagnostic authority, intake truth, Stripe webhook boundary, payment state, scaffold provisioning, Agent Build Manifest gate, Training workflow tests, Training readiness tests.
- **Latest audited state:** green after Training/agent governance additions.

### Training production runbook
- **Status:** CANONICAL
- **Path:** `docs/runbooks/training-production.md`
- **Covers:** practice-vs-certification contract, live integrity rules, daily workflow, smoke tests, certification bank, migration warning, authenticated E2E acceptance sequence.

### General production runbook
- **Status:** ACTIVE but not sufficient alone for Training
- **Path:** `PRODUCTION_RUNBOOK.md`
- **Rule:** use the dedicated Training runbook for analyst calibration until the general runbook is consolidated.

### Deployment verification
- **Status:** database production integrity verified; application code merged to `main` with CI green; authenticated Cloudflare Pages E2E still required before saying application deployment is fully verified.
- **Constraint:** current tool environment has no Cloudflare deployment connector and cannot impersonate the user's Supabase browser session.

---

## 12. Conditional future agents

### Diagnostic & Delivery Copilot
- **Status:** CONDITIONAL EVOLUTION, NOT GREENFIELD AGENT
- **Boundary:** must integrate with canonical Diagnosis + Calibration + reasoning challenger. Human remains diagnostic authority until evidence justifies otherwise.

### Sales Conversation Agent
- **Status:** CONDITIONAL
- **Trigger:** enough real inbound/outreach conversations to define tools, permissions, evals, and economic value.

### Client Follow-up / Success Agent
- **Status:** CONDITIONAL
- **Trigger:** repeated post-sale workflow with measurable KPI and sufficient client volume.

---

## Mandatory pre-build questions for every future agent

A proposal cannot enter BUILD until it answers:

- Which existing capability already performs part of this outcome?
- Which canonical domain model/data source must it consume?
- Why is extension insufficient?
- What deterministic logic should run before a model?
- What tools and permissions are strictly necessary?
- What external actions require human approval?
- What state already exists that must not be duplicated?
- What eval set and ground truth will determine success?
- What business KPI and baseline will prove value?
- What production/runtime drift must be resolved first?

If any answer is unknown, the next action is discovery/audit, not implementation.
