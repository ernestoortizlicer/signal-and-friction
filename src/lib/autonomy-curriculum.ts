/**
 * Autonomy curriculum — the educational architecture behind DWY Autonomy
 * Kit and DFY Autonomy Kit. Phase 6.3, Section FOUR.
 * ════════════════════════════════════════════════════════════════════════════
 * "The architecture exists. The content does not." Before this file,
 * delivery-policy.ts already declared that Autonomy is the tier where
 * founderLearningModules/checklist (DWY) or teamRunbook/handoffDocumentation
 * (DFY) are "required" — but the actual instructional content was 100%
 * per-client hand-authored prose (see fallback.ts's COMMAND_CENTER_GUIDE
 * and ACME_FALLBACK). A client whose analyst hadn't yet hand-written that
 * prose saw an honest "hasn't been added yet" pending state instead of a
 * product. This file is the structural, reusable curriculum that closes
 * that gap: a typed, testable capability-transfer framework, not prose.
 *
 * Client-safety boundary (constitutional, not a preference):
 *   - Teaches the SAME six-mechanism vocabulary already public in
 *     fallback.ts's FrictionMechanism type and rendered on /scan — never
 *     the internal analyst registry in src/domain/reasoning/mechanisms.ts
 *     (academic references, evidence-strength badges, misinterpretation
 *     notes, diagnostic question banks — all analyst-only).
 *   - Teaches the SAME six-layer epistemic method already public in every
 *     deliverable (evidence → observation → behavioral hypothesis →
 *     judgment → recommendation → unknowns) — the method itself, not the
 *     registry that method is applied against.
 *   - Every exercise scenario is a generic, hypothetical situation, never
 *     a real client case (that's what a Loom review IS for — see
 *     ADMIN_ANALYST_NOTE below — never something this file fabricates).
 *   - Transfers a repeatable DISCIPLINE. Never transfers the proprietary
 *     mechanism library or the analyst's own calibration for weighing one
 *     hypothesis against another.
 *
 * Pure data + pure converter functions, no JSX — same discipline as
 * delivery-policy.ts and monitoring-comparison.ts, testable via plain
 * node (see autonomy-curriculum.test.mjs).
 */

// ── Shared vocabulary ────────────────────────────────────────────────────

// Matches fallback.ts's FrictionMechanism exactly (duplicated, not
// imported — src/lib stays independent of src/app/deliverable, the same
// direction-of-dependency discipline used throughout this codebase).
export type CurriculumMechanism =
  | "cognitive_load"
  | "trust_deficit"
  | "commitment_anxiety"
  | "ordering_error"
  | "identity_friction"
  | "value_uncertainty"
  | "cross_cutting"; // the method itself, not any one mechanism

export interface LearningStage {
  id: string;
  title: string;
  objective: string;
  prerequisiteStageId: string | null;
}

export interface FrameworkModule {
  id: string;
  title: string;
  mechanism: CurriculumMechanism;
  whatItTeaches: string;
  whenToSuspectIt: string;
}

export interface CurriculumTemplate {
  id: string;
  title: string;
  purpose: string;
  fields: string[];
}

export interface ChecklistDefinition {
  id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly" | "quarterly" | "per-change";
  items: string[];
}

export interface DecisionTreeBranch {
  condition: string;
  outcome: string;
  nextNodeId?: string;
}

export interface DecisionTreeNode {
  id: string;
  question: string;
  branches: DecisionTreeBranch[];
}

export interface DecisionTree {
  id: string;
  title: string;
  entryNodeId: string;
  nodes: DecisionTreeNode[];
}

export interface ReviewCadenceItem {
  frequency: "weekly" | "monthly" | "quarterly";
  activity: string;
  purpose: string;
}

export interface CurriculumExercise {
  id: string;
  title: string;
  scenario: string; // always hypothetical — never a real client case
  task: string;
  successLooksLike: string;
}

export interface CaseReviewMethodology {
  steps: string[]; // ordered
  requiredArtifacts: string[];
}

export interface QualityControlRule {
  id: string;
  rule: string;
  failureMode: string;
}

export interface OperationalRhythmItem {
  cadence: string;
  activity: string;
}

export interface EscalationRule {
  trigger: string;
  action: string;
  escalateTo: "Signal & Friction analyst" | "internal team lead" | "no escalation needed";
}

export interface CommonMistake {
  mistake: string;
  whyItHappens: string;
  correction: string;
}

export interface SuccessCriterion {
  criterion: string;
  howMeasured: string;
}

export interface ClientIndependenceCriterion {
  criterion: string;
  evidenceRequired: string;
}

export interface AutonomyCurriculum {
  audience: "founder" | "internal-team";
  mission: string;
  learningProgression: LearningStage[];
  frameworkProgression: FrameworkModule[];
  templates: CurriculumTemplate[];
  checklists: ChecklistDefinition[];
  decisionTrees: DecisionTree[];
  reviewCadence: ReviewCadenceItem[];
  exercises: CurriculumExercise[];
  caseReviewMethodology: CaseReviewMethodology;
  qualityControl: QualityControlRule[];
  operationalRhythm: OperationalRhythmItem[];
  escalationRules: EscalationRule[];
  commonMistakes: CommonMistake[];
  successCriteria: SuccessCriterion[];
  clientIndependenceCriteria: ClientIndependenceCriterion[];
}

// ── DWY Autonomy Kit — the founder runs the method solo ─────────────────

export const DWY_AUTONOMY_CURRICULUM: AutonomyCurriculum = {
  audience: "founder",
  mission:
    "Give the founder the Signal & Friction evidence-to-judgment method in a repeatable form they can run themselves on any future page or funnel change — not a one-time fix, a durable discipline.",
  learningProgression: [
    { id: "s1", title: "See only what's measured", objective: "Separate a measured number from an assumption before doing anything else with it.", prerequisiteStageId: null },
    { id: "s2", title: "Name the friction type", objective: "Use the six-mechanism vocabulary to describe what's happening in plain language, not vague dissatisfaction.", prerequisiteStageId: "s1" },
    { id: "s3", title: "State a hypothesis, not a fact", objective: "Write 'this suggests' instead of 'this proves' until it's actually been tested.", prerequisiteStageId: "s2" },
    { id: "s4", title: "Choose one fix, name the tradeoff", objective: "Pick a single change and write down what it costs before shipping it.", prerequisiteStageId: "s3" },
    { id: "s5", title: "Say what you don't know", objective: "Close every diagnosis with an explicit unknowns line instead of implying full certainty.", prerequisiteStageId: "s4" },
  ],
  frameworkProgression: [
    { id: "f-cog", title: "Cognitive Load", mechanism: "cognitive_load", whatItTeaches: "Too many decisions, too early. A visitor abandons not because the offer is bad but because deciding is expensive.", whenToSuspectIt: "A form or page has many fields or options, and time-on-step is long relative to how simple the step looks." },
    { id: "f-trust", title: "Trust Deficit", mechanism: "trust_deficit", whatItTeaches: "The visitor isn't yet sure this is real or safe. Absence of proof, not absence of interest.", whenToSuspectIt: "No badges, testimonials, or third-party validation near the point where money or personal data is requested." },
    { id: "f-commit", title: "Commitment Anxiety", mechanism: "commitment_anxiety", whatItTeaches: "The ask feels bigger than the visitor is ready for at that point in the journey.", whenToSuspectIt: "A large commitment (payment, long signup, phone call) is requested before value has been demonstrated." },
    { id: "f-order", title: "Ordering Error", mechanism: "ordering_error", whatItTeaches: "The right question, asked at the wrong moment, reads as friction even if the question itself is reasonable.", whenToSuspectIt: "Reordering the same steps, with nothing else changed, would plausibly change the outcome." },
    { id: "f-id", title: "Identity Friction", mechanism: "identity_friction", whatItTeaches: "The page doesn't feel like it was built for this visitor's specific situation.", whenToSuspectIt: "One traffic segment converts noticeably worse than another on an otherwise identical page." },
    { id: "f-value", title: "Value Uncertainty", mechanism: "value_uncertainty", whatItTeaches: "The visitor can't yet tell whether this is worth what it costs.", whenToSuspectIt: "Drop-off clusters right at or just before the price or scope is shown." },
  ],
  templates: [
    { id: "t-evidence", title: "Evidence Log", purpose: "Force every number into an explicit tier before it's used in a decision.", fields: ["signal", "value", "source", "date measured", "tier: measured / modeled / pending"] },
    { id: "t-hypothesis", title: "Hypothesis Note", purpose: "Keep a candidate explanation clearly separate from a proven cause.", fields: ["observation", "candidate mechanism", "confidence (low/med/high)", "what would rule this out"] },
    { id: "t-decision", title: "Decision Record", purpose: "Make the tradeoff visible before shipping, not just the upside.", fields: ["option chosen", "reasoning", "tradeoff accepted", "expected before/after (labeled expected, not measured)"] },
  ],
  checklists: [
    { id: "c-weekly", title: "Weekly Self-Diagnosis Pass", cadence: "weekly", items: [
      "Pull the current measured evidence for the surface you're watching — nothing modeled counted as measured.",
      "Write one Hypothesis Note if a new drop-off pattern appeared this week; skip this step if nothing changed.",
      "Re-read last week's open hypotheses — has any new evidence confirmed or ruled one out?",
    ] },
    { id: "c-per-change", title: "Before You Ship a Change", cadence: "per-change", items: [
      "Confirm the change addresses exactly one named mechanism, not several at once.",
      "Fill in a Decision Record before shipping, not after.",
      "Note the before-state so there's something real to compare against later.",
    ] },
    { id: "c-monthly", title: "Monthly Framework Refresh", cadence: "monthly", items: [
      "Re-read the six mechanisms and check whether your working vocabulary has drifted from them.",
      "Review the Common Mistakes list against your last month of decisions.",
    ] },
  ],
  decisionTrees: [
    {
      id: "dt-which-mechanism",
      title: "Which mechanism is most likely?",
      entryNodeId: "n1",
      nodes: [
        { id: "n1", question: "Is the drop-off concentrated at a specific step, or spread evenly across the whole flow?", branches: [
          { condition: "Concentrated at one step", outcome: "Continue to the step-level question.", nextNodeId: "n2" },
          { condition: "Spread evenly", outcome: "Suspect Trust Deficit or Value Uncertainty — check for proof signals and price clarity site-wide.", nextNodeId: "n3" },
        ] },
        { id: "n2", question: "Does that step ask for a large commitment (payment, long form, call) relative to what's been shown so far?", branches: [
          { condition: "Yes", outcome: "Suspect Commitment Anxiety — check what's demonstrated before this step." },
          { condition: "No, but the step has many fields or options", outcome: "Suspect Cognitive Load — count decision variables on that step." },
        ] },
        { id: "n3", question: "Is one traffic segment converting noticeably worse than another on the same page?", branches: [
          { condition: "Yes", outcome: "Suspect Identity Friction — check whether the page's framing matches that segment." },
          { condition: "No", outcome: "Suspect Ordering Error — check whether the step sequence itself is the problem, not any single step's content." },
        ] },
      ],
    },
  ],
  reviewCadence: [
    { frequency: "weekly", activity: "Run the Weekly Self-Diagnosis Pass checklist.", purpose: "Catch new friction while the evidence is still fresh." },
    { frequency: "monthly", activity: "Run the Monthly Framework Refresh checklist.", purpose: "Prevent vocabulary and discipline from drifting over time." },
    { frequency: "quarterly", activity: "Re-read every closed Hypothesis Note from the quarter.", purpose: "Build a track record of which of your own hypotheses were right, and recalibrate confidence accordingly." },
  ],
  exercises: [
    { id: "ex-1", title: "Six fields, one price", scenario: "A checkout page has 6 form fields and 40% of visitors abandon at field 3, which asks for a phone number.", task: "Write a Hypothesis Note: what's the candidate mechanism, and what single piece of evidence would most cheaply confirm or rule it out?", successLooksLike: "The note names one mechanism (not several), states confidence honestly, and proposes a check that doesn't require a full redesign to run." },
    { id: "ex-2", title: "The page that works for some", scenario: "Paid-search traffic converts at half the rate of organic traffic on an identical landing page.", task: "Decide which mechanism this most resembles and what you'd change first.", successLooksLike: "Identity Friction is named as the leading candidate, with a stated alternative considered and why it was ruled less likely." },
  ],
  caseReviewMethodology: {
    steps: [
      "Restate the original hypothesis exactly as it was written at the time — not a revised memory of it.",
      "Lay the new evidence next to it without editing the original.",
      "Mark the hypothesis confirmed, ruled out, or still open — 'still open' is a legitimate outcome, not a failure to reach one.",
      "Write one sentence on what, if anything, would have let you reach this conclusion faster.",
    ],
    requiredArtifacts: ["The original Hypothesis Note", "The Evidence Log entries from the review period", "The Decision Record, if a change was shipped"],
  },
  qualityControl: [
    { id: "qc-1", rule: "Never write 'measured' next to a number you didn't personally pull from a real source.", failureMode: "A modeled estimate gets treated as fact in the next decision, and the error compounds silently." },
    { id: "qc-2", rule: "Change one variable per shipped decision.", failureMode: "Multiple simultaneous changes make it impossible to attribute any resulting movement to a specific cause." },
    { id: "qc-3", rule: "Write the unknowns line even when the hypothesis feels obvious.", failureMode: "Overconfidence goes unrecorded, and the next reviewer (including future-you) can't tell a strong hypothesis from a lucky guess." },
  ],
  operationalRhythm: [
    { cadence: "Daily (only if actively iterating)", activity: "Glance at whichever single measured signal you're currently watching — no full pass required." },
    { cadence: "Weekly", activity: "Full Weekly Self-Diagnosis Pass." },
    { cadence: "Per shipped change", activity: "Decision Record filled in before, not after, the change goes live." },
  ],
  escalationRules: [
    { trigger: "Two consecutive weekly passes produce no hypothesis you're confident enough to act on.", action: "Bring the Evidence Log and open Hypothesis Notes to a re-diagnosis conversation.", escalateTo: "Signal & Friction analyst" },
    { trigger: "A shipped change moved the measured number in the opposite direction from what the Decision Record expected.", action: "Do not immediately ship a second change on top of it — review the original hypothesis first.", escalateTo: "Signal & Friction analyst" },
  ],
  commonMistakes: [
    { mistake: "Treating a modeled range as if it were a measured number.", whyItHappens: "Modeled numbers are often the only ones available early, and the distinction feels pedantic under time pressure.", correction: "The Evidence Log's tier field exists specifically to make this distinction unskippable." },
    { mistake: "Changing three things at once to 'save time'.", whyItHappens: "Shipping feels like the finish line, so bundling changes feels efficient.", correction: "It isn't efficient if it destroys your ability to know what worked — one variable per Decision Record." },
    { mistake: "Skipping the unknowns line because it feels like admitting weakness.", whyItHappens: "Certainty reads as more competent than honesty in the short term.", correction: "Every deliverable this company sends a client states unknowns explicitly — the discipline exists precisely because it isn't weakness, it's the whole method." },
  ],
  successCriteria: [
    { criterion: "Founder can produce a Hypothesis Note that correctly names the mechanism without assistance.", howMeasured: "Compare 3 independently-written notes against the decision tree's implied answer." },
    { criterion: "Founder distinguishes measured from modeled evidence without prompting.", howMeasured: "Spot-check the Evidence Log's tier field across a month of entries." },
  ],
  clientIndependenceCriteria: [
    { criterion: "Four consecutive weekly passes completed without Signal & Friction involvement.", evidenceRequired: "Four dated Evidence Log + Hypothesis Note pairs." },
    { criterion: "At least two hypotheses carried through to confirmed or ruled-out using the founder's own evidence.", evidenceRequired: "Two completed Case Review Methodology writeups." },
  ],
};

// ── DFY Autonomy Kit — the client's internal team maintains the fix ─────

export const DFY_AUTONOMY_CURRICULUM: AutonomyCurriculum = {
  audience: "internal-team",
  mission:
    "Give the client's internal team the operating discipline to maintain what Signal & Friction implemented, recognize when it's drifting, and know exactly when to route a problem back — without needing S&F involved in routine maintenance.",
  learningProgression: [
    { id: "s1", title: "Read the handoff record", objective: "Understand exactly what was implemented and why, before touching anything.", prerequisiteStageId: null },
    { id: "s2", title: "Run the maintenance checklist", objective: "Confirm the implementation is still behaving as delivered.", prerequisiteStageId: "s1" },
    { id: "s3", title: "Recognize drift", objective: "Notice when a metric or behavior has moved away from the delivered state, even gradually.", prerequisiteStageId: "s2" },
    { id: "s4", title: "Log and route", objective: "Record what changed and decide whether it's a maintenance fix or an escalation.", prerequisiteStageId: "s3" },
    { id: "s5", title: "Know the escalation boundary", objective: "Escalate exactly the cases that need new diagnosis, not every anomaly.", prerequisiteStageId: "s4" },
  ],
  frameworkProgression: [
    { id: "f-cog", title: "Cognitive Load", mechanism: "cognitive_load", whatItTeaches: "Can return silently — a well-meaning addition of 'just one more field' recreates the exact problem that was fixed.", whenToSuspectIt: "A change request adds a field, option, or step to a surface Signal & Friction previously simplified." },
    { id: "f-trust", title: "Trust Deficit", mechanism: "trust_deficit", whatItTeaches: "Proof elements (badges, testimonials) are easy to accidentally remove in an unrelated redesign.", whenToSuspectIt: "A design refresh touches the same page/section the delivered fix lives on." },
    { id: "f-commit", title: "Commitment Anxiety", mechanism: "commitment_anxiety", whatItTeaches: "Marketing or sales pressure can reintroduce an early hard ask that was deliberately deferred.", whenToSuspectIt: "A new campaign or funnel change moves a commitment step earlier than the delivered sequence." },
    { id: "f-order", title: "Ordering Error", mechanism: "ordering_error", whatItTeaches: "Step order is fragile — one team reordering steps for an unrelated reason can undo a sequencing fix.", whenToSuspectIt: "Any change to step order on the implemented surface, for any stated reason." },
    { id: "f-id", title: "Identity Friction", mechanism: "identity_friction", whatItTeaches: "New traffic sources or segments the original fix wasn't built for can reveal the same friction in a new form.", whenToSuspectIt: "A new acquisition channel is added that sends a meaningfully different visitor profile to the implemented surface." },
    { id: "f-value", title: "Value Uncertainty", mechanism: "value_uncertainty", whatItTeaches: "Pricing or packaging changes elsewhere can undo value clarity that was fixed locally.", whenToSuspectIt: "Pricing, packaging, or plan structure changes anywhere upstream of the implemented surface." },
  ],
  templates: [
    { id: "t-change-log", title: "Change Log Entry", purpose: "Make every edit to the implemented surface traceable to a person and a reason.", fields: ["date", "changed by", "what changed", "reason", "touches delivered surface? yes/no"] },
    { id: "t-drift", title: "Drift Report", purpose: "Document a suspected regression before deciding whether it's maintenance or escalation.", fields: ["metric", "baseline value", "current value", "when noticed", "suspected cause"] },
    { id: "t-escalation", title: "Escalation Ticket", purpose: "Give Signal & Friction everything needed to re-diagnose without a back-and-forth.", fields: ["Drift Report reference", "Change Log entries since baseline", "what the team already tried", "urgency"] },
  ],
  checklists: [
    { id: "c-weekly", title: "Weekly Implementation Health Check", cadence: "weekly", items: [
      "Confirm the delivered surface still matches the handoff record — no undocumented changes.",
      "Check current technical signals against the captured baseline, if one exists.",
      "Review the Change Log for entries touching the delivered surface this week.",
    ] },
    { id: "c-per-change", title: "Before Any Change to the Delivered Surface", cadence: "per-change", items: [
      "Read the relevant section of the handoff record first.",
      "File a Change Log Entry before, not after, making the change.",
      "Check the change against the six mechanisms — does it risk reintroducing any of them?",
    ] },
    { id: "c-quarterly", title: "Quarterly Full Review", cadence: "quarterly", items: [
      "Walk the entire handoff record against current reality, section by section.",
      "Re-capture a technical baseline if the last one is more than a quarter old.",
      "Review every Drift Report filed in the quarter and confirm each was resolved or escalated.",
    ] },
  ],
  decisionTrees: [
    {
      id: "dt-maintenance-or-escalation",
      title: "Is this a maintenance issue or an escalation?",
      entryNodeId: "n1",
      nodes: [
        { id: "n1", question: "Can the team trace the drift to a specific, known Change Log entry?", branches: [
          { condition: "Yes", outcome: "Continue — check if reverting that change resolves it.", nextNodeId: "n2" },
          { condition: "No known cause", outcome: "File a Drift Report and escalate — unexplained drift needs new diagnosis, not a guess." },
        ] },
        { id: "n2", question: "Does reverting the identified change restore the baseline behavior?", branches: [
          { condition: "Yes", outcome: "Maintenance issue — revert, log the resolution, no escalation needed." },
          { condition: "No", outcome: "Escalate — the cause isn't what it appeared to be, which is exactly when a new diagnosis is warranted." },
        ] },
      ],
    },
  ],
  reviewCadence: [
    { frequency: "weekly", activity: "Run the Weekly Implementation Health Check.", purpose: "Catch drift while the Change Log entry that caused it is still easy to identify." },
    { frequency: "quarterly", activity: "Run the Quarterly Full Review.", purpose: "Prevent slow, undocumented drift from accumulating past what any single Change Log entry would reveal." },
  ],
  exercises: [
    { id: "ex-1", title: "The helpful extra field", scenario: "A product manager, unaware of the original diagnosis, adds an optional 'referral source' field to a signup form Signal & Friction had simplified.", task: "Decide whether this needs a Change Log Entry, a Drift Report, or both, and why.", successLooksLike: "The team identifies this as a Cognitive Load risk, logs the change, and sets a checkpoint to check whether completion time moves before deciding anything further." },
    { id: "ex-2", title: "The metric that quietly moved", scenario: "Performance score has dropped 20 points since the captured baseline, with no Change Log entries touching the delivered surface.", task: "Route this using the maintenance-or-escalation decision tree.", successLooksLike: "The team correctly identifies this as an unexplained-cause case and escalates rather than investigating indefinitely on their own." },
  ],
  caseReviewMethodology: {
    steps: [
      "Pull the Drift Report and every Change Log entry between the baseline and the observed drift.",
      "As a team, walk the timeline in order — don't jump straight to the most recent change.",
      "Identify which change, if any, correlates with the drift's onset.",
      "Record the outcome (resolved / escalated / still open) and update the handoff record if the resolution changes standing practice.",
    ],
    requiredArtifacts: ["The Drift Report", "Change Log entries for the review window", "The current handoff record"],
  },
  qualityControl: [
    { id: "qc-1", rule: "Every change to the delivered surface gets a Change Log Entry, no exceptions for 'small' changes.", failureMode: "Small undocumented changes are exactly what makes later drift untraceable." },
    { id: "qc-2", rule: "Never resolve a Drift Report by reverting a change nobody logged.", failureMode: "An unlogged revert erases the evidence needed to confirm the fix actually worked, and the same drift can recur unnoticed." },
    { id: "qc-3", rule: "Escalate on unexplained drift within one review cycle — don't let it run to the next quarterly review.", failureMode: "The longer drift goes unaddressed, the more compounding changes stack on top of it, making root cause harder to isolate later." },
  ],
  operationalRhythm: [
    { cadence: "Weekly", activity: "Named owner runs the Weekly Implementation Health Check." },
    { cadence: "Per change", activity: "Change Log Entry filed before the change ships." },
    { cadence: "Quarterly", activity: "Full team walks the Quarterly Full Review together, not solo." },
  ],
  escalationRules: [
    { trigger: "Drift with no identifiable Change Log cause.", action: "File a Drift Report and open an Escalation Ticket immediately.", escalateTo: "Signal & Friction analyst" },
    { trigger: "A revert of the suspected cause does not resolve the drift.", action: "Open an Escalation Ticket with the full timeline attached.", escalateTo: "Signal & Friction analyst" },
    { trigger: "A proposed change touches the delivered surface but the team is unsure if it risks any of the six mechanisms.", action: "Get a second read from the internal team lead before shipping.", escalateTo: "internal team lead" },
    { trigger: "Routine change with a clear Change Log entry and no observed drift.", action: "Proceed — this is ordinary maintenance.", escalateTo: "no escalation needed" },
  ],
  commonMistakes: [
    { mistake: "Multiple people editing the delivered surface without a shared Change Log.", whyItHappens: "Team members don't realize a specific page or flow was the subject of a paid diagnosis.", correction: "The handoff record should be linked directly from wherever the team tracks work on that surface." },
    { mistake: "No one owns checking the baseline against current signals.", whyItHappens: "Monitoring cadence isn't anyone's named responsibility by default.", correction: "The Weekly Implementation Health Check needs a named owner, not an implied one." },
    { mistake: "Escalating every anomaly instead of using the decision tree.", whyItHappens: "It feels safer to ask than to risk missing something.", correction: "Correctly triaging maintenance vs. escalation is itself the capability being transferred — routing everything defeats the purpose." },
  ],
  successCriteria: [
    { criterion: "Team correctly triages maintenance-vs-escalation cases using the decision tree.", howMeasured: "Review a sample of resolved Drift Reports against what the tree would have recommended." },
    { criterion: "Change Log entries exist for all changes touching the delivered surface.", howMeasured: "Spot-check the delivered surface's edit history against the Change Log." },
  ],
  clientIndependenceCriteria: [
    { criterion: "One full quarterly review cycle completed without Signal & Friction involvement.", evidenceRequired: "A completed Quarterly Full Review writeup." },
    { criterion: "A named owner exists for the weekly health check.", evidenceRequired: "The owner's name recorded in the handoff record's operational-rhythm section." },
  ],
};

// ── Converters — project the typed curriculum into the exact shapes the
// existing deliverable components already know how to render, so no new
// UI is required to close the content gap. Pure functions, no JSX. ─────

export interface CurriculumChecklistItem {
  id: string;
  task: string;
  done: boolean;
  tip: string;
}

export interface CurriculumLearningModule {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  content: string;
}

/** Flattens every checklist's items into the flat ChecklistItem[] shape FounderLearningModule already renders. */
export function curriculumToChecklistItems(curriculum: AutonomyCurriculum): CurriculumChecklistItem[] {
  const out: CurriculumChecklistItem[] = [];
  for (const list of curriculum.checklists) {
    list.items.forEach((task, i) => {
      out.push({ id: `${list.id}-${i}`, task, done: false, tip: `${list.title} — ${list.cadence}` });
    });
  }
  return out;
}

/** Projects the framework progression into the LearningModule[] shape FounderLearningModule already renders. */
export function curriculumToLearningModules(curriculum: AutonomyCurriculum): CurriculumLearningModule[] {
  return curriculum.frameworkProgression.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.whatItTeaches,
    completed: false,
    content: `When to suspect it: ${f.whenToSuspectIt}`,
  }));
}

/** Formats the DFY curriculum as the single readable text block TeamRunbookModule already renders. */
export function curriculumToRunbookText(curriculum: AutonomyCurriculum): string {
  const sections: string[] = [];
  sections.push(curriculum.mission);
  sections.push(
    "OPERATIONAL RHYTHM\n" + curriculum.operationalRhythm.map((r) => `- ${r.cadence}: ${r.activity}`).join("\n")
  );
  sections.push(
    "CHECKLISTS\n" +
      curriculum.checklists
        .map((c) => `${c.title} (${c.cadence}):\n` + c.items.map((i) => `  - ${i}`).join("\n"))
        .join("\n\n")
  );
  sections.push(
    "ESCALATION RULES\n" +
      curriculum.escalationRules
        .map((e) => `- If: ${e.trigger}\n  Then: ${e.action} (${e.escalateTo})`)
        .join("\n")
  );
  sections.push(
    "COMMON MISTAKES\n" +
      curriculum.commonMistakes.map((m) => `- ${m.mistake} → ${m.correction}`).join("\n")
  );
  return sections.join("\n\n");
}
