# Canonical Source Registry v2 — AI Workflow / Agent Engineering

**Status:** CANONICAL SOURCE POLICY v2
**Frozen:** 2026-08-13
**Purpose:** Keep training, architecture decisions, implementation claims, and market claims anchored to the strongest available source for the kind of statement being made.

This registry does **not** declare every older source obsolete. It changes the authority hierarchy. A durable design paper may remain useful for principles while a live protocol/API claim must come from current official documentation.

## Authority hierarchy

1. **Tier 0 — Normative/live authority**
   - Current protocol specification.
   - Current provider/API/SDK documentation.
   - Official repository/release notes for version-specific behavior.
   - Current regulator/statistical authority for legal, market, or adoption facts.
2. **Tier 1 — Primary engineering guidance / original research**
   - Provider engineering articles with concrete design/eval methodology.
   - Original papers and university course material for concepts.
3. **Tier 2 — Market/economic evidence**
   - Primary statistics first; high-quality industry reports second.
   - Useful for opportunity selection, never as runtime/API truth.
4. **Tier 3 — Secondary commentary**
   - Discovery only. Never the sole basis for a consequential technical, legal, financial, or market decision.

## Canonical engineering set

### MCP
**LIVE AUTHORITY:** Model Context Protocol Specification `2026-07-28` and Tier-1 SDK documentation.
- Stateless protocol core.
- No mandatory initialize/initialized session handshake in the new core.
- MRTR, header-based routing, cacheable list results, authorization hardening, extensions framework.
- TypeScript, Python, Go and C# are Tier-1 SDKs for this spec.

**Rule:** Any pre-2026 MCP tutorial is concept material only if it conflicts with `2026-07-28`.

### OpenAI agent stack
**LIVE AUTHORITY:** current OpenAI API docs + current Agents SDK docs/repository/release notes.
- Responses API/tool use and Agents SDK are live implementation authorities.
- April 2026 Agents SDK evolution adds controlled sandbox support for longer-horizon file/command/code workflows.
- Evals API/current eval documentation is live authority for OpenAI-specific eval interfaces.

**STILL CANONICAL FOR DESIGN PRINCIPLES:**
- `A practical guide to building agents` — decision criteria, model/tools/instructions, guardrails, human escalation.
- `Building agents` learning material — agent vs non-agent mental model.

**Rule:** The practical guide is not version authority for model IDs, SDK signatures, API fields, pricing, limits, or current tool availability.

### Anthropic agent engineering
**CANONICAL PRIMARY GUIDANCE:**
- `Building effective agents` (2024-12-19) — start simple; workflows vs agents; complexity/cost/latency tradeoff.
- `Effective context engineering for AI agents` (2025-09-29) — context as finite resource; high-signal context; prompt/context discipline.
- `Writing effective tools for AI agents—using AI agents` (2025-09-11) — tools as contracts; realistic evals; outcome verification; token/context efficiency.
- `Demystifying evals for AI agents` (2026-01-09) — task/trial/grader/trace/outcome/suite model; multiple trials; outcome-first grading.

**Rule:** Recheck live Anthropic API/tool documentation before implementing provider-specific request fields, model IDs, tool contracts, pricing, or limits.

### Agent concepts / academic grounding
**CANONICAL CONCEPT SOURCE:** Berkeley CS 194/294-196 Large Language Model Agents.
- Reasoning, planning, tool use, retrieval, agent infrastructure, evaluation, privacy/safety, human-agent interaction, multi-agent systems.

**Authority boundary:** academic/conceptual grounding, not current provider/runtime authority.

## Canonical evaluation policy

Use the following order of preference:
1. External/deterministic ground truth and real environment outcome.
2. Code/rule graders.
3. Calibrated model graders when deterministic truth is unavailable.
4. Human expert adjudication for ambiguous/high-stakes cases.

Required eval metadata for material agent runs:
- input / task id;
- output/outcome;
- trace/tool calls;
- model/provider/version/config;
- grader/version;
- errors/retries;
- cost/tokens/latency;
- human intervention;
- final external state when applicable.

A model saying "done" is never proof that a workflow outcome occurred.

## Canonical tool policy

A tool is a typed capability boundary, not a prompt convenience.
Required where relevant:
- explicit schema;
- narrow permissions;
- validation;
- timeouts;
- retries with bounded policy;
- idempotency for retryable writes;
- structured errors;
- outcome verification;
- observability;
- human approval before material irreversible action.

Do not expose a broad service-role MCP/tool surface wholesale to an autonomous agent.

## Market / business evidence set

### Bessemer — Building Vertical AI (2026)
**Use for:** workflow economics, vertical-AI opportunity shape, specific workflow before technology thesis, labor-budget capture, repeatability/ROI.
**Do not use for:** API/runtime facts.

### McKinsey — State of AI Global Survey 2025
**Use for:** enterprise-adoption context and the importance of workflow redesign.
**Do not use for:** claims that a particular company/market will buy or that agents are already scaled in a given workflow.

### Current official market statistics
For market-entry decisions, prefer current official national/EU/OECD statistics over consultancy summaries when comparable data exists.
Examples in the 2026 market review include Eurostat, U.S. Census Bureau, Statistics Canada, Singapore IMDA, UK DSIT/ONS, and Australian Bureau of Statistics.

## Finance / regulated-domain source policy

Finance OS has a separate evidence hierarchy:
1. Ledger/database state for internal financial facts.
2. Official authority source for a jurisdictional rule or deadline.
3. Professional verification for individualized tax/legal conclusions when required.
4. Current regulator authority for investment-advice perimeter.

A general model, blog, forum, or remembered tax rule cannot promote an obligation to verified status.

Personalized securities recommendations are outside the autonomous Finance Agent scope unless a separately approved regulatory/licensing operating model exists. Education, scenario analysis, liquidity/concentration reasoning, bookkeeping, evidence tracking, and human-approved policy comparison remain inside the intended boundary.

## Source freshness contract

Before relying on a source for a material implementation or decision:
- record source title/authority;
- record publication/spec/version date;
- classify `normative | implementation | design | market | regulatory`;
- record last-checked date;
- state what claim it is allowed to support;
- set a revisit condition when the source is likely to change.

**Recheck immediately** for model IDs, pricing, API fields, SDK behavior, protocol versions, regulation, tax rules, market statistics, and product availability.

## What changed from v1

- MCP `2026-07-28` is explicitly the live protocol authority.
- Current OpenAI API/Agents SDK/evals documentation outranks static agent guides for implementation details.
- Static provider guides remain canonical for durable design principles, not current API truth.
- Evaluation authority is outcome-first and ground-truth-first.
- Market reports and engineering sources are separated into different evidence classes.
- Finance/legal evidence has its own fail-closed hierarchy.
- Every material source now has an explicit claim boundary and freshness rule.

## Decision

The uploaded v1 library is preserved as a high-quality conceptual/design corpus. v2 is the **authority and freshness layer around it**. Future training content should cite the strongest source class available rather than treating every document in the library as equally authoritative.
