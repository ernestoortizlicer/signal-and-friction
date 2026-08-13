# Agent #1 — Labeling Governance v0.1

**Status:** FROZEN v0.1 — reversible with evidence

## Why this exists

The founder is not yet a calibrated subject-matter expert in B2B SaaS website/funnel prospect qualification. Therefore founder labels must NOT be treated as ground truth simply because a human produced them.

The project must avoid a circular eval in which the same reasoning source designs the agent, creates all labels, and then declares the agent correct.

## Roles

### 1. Expert-seed labels

Early cases may be labeled by the technical/domain copilot using explicit public evidence and the current Signal and Friction methodology.

These labels are **PROVISIONAL**, not final ground truth.

They are used to:
- teach the founder the decision process;
- bootstrap rubrics and failure taxonomies;
- create initial implementation tests;
- surface ambiguity that needs better evidence.

### 2. Founder learning labels

The founder reviews worked cases after the expert analysis and explains:
- what evidence mattered;
- what was fact vs inference vs hypothesis;
- why a company was investigated or rejected;
- what claim would be unsafe to use in outreach.

Founder labels only become calibration-grade after repeated agreement with independently supported cases and demonstrated ability to explain the decision criteria.

### 3. Independent review

A second reviewer may review cases blind to the first label and record agreement/disagreement.

A second LLM (for example Claude) is useful as an independent critique source, but model-model agreement is NOT treated as objective ground truth because correlated model errors are possible.

### 4. Deterministic evidence

Where a claim can be checked mechanically, deterministic evidence outranks model judgment.

Examples:
- domain existence;
- seller self-reference;
- duplicate prospect;
- scan measurements;
- canonical offer catalog data;
- source URL existence;
- structured-output validity;
- no-send policy compliance.

### 5. Commercial outcomes

The strongest validation for prospect quality arrives downstream:
- human-approved opportunity;
- reply;
- positive reply;
- meeting booked;
- qualified meeting;
- proposal;
- paid engagement;
- measured client outcome.

These outcomes should be joined back to the original assessment so the qualification policy can be calibrated against economic reality rather than aesthetics.

## Label classes

Every case label must declare its authority:

- `deterministic_ground_truth`
- `expert_seed_provisional`
- `independent_review`
- `founder_calibrated`
- `commercial_outcome`

No case may silently move from `expert_seed_provisional` to ground truth.

## Learning loop

`expert worked example -> founder explanation -> critique -> new case -> independent review -> commercial outcome`

The objective is to transfer the decision model to the founder while simultaneously producing a defensible eval dataset.

## Decision rule

Until the founder is calibrated, the system should optimize for:

1. evidence correctness;
2. explicit uncertainty;
3. conservative qualification precision;
4. low human review time;
5. commercial outcomes.

Not for agreement with an untrained human label.
