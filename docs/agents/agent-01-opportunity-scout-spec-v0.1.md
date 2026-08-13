# Agent #1 — Signal and Friction Opportunity Scout

**Status:** FROZEN v0.1 — reversible only with evidence

**Purpose:** Internal dogfood first. Potentially productizable later only if repeated customer demand and economics justify it.

**Operating principle:** Find evidence-backed commercial opportunities and prepare a first-contact package. Do not send outreach autonomously in v0.1.

---

## 1. Outcome Contract

Given Signal and Friction's current ICP, canonical offer catalog, approved discovery sources, and a candidate company's public evidence, the Opportunity Scout must:

1. discover plausible companies;
2. verify that the company/domain is real;
3. gather observable evidence about the company and its funnel;
4. run the existing Signal and Friction technical Scan;
5. decide whether the company is worth human commercial attention;
6. explain the decision using cited evidence and explicit unknowns;
7. map the opportunity to the most plausible entry offer without inventing a diagnosis;
8. identify the best available decision-maker/contact candidate with provenance;
9. prepare a personalized first-touch draft;
10. stop for human approval before any external communication.

The system succeeds when it reduces the human work required to move from "search the market" to "review a small set of defensible opportunities with outreach ready" while maintaining a low unsupported-claim rate and measurable commercial yield.

---

## 2. Non-goals for v0.1

The agent MUST NOT:

- send email, LinkedIn messages, DMs, or any other outreach;
- reply to prospect messages;
- negotiate, quote custom pricing, or close deals;
- claim that a prospect has a business problem merely because a technical signal exists;
- fabricate revenue impact, conversion loss, budget, urgency, headcount, role, email, or identity;
- treat the Scan's technical score as purchase propensity;
- modify the canonical offer catalog;
- run multi-agent orchestration;
- build a CRM, dashboard platform, or generic sales-automation product.

These are explicit scope boundaries, not missing features.

---

## 3. Existing assets to reuse

The repository already contains useful primitives that SHOULD be reused rather than rebuilt:

### 3.1 Candidate discovery

`supabase/functions/prospecting-suggest-leads/index.ts`

Current behavior:

- runs grounded Tavily searches before model synthesis;
- asks the model to extract only companies present in fetched search results;
- cross-checks returned domains against real fetched search evidence;
- performs a lightweight domain fetch;
- returns suggestions ephemerally for review;
- does not automatically persist suggestions as real prospects.

### 3.2 Deterministic technical Scan

`functions/api/_scan.ts` and `functions/api/prospecting/scan.ts`

The prospecting path stores raw technical signals and a deterministic technical triage score. It deliberately separates measured signals from diagnosis and projected business impact.

### 3.3 Contact discovery

`supabase/functions/prospecting-discover-contact/index.ts`

Current behavior:

- searches/fetches real evidence first;
- returns person, LinkedIn, and email candidates with provenance;
- distinguishes `candidate`, `inferred`, and other verification states;
- cannot honestly produce independently `verified` identity/contact data with the providers currently configured.

### 3.4 Canonical offers

`src/lib/offer-catalog.ts`

The active commercial architecture is the canonical source for current DWY and DFY offers. Agent code must read/consume this source rather than duplicate product names, scope, or prices in prompts.

---

## 4. ICP policy — v0.1

The current discovery implementation encodes this ICP. For Agent #1 it is the provisional operational policy until commercial evidence justifies changing it:

- B2B SaaS;
- genuine self-serve signup/trial rather than demo-gated enterprise-only sales;
- founder-led or small-team company;
- small enough that an independent specialist is a plausible service provider;
- live product and active marketing/funnel preferred;
- current discovery geography emphasizes United States, Canada, Singapore, and other mature Asian SaaS hubs and excludes Europe.

Important: these are qualification inputs, not proof of buying intent.

Any future ICP change MUST be versioned and evaluated against the same held-out prospect set where possible.

---

## 5. Architecture decision

### v0.1 pattern

**One agent + narrow tools + explicit state + human approval.**

Do not build a multi-agent system.

Logical flow:

`DISCOVER -> VERIFY -> SCAN -> RESEARCH -> QUALIFY -> MAP OFFER -> DISCOVER CONTACT -> DRAFT -> HUMAN REVIEW`

The model may choose how to gather additional evidence within defined limits, but irreversible/external actions are not available as tools.

### Separation of concerns

Keep these layers separate:

- **workflow/orchestration** — sequence, stopping rules, retries;
- **model provider** — replaceable adapter;
- **tools** — deterministic or externally grounded capabilities;
- **state** — candidate and assessment records;
- **commercial knowledge** — ICP + canonical offers;
- **evaluation** — test cases and graders;
- **UI** — optional later; not required for the first working agent.

Initial implementation should optimize for an observable CLI/service workflow, not presentation.

---

## 6. Tool contracts

### Tool A — `discover_candidates`

**Purpose:** produce grounded candidate suggestions.

**Initial implementation:** wrap/reuse the existing `prospecting-suggest-leads` capability.

**Input:**

- ICP policy version;
- existing domains to exclude;
- optional batch size.

**Output per candidate:**

- company name;
- normalized domain;
- source URL(s);
- search evidence/snippet;
- lightweight domain verification result;
- discovery rationale constrained to evidence;
- provenance metadata.

**Failure behavior:** partial search-provider failure must be visible; no padding with invented companies.

---

### Tool B — `scan_candidate`

**Purpose:** obtain deterministic website/funnel signals.

**Initial implementation:** reuse the existing prospecting Scan path.

**Input:** candidate ID/domain.

**Output:**

- raw technical signals;
- technical score;
- score breakdown;
- scan timestamp;
- explicit provider/fetch errors.

**Critical rule:** output is triage evidence, NOT a diagnosis and NOT purchase intent.

---

### Tool C — `research_company`

**Purpose:** gather grounded commercial context not visible in the technical Scan.

**v0.1 source:** approved web-search provider already used by the project.

**Input:**

- company name;
- domain;
- research questions.

**Output:** evidence objects only:

- claim candidate;
- source URL;
- source snippet/excerpt;
- observed date if available;
- retrieval timestamp;
- evidence type;
- confidence/limitations.

The tool should prefer returning raw evidence over synthesizing a sales conclusion.

Research questions may include:

- Is the company actually B2B SaaS?
- Is self-serve signup/trial genuinely available?
- Is the company plausibly founder-led/small-team?
- Is the product live and actively marketed?
- Are there public signals of active acquisition/growth work, launch activity, or funnel relevance?
- Is there evidence that disqualifies the company?

---

### Tool D — `discover_contact`

**Purpose:** find the best available founder/CEO/decision-maker contact candidates.

**Initial implementation:** reuse `prospecting-discover-contact`.

**Output:** preserve provenance and verification status for every person, LinkedIn URL, and email.

**Critical rule:** inferred emails may be displayed to the reviewer but MUST NOT be treated as verified and MUST NOT be auto-used for outreach.

---

### Tool E — `load_offer_catalog`

**Purpose:** expose the current canonical Signal and Friction offers to the agent.

**Input:** none or segment filter.

**Output:** current offer identity, segment, scope, billing type, price, version/hash.

**Critical rule:** no offer names, prices, or scopes hardcoded in the agent prompt if they can be loaded from the canonical catalog.

---

### Tool F — `save_opportunity_assessment`

**Purpose:** persist model judgment separately from measured technical signals.

**New capability required.**

Do NOT overload `prospect_candidates.technical_signals` or `technical_score` with model-generated judgment.

Store at minimum:

- candidate ID;
- assessment version;
- model/provider/version;
- prompt/instruction version;
- ICP policy version;
- offer catalog version/hash;
- qualification decision;
- qualification dimensions;
- evidence references;
- unknowns;
- disqualifiers;
- service-fit hypothesis;
- recommended contact candidate;
- outreach draft;
- run cost/tokens/latency;
- human review outcome;
- timestamps.

---

## 7. Qualification contract

Do not begin with an arbitrary single 0–100 "AI lead score". The repository already has one deterministic technical score for a narrow purpose. A second opaque score would create false precision.

### Hard gates

A candidate cannot be `qualified` unless all of the following are supported:

1. real operating company/domain;
2. plausible B2B SaaS product;
3. live funnel relevant to Signal and Friction's work;
4. ICP scale/operating-model fit is supported or at least not contradicted;
5. at least one meaningful, observable opportunity signal exists;
6. no material disqualifier is known;
7. every material claim used in the recommendation has evidence or is explicitly marked `unknown`/`hypothesis`.

### Assessment dimensions

Record separately, using explicit evidence:

- `icp_fit`: strong / moderate / weak / unknown;
- `friction_evidence_strength`: strong / moderate / weak / none;
- `commercial_relevance`: strong / moderate / weak / unknown;
- `timing_signal`: strong / moderate / weak / none / unknown;
- `contactability`: strong / moderate / weak / unknown;
- `evidence_completeness`: sufficient / incomplete / insufficient;
- `disqualifiers`: list;
- `unknowns`: list.

### Final decision

One of:

- `qualified_for_review`
- `needs_more_evidence`
- `not_qualified`

The agent does not mark a company "ready to contact" by itself. Human review determines that.

---

## 8. Evidence policy

Every material statement must carry one of these labels:

- **MEASURED** — directly measured by our deterministic tooling;
- **OBSERVED** — directly present in a retrieved public source;
- **INFERRED** — reasoned from evidence; must state the inference;
- **HYPOTHESIS** — commercially plausible but unconfirmed;
- **UNKNOWN** — evidence not available.

Rules:

- MEASURED/OBSERVED may support qualification directly.
- INFERRED may support a hypothesis but cannot be silently promoted to fact.
- HYPOTHESIS is acceptable in an outreach angle only if worded as a question/observation rather than a claim about the prospect's internal business.
- UNKNOWN must remain visible; the agent may not fill gaps from model memory.

---

## 9. Opportunity package — structured output

Each completed run should return a machine-valid object equivalent to:

```json
{
  "candidate": {
    "company_name": "",
    "domain": "",
    "source_urls": []
  },
  "qualification": {
    "decision": "qualified_for_review | needs_more_evidence | not_qualified",
    "icp_fit": "strong | moderate | weak | unknown",
    "friction_evidence_strength": "strong | moderate | weak | none",
    "commercial_relevance": "strong | moderate | weak | unknown",
    "timing_signal": "strong | moderate | weak | none | unknown",
    "contactability": "strong | moderate | weak | unknown",
    "evidence_completeness": "sufficient | incomplete | insufficient",
    "disqualifiers": [],
    "unknowns": []
  },
  "evidence": [
    {
      "label": "MEASURED | OBSERVED | INFERRED | HYPOTHESIS | UNKNOWN",
      "claim": "",
      "source_url": null,
      "source_ref": null,
      "retrieved_at": ""
    }
  ],
  "scan": {
    "technical_score": null,
    "breakdown_ref": null,
    "scanned_at": null
  },
  "service_fit": {
    "entry_offer": null,
    "segment": null,
    "reasoning_summary": "",
    "confidence": "high | medium | low"
  },
  "contact": {
    "person_name": null,
    "role": null,
    "channel": null,
    "address_or_url": null,
    "verification_status": null,
    "source_url": null
  },
  "outreach": {
    "subject": null,
    "message": null,
    "evidence_used": [],
    "claims_to_avoid": []
  },
  "review": {
    "required": true,
    "status": "pending"
  }
}
```

Exact implementation schema may evolve, but v0.1 must preserve the semantic separation above.

---

## 10. Human approval boundary

A human must approve before:

- any first contact;
- using an inferred email address;
- changing an offer recommendation into a commercial proposal;
- promoting an opportunity into a real client/sales stage where that action has external consequences.

For v0.1, the agent has no send tool at all. This is stronger than relying on a prompt instruction not to send.

---

## 11. Observability contract

Every run must record enough information to reproduce and evaluate it:

- run ID;
- candidate ID/domain;
- timestamp;
- model provider + model/version;
- system/instruction version;
- tool schema/version;
- every tool call and tool result/reference;
- retries/timeouts/errors;
- structured final output;
- token usage where available;
- model/API/search cost where available;
- end-to-end latency;
- human review decision;
- human corrections;
- downstream commercial outcome when it exists.

Do not log secrets or unnecessary personal data.

---

## 12. Evaluation plan

### 12.1 Build the dataset before optimizing prompts

Initial dataset target: 30–40 real companies, manually labeled.

Include:

- clear ICP fits;
- clear non-fits;
- borderline scale cases;
- demo-gated SaaS that looks self-serve at first glance;
- dead/parked/rebranded domains;
- companies with clean Scan results but poor commercial fit;
- companies with bad technical signals but poor service fit;
- JS-rendered sites that produce `undetermined` signals;
- missing/ambiguous founder/contact information;
- conflicting sources.

Keep a holdout subset that is not used while tuning instructions/tools.

### 12.2 Prefer deterministic graders

Measure first:

- valid structured output;
- domain/source grounding;
- citation/source existence;
- unsupported material claim count;
- correct preservation of `unknown`/`inferred` states;
- correct no-send behavior;
- correct use of canonical offer data;
- tool errors/retries;
- cost and latency.

Use human labels for:

- qualification correctness;
- usefulness of the commercial rationale;
- service-fit correctness;
- outreach relevance and credibility.

LLM judges, if used, must be calibrated against human labels and must not be the sole source of truth for critical claims.

### 12.3 v0.1 acceptance hypotheses

These are initial engineering targets, not established facts:

- zero fabricated company/domain/source identities in the eval set;
- zero autonomous outreach actions;
- near-zero unsupported material claims;
- qualification precision high enough that human review is materially faster than manual research;
- measurable reduction in human minutes per accepted opportunity;
- cost per accepted opportunity low enough to preserve attractive service economics.

Numeric targets for precision, time, and cost should be frozen only after the first manual baseline is measured.

---

## 13. Economic baseline

Before claiming ROI, measure a manual baseline on the same type of task.

For at least the first 10–20 opportunities, record:

- minutes to find a candidate manually;
- minutes to research/qualify;
- minutes to find the right contact;
- minutes to draft outreach;
- total human minutes;
- tool/search/API cost;
- accepted vs rejected after review;
- later: replies, positive replies, meetings, qualified meetings, proposals, revenue.

Primary internal productivity metric:

`human minutes per human-approved opportunity`

Secondary system metrics:

- agent cost per human-approved opportunity;
- qualification precision;
- evidence error rate;
- contact discovery success;
- first-touch draft acceptance/edit distance.

Business metrics, measured later:

- positive reply rate;
- meeting-booked rate;
- qualified-meeting rate;
- pipeline created;
- revenue won.

Do not confuse agent-quality metrics with go-to-market outcomes.

---

## 14. Security and reliability

- least privilege for every tool;
- no external send capability in v0.1;
- secrets only in environment/secret management, never prompts/traces;
- search/web content is untrusted input and may contain prompt injection;
- retrieved pages cannot override system instructions or tool policy;
- validate all tool inputs/outputs with schemas;
- timeouts on network calls;
- bounded retries with backoff where appropriate;
- explicit provider errors rather than plausible fallback data;
- idempotent/reversible internal writes where possible;
- retain provenance for every evidence item.

---

## 15. Build sequence

### Phase 0 — baseline and eval seed

1. Manually label the first 10–20 companies.
2. Measure manual research + qualification + outreach-prep time.
3. Freeze the first eval rubric.

### Phase 1 — minimal executable agent

1. Python runtime / explicit orchestration skeleton.
2. Structured output schema.
3. Tool adapters for discovery, Scan, research, contact discovery, and offer catalog.
4. Trace/logging layer.
5. One candidate end-to-end from discovery to pending human review.

### Phase 2 — eval harness

1. 30–40-company dataset.
2. Deterministic graders.
3. Human-labeled qualification/service-fit rubric.
4. Regression set + holdout.

### Phase 3 — controlled dogfood

1. Run batches internally.
2. Human approves/rejects/corrects each opportunity.
3. Send outreach manually outside the agent.
4. Capture commercial outcomes.

### Phase 4 — expand only with evidence

Potential upgrades only if data supports them:

- automatic internal candidate queueing;
- richer identity/contact verification provider;
- CRM integration;
- automated first-touch send after trusted approval controls;
- reply-drafting workflow;
- productization for external customers.

---

## 16. Stop / revisit conditions

Revisit or kill the current design if any of these persist after a representative dogfood cycle:

- qualification precision is too low to save human time;
- discovery produces mostly weak/irrelevant ICP candidates;
- evidence collection cannot reliably support the outreach angle;
- contactability is the dominant bottleneck and cannot be solved economically;
- API/search cost is high relative to the value of a qualified opportunity;
- a horizontal prospecting product performs materially better/cheaper for the same outcome;
- Signal and Friction's commercial ICP or offer architecture changes materially.

---

## 17. Decision log entry

**DATE:** 2026-08-13  
**QUESTION:** What exactly should Agent #1 do?  
**EVIDENCE:** Existing grounded lead-suggestion function, deterministic Scan, contact-discovery function, canonical offer catalog, current prospecting table design.  
**OPTIONS:** Full autonomous sales agent; multi-agent sales system; narrow opportunity-scout agent; no agent.  
**DECISION:** Build one narrow Opportunity Scout that discovers, researches, qualifies, maps service fit, finds contact candidates, and drafts first-touch outreach; require human approval before external action.  
**CONFIDENCE:** High for v0.1 scope; medium for current ICP until real outreach economics are measured.  
**COST:** Low-to-moderate; maximizes reuse of current primitives and creates reusable agent-engineering skills.  
**REVERSIBLE?:** Yes.  
**REVISIT CONDITION:** Eval/dogfood evidence shows the workflow does not save time, does not produce commercially useful opportunities, or another architecture materially outperforms it.
