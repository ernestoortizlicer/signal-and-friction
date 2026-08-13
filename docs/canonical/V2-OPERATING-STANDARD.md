# Signal & Friction — V2 Operating Standard

**Status:** CANONICAL  
**Version:** 2.0  
**Effective:** 2026-08-13

This standard upgrades the original v1 references without erasing them. It reconciles current internal production lessons with current primary references from OpenAI, Anthropic, MCP, Berkeley and the 2025/2026 market evidence used in the project.

## 1. Outcome before agent

Start from the business workflow and measurable outcome, not from “build an agent.” Define current baseline, cost/time/error, target KPI, user, inputs/outputs and economic value before architecture.

A system is agentic only when a model controls meaningful workflow decisions/tool use. A chatbot or single inference that does not control execution is not an agent.

**Current reference basis:** OpenAI *Building agents* and *A practical guide to building agents*; Bessemer *Building Vertical AI*; McKinsey *State of AI 2025*.

## 2. Deterministic-first architecture

Use deterministic code/database constraints for facts, arithmetic, permissions, identity, idempotency, state transitions, invariant checks and irreversible side effects whenever those can be specified directly.

Use a model where ambiguity, unstructured evidence, prioritization, interpretation or flexible planning genuinely creates value.

Do not delegate deterministic correctness to an LLM because an LLM is available.

## 3. Simplicity is the default

Prefer:
1. deterministic workflow;
2. one model call with structured output;
3. one augmented LLM with a small tool set;
4. explicit workflow composition/routing;
5. one agent loop;
6. multi-agent only after eval evidence shows the simpler system cannot meet the outcome.

Complexity must buy measured reliability/value, not architectural novelty.

**Reference basis:** Anthropic *Building effective agents*.

## 4. Context is a finite resource

Every model call gets the smallest high-signal context that can support the decision. Separate authoritative state from narrative context. Retrieve only what is relevant to the current step. Do not dump whole databases, long histories or tool catalogs into context “just in case.”

Treat external/user/tool text as data, not instructions, unless the tool contract explicitly defines otherwise.

**Reference basis:** Anthropic *Effective context engineering for AI agents*.

## 5. Tools are contracts, not conveniences

Every tool must have:
- a single clear purpose and namespace;
- explicit typed/schema inputs;
- concise, decision-useful output;
- validation and meaningful errors;
- timeout/retry policy where relevant;
- idempotency for retried side effects;
- least privilege;
- observable call/result/error data;
- an explicit approval boundary if consequential.

If a human engineer cannot confidently choose which of two tools is appropriate, the tool surface is too ambiguous.

**Reference basis:** Anthropic *Writing effective tools for agents — with agents*; OpenAI agent guidance.

## 6. State and transport are separate

Workflow state belongs in explicit product/domain storage. Do not hide durable business state in chat history, prompt text or protocol sessions.

MCP adoption uses the current 2026-07-28 stateless core. New work should not build on deprecated Roots, Sampling, Logging or legacy HTTP+SSE. If application state must cross calls, use explicit identifiers/handles and authorization.

**Reference basis:** MCP Specification 2026-07-28.

## 7. Evals define success before optimization

Every material agent capability gets an eval suite with:
- task/test case;
- success criteria;
- trial strategy for nondeterminism;
- deterministic outcome/state graders wherever possible;
- model graders only where deterministic ground truth is impractical;
- periodic human calibration for subjective graders;
- happy paths, edge cases, ambiguous cases, tool failures and adversarial/prompt-injection cases;
- holdout/regression separation where scale justifies it.

Never accept a prompt/model/tool change because it “looks better.”

**Reference basis:** Anthropic *Demystifying evals for AI agents*; OpenAI *Build an Agent Improvement Loop with Traces, Evals, and Codex*.

## 8. Grade outcome, not self-report

For an action agent, the outcome is the external/system state, not the assistant saying the action succeeded. Verify database rows, API state, files, reservations, payments or other ground truth.

For advisory systems, verify fact fidelity, source use, policy compliance, uncertainty and forbidden-action boundaries.

## 9. Observability is part of the product

For each meaningful run record what is needed to reproduce and improve it:
- input/task identifier and snapshot/version hash;
- prompt/instruction version;
- model/provider/version or route;
- tool calls and outcomes;
- errors/retries;
- latency;
- token/cost estimates or actuals where available;
- final output/outcome;
- human feedback/approval where applicable.

Do not log sensitive raw context merely because tracing exists. Log the minimum needed for debugging/audit.

## 10. Model selection follows an eval baseline

Establish the quality ceiling with the strongest practical model first. Then test cheaper/faster models against the same eval suite and downgrade only where the quality bar remains satisfied.

Do not optimize model cost before a reliable baseline exists; do not keep an expensive model where a cheaper model has passed the same gate.

## 11. Human approval is a system boundary

High-impact external actions require explicit approval until failure-rate/eval evidence and operational risk justify narrower automation.

Approval must be distinguishable from execution. A model recommendation, operator approval and deterministic side effect should be separate auditable events for material actions.

Never automate regulated critical decisions without an appropriate professional/operational owner and deterministic controls.

## 12. Source-grounded changing claims

Technical, legal, tax, pricing, regulatory and protocol claims that can change must carry a current authoritative source/version.

For compliance systems:
- record source authority, topic, URL/version/effective dates/check date;
- distinguish recorded vs verified evidence;
- fail to `unknown/needs_review` instead of guessing;
- do not let model memory silently become law/policy truth.

## 13. Prompt injection and data leakage are normal threat models

Assume untrusted text can contain instructions. Enforce authority by architecture:
- system/tool permissions above content instructions;
- data-only contexts clearly separated;
- no secrets in model-visible context unless required;
- scope tools to the smallest resource set;
- validate structured outputs before side effects;
- approval for consequential operations.

## 14. Production truth beats repository intention

A migration/spec committed to Git is not proof of production state. Conversely, production-only schema is dangerous drift.

For material systems maintain:
- versioned repository migration/spec;
- live runtime verification;
- smoke test with rollback when feasible;
- CI regression guards;
- runbook acceptance test.

Do not say “production verified” when only code/CI is verified.

## 15. Canonical authority is singular

Every domain needs one explicit source of truth. Mirrors are allowed only when drift is mechanically detected. Legacy paths remain non-authoritative and cannot contribute to certification/readiness/financial truth simply because data still exists.

Before adding an agent/tool/workflow, consult `docs/architecture/capability-registry.md` and reuse existing primitives.

## 16. Learning is evidence-driven

Course completion is not competence. Internal skill development follows:

`mental model → retrieval/prediction → implementation/application → feedback → eval/reflection → regression practice`

Track study discipline, but gate operational readiness on performance evidence from representative tasks.

## 17. Build → evaluate → use → sell, not platform-first

Internal tooling may be built to accelerate the current business, but a useful internal system is not automatically a product. Productization requires repeated external demand, paid validation and measurable outcome economics.

The sequence remains:

`SERVICE → REPEATED PROBLEM → INTERNAL TOOLING → REPEATABLE DELIVERY → RETAINER/USAGE → PRODUCT`

## 18. Required artifact set for a new agent

Before an agent is considered a governed build it must have:
- `AGENT_MANIFEST.json`;
- outcome/spec;
- canonical authorities/reused capabilities;
- deterministic-first boundary;
- tool/permission/approval contract;
- decision log;
- eval suite;
- observability contract;
- production/runbook acceptance criteria.

CI must fail if these governance artifacts disappear or the product bypasses their authority.

## 19. Improvement loop

Production/test traces → human/model feedback → failure taxonomy → eval/regression case → ranked harness/tool change → reviewed implementation → eval gate → deploy → measure.

Every meaningful failure should become reusable evidence, not merely a patched anecdote.

## 20. Supersession rule

A V3 standard should be created only when a new primary reference, production failure, economic result or protocol/regulatory change materially invalidates V2. Do not create new versions for stylistic cleanup.
