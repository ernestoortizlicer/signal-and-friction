# Agent #1 — Baseline & Eval Seed Protocol v0.1

**Status:** FROZEN v0.1 — revise only after calibration evidence

**Purpose:** Establish the human/commercial ground truth and a defensible baseline before optimizing or claiming that the Opportunity Scout improves prospecting.

**Core rule:** Compare Agent #1 against the **current best non-agent workflow**, not against an artificially weak manual process.

---

## 1. Why this exists

Signal and Friction already has useful prospecting primitives: AI-suggested candidate discovery, deterministic Scan, contact discovery, prospect storage, and a canonical offer catalog. Therefore the baseline is NOT “a human with only Google and a blank document.”

The fair baseline is:

`CURRENT SYSTEM + HUMAN JUDGMENT`

versus later:

`CURRENT SYSTEM + OPPORTUNITY SCOUT + HUMAN REVIEW`

This prevents fake ROI.

---

## 2. Experimental sequence

Do not label 40 companies immediately under an unstable rubric.

### Batch 0 — rubric calibration

**3 real companies.**

Purpose:
- test whether the labels are understandable;
- discover missing fields;
- expose ambiguous qualification rules;
- calibrate what counts as evidence vs inference vs hypothesis;
- estimate realistic review time.

These 3 cases are calibration cases and SHOULD NOT become holdout cases.

### Batch 1 — baseline seed

**12 additional real companies.**

Purpose:
- establish first manual timing baseline;
- measure acceptance/rejection distribution;
- capture human reasoning patterns;
- find recurring disqualifiers and unknowns;
- produce the first usable agent-development cases.

After Batch 1, freeze the labeling rubric as v0.2 if necessary.

### Batch 2 — eval set expansion

Expand to **36 total labeled companies** once the rubric is stable.

Recommended split:
- 24 development/regression cases;
- 12 holdout cases not used while tuning prompts, tools, or qualification logic.

The split MUST preserve difficult/borderline cases rather than putting only easy examples in holdout.

---

## 3. Baseline workflow — what the human is allowed to use

The baseline must represent how Signal and Friction can operate TODAY without Agent #1.

Allowed:
- existing AI-suggested lead discovery;
- existing prospecting UI;
- existing deterministic Signal and Friction Scan;
- existing contact discovery;
- public web research;
- canonical offer catalog;
- normal human judgment;
- manual writing of the first-touch message.

Not allowed during baseline labeling:
- Agent #1 qualification output;
- Agent #1 service-fit recommendation;
- Agent #1 outreach draft;
- any future model-generated opportunity assessment that could anchor the human label.

This is a contamination rule: the human ground truth must be recorded before seeing the agent's judgment for the same case.

---

## 4. Unit of evaluation

One task = one candidate company/domain.

Task start:
> Candidate is surfaced and the human begins deciding whether it deserves commercial attention.

Task end:
> Human records one final decision and, if approved, has a usable first-touch package ready.

Final human decision:
- `approve_for_outreach`
- `needs_more_evidence`
- `reject`

This human decision is the commercial reference label. It is not automatically equivalent to the agent's internal `qualified_for_review` state.

---

## 5. Timing baseline

Record elapsed human time for every case.

Required timing fields:
- `candidate_discovery_seconds`
- `research_and_qualification_seconds`
- `contact_discovery_review_seconds`
- `outreach_drafting_seconds`
- `total_human_seconds`

If a tool is waiting on network/API latency while the human does no work, also record:
- `tool_wait_seconds`

Do not silently mix human labor time and machine wait time.

Primary productivity baseline:

`human_minutes_per_approved_opportunity = total human minutes across batch / number of approve_for_outreach cases`

Also retain per-case times so medians and tail cases can be inspected; averages alone can hide expensive failures.

---

## 6. Human labeling schema

For each company record:

### Identity
- `candidate_id`
- `company_name`
- `domain`
- `candidate_source`
- `reviewed_at`
- `labeler`

### ICP assessment
- `b2b_saas`: yes / no / unknown
- `self_serve`: yes / no / unknown
- `founder_led_or_small_team`: yes / no / unknown
- `independent_consultant_fit`: strong / moderate / weak / unknown
- `live_marketed_funnel`: yes / no / unknown
- `geography_fit`: yes / no / unknown

### Opportunity evidence
For each material item:
- evidence label: `MEASURED | OBSERVED | INFERRED | HYPOTHESIS | UNKNOWN`
- claim/observation
- source URL or Scan reference
- why it matters commercially

### Qualification judgment
- `friction_evidence_strength`: strong / moderate / weak / none
- `commercial_relevance`: strong / moderate / weak / unknown
- `timing_signal`: strong / moderate / weak / none / unknown
- `evidence_completeness`: sufficient / incomplete / insufficient
- `disqualifiers`: list
- `unknowns`: list

### Offer fit
- `entry_offer_candidate`
- `segment_candidate`: DWY / DFY / unknown
- `offer_fit_confidence`: high / medium / low
- `offer_fit_reason`

Important: selecting an offer is a hypothesis about the best entry point, not a diagnosis of the prospect's internal business.

### Contact
- `best_contact_name`
- `best_contact_role`
- `best_contact_channel`
- `contact_verification_status`
- `contact_source_url`
- `contact_usable`: yes / no / uncertain

### Outreach
If approved:
- `subject_or_opening`
- `first_touch_message`
- `evidence_used`
- `claims_deliberately_avoided`

### Final label
- `human_decision`: approve_for_outreach / needs_more_evidence / reject
- `decision_reason`
- `confidence`: high / medium / low

---

## 7. Rejection taxonomy

Do not store only “reject.” Capture WHY.

Initial categories:
- `not_b2b_saas`
- `not_self_serve`
- `too_large_or_mature`
- `too_early_or_no_live_funnel`
- `geography_outside_policy`
- `no_meaningful_opportunity_signal`
- `signal_exists_but_low_commercial_relevance`
- `poor_independent_consultant_fit`
- `contactability_problem`
- `insufficient_evidence`
- `conflicting_evidence`
- `other`

Multiple categories may apply.

This taxonomy is expected to evolve from observed cases. Do not invent dozens of categories before the data requires them.

---

## 8. Agent evals derived from the labels

Once Agent #1 runs on these same cases, grade it in layers.

### Layer A — deterministic / code-based
- schema validity;
- real candidate/domain grounding;
- cited source existence;
- no send action;
- canonical offer usage;
- evidence labels present;
- inferred/unknown states preserved;
- tool error handling;
- run cost;
- latency.

### Layer B — human-ground-truth comparison
- qualification agreement;
- precision on `qualified_for_review`;
- false-positive taxonomy;
- service-fit agreement;
- contact usefulness;
- unsupported material claim rate;
- outreach usefulness.

At this stage, optimize **precision before recall**. A small pipeline of defensible opportunities is more useful than a large list polluted with weak leads.

### Layer C — workflow economics
Compare:

`baseline human minutes per approved opportunity`

against

`agent-assisted human minutes per approved opportunity`

Also measure:
- agent/API/search cost per approved opportunity;
- human review time;
- percentage of drafts accepted unchanged / lightly edited / materially rewritten / rejected;
- rework caused by bad evidence or bad qualification.

### Layer D — commercial outcome, once outreach begins
- reply rate;
- positive reply rate;
- meeting-booked rate;
- qualified-meeting rate;
- proposal rate;
- revenue won;

Do not optimize the agent on revenue before there is enough real commercial data to make that signal meaningful.

---

## 9. Initial acceptance gates

Do not freeze arbitrary performance percentages before baseline data exists.

Hard gates from day one:
- 0 autonomous outreach actions;
- 0 fabricated company/domain identities;
- 0 knowingly fabricated sources;
- material claims must have evidence labels;
- Scan evidence must not be silently upgraded into diagnosis;
- inferred contact data must remain visibly inferred;
- offer identity/scope must come from the canonical catalog.

Numeric gates for qualification precision, human-time reduction, and cost per approved opportunity will be frozen only after Batch 1 establishes the baseline distribution.

---

## 10. Review discipline

For each case, the human reviewer should answer BEFORE looking at any future agent judgment:

1. Would I spend one of my limited outreach attempts on this company?
2. What exact evidence makes me say yes/no?
3. What would I need to know to change my decision?
4. Which statement in my reasoning is fact, inference, hypothesis, or unknown?
5. If yes, who should receive the first approach and why?
6. Which current Signal and Friction offer is the most credible entry point?
7. What claim must I avoid because I cannot support it?

The purpose is not to produce perfect prose. The purpose is to expose the decision procedure we later want the agent to reproduce.

---

## 11. Build gate

After Batch 0 (3 calibration cases):
- fix obvious rubric ambiguity only;
- do NOT tune Agent #1 yet.

After Batch 1 (12 baseline cases):
- freeze baseline statistics;
- freeze label rubric version;
- build the first Opportunity Scout loop;
- run it on development cases;
- inspect traces and failures;
- convert failures into evals;
- keep holdout untouched.

This is the gate from specification into implementation.

---

## 12. Economic truth rule

The first internal claim we want to be able to defend is NOT:

> “We built an AI prospecting agent.”

It is:

> “Using the same prospecting inputs and evidence standards, the agent reduced human work per approved commercial opportunity from X minutes to Y minutes at Z system cost, while maintaining an evidence/qualification quality threshold measured on a held-out set.”

Only after live outreach data exists do we extend that claim to meetings, pipeline, or revenue.
