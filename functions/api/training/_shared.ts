/**
 * Diagnostic Calibration System v3 — workflow sequencing.
 * ════════════════════════════════════════════════════════════════════════════
 * Pure, no React/DB dependency — the single source of truth both the
 * Cloudflare Functions (server-side gate) and the UI (client-side
 * progressive disclosure) read from, so the two can never silently
 * disagree about which stage unlocks what.
 *
 * This file is also the actual enforcement mechanism for two hard
 * requirements from the approved spec:
 *   - "Treat verdict secrecy as a server-side integrity requirement, not
 *     only a UI rule" — visibleCaseFields() is what functions/api/training/
 *     endpoints call before a case or attempt ever leaves the server; it
 *     physically cannot return a reference_* field before the stage is
 *     'verdict_revealed'.
 *   - "Never persist [Socratic exchange content] unless the analyst
 *     explicitly saves the attempt" / progressive disclosure — the stage
 *     order and per-stage required-input rules below are what
 *     canAdvanceStage() checks before the server accepts an advance.
 */

export type TrainingStage =
  | "observation"
  | "evidence_review"
  | "hypothesis"
  | "counter_hypothesis"
  | "socratic_challenge"
  | "revision"
  | "judgment"
  | "recommendation"
  | "verdict_revealed"
  | "reflection_complete";

// Exact order from the approved spec: "Observation ↓ Evidence review ↓
// Behavioral hypothesis ↓ Counter-hypothesis ↓ Socratic challenge ↓
// Analyst revision ↓ Judgment ↓ Recommendation ↓ Reference consultancy
// verdict revealed ↓ Comparative reflection". Never reorder.
export const STAGE_ORDER: TrainingStage[] = [
  "observation",
  "evidence_review",
  "hypothesis",
  "counter_hypothesis",
  "socratic_challenge",
  "revision",
  "judgment",
  "recommendation",
  "verdict_revealed",
  "reflection_complete",
];

export type CanonicalMechanism =
  | "cognitive_load"
  | "trust_deficit"
  | "commitment_anxiety"
  | "ordering_error"
  | "identity_friction"
  | "value_uncertainty";

export const CANONICAL_MECHANISMS: CanonicalMechanism[] = [
  "cognitive_load", "trust_deficit", "commitment_anxiety",
  "ordering_error", "identity_friction", "value_uncertainty",
];

export const MECHANISM_LABELS: Record<CanonicalMechanism, string> = {
  cognitive_load: "Cognitive Load",
  trust_deficit: "Trust Deficit",
  commitment_anxiety: "Commitment Anxiety",
  ordering_error: "Ordering Error",
  identity_friction: "Identity Friction",
  value_uncertainty: "Value Uncertainty",
};

export function isCanonicalMechanism(value: unknown): value is CanonicalMechanism {
  return typeof value === "string" && (CANONICAL_MECHANISMS as string[]).includes(value);
}

export function stageIndex(stage: TrainingStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** True once `stage` has reached (or passed) `target` in the fixed sequence. */
export function hasReachedStage(stage: TrainingStage, target: TrainingStage): boolean {
  return stageIndex(stage) >= stageIndex(target);
}

// The analyst-authored input recorded AT each stage (what you submit to
// advance FROM that stage TO the next one).
export interface AttemptInputs {
  observation?: string;
  evidenceNotes?: string;
  hypothesisMechanism?: CanonicalMechanism;
  hypothesisReasoning?: string;
  counterHypothesisMechanism?: CanonicalMechanism;
  counterHypothesisReasoning?: string;
  socraticExchanges?: { question: string; response: string }[];
  revision?: string;
  judgmentMechanism?: CanonicalMechanism;
  judgmentConfidence?: "low" | "moderate" | "high";
  recommendation?: string;
  uncertaintyNotes?: string;
  reflectionAnswers?: Record<string, string>;
}

// The 7 mandatory comparative-reflection questions from the approved spec
// — fixed keys, so both the server-side gate and the UI form render
// exactly this list, never a subset. All 7 must be answered (non-empty)
// before an attempt can leave 'verdict_revealed'.
export const REFLECTION_QUESTIONS: { key: string; question: string }[] = [
  { key: "agreement", question: "Where did your diagnosis agree with the reference diagnosis?" },
  { key: "difference", question: "Where did it differ?" },
  { key: "defensible", question: "If it differed, was your reasoning genuinely weaker, or was it a defensible alternative interpretation the consultancy may have overlooked?" },
  { key: "confidence_appropriate", question: "Was your confidence level appropriate given the outcome?" },
  { key: "undervalued", question: "Which evidence did you undervalue that the reference consultancy considered decisive?" },
  { key: "overweighted", question: "Which evidence did you overweight?" },
  { key: "next_hour", question: "What would you investigate next if given another hour?" },
];

interface StageRequirement {
  stage: TrainingStage;
  isSatisfied: (inputs: AttemptInputs) => boolean;
  reason: string;
}

// What must exist in `inputs` before the attempt is allowed to advance
// PAST this stage. socratic_challenge requires at least one real exchange
// (never zero — a case with no Socratic engagement recorded didn't
// actually happen). verdict_revealed has no analyst-input requirement of
// its own — it's unlocked by the server's reveal action once
// 'recommendation' is satisfied, not by anything the analyst types.
const STAGE_REQUIREMENTS: StageRequirement[] = [
  { stage: "observation", isSatisfied: (i) => !!i.observation?.trim(), reason: "Record what is directly observable before interpreting anything." },
  { stage: "evidence_review", isSatisfied: (i) => !!i.evidenceNotes?.trim(), reason: "Evaluate the evidence before forming a hypothesis." },
  { stage: "hypothesis", isSatisfied: (i) => !!i.hypothesisMechanism && !!i.hypothesisReasoning?.trim(), reason: "State a candidate mechanism and the reasoning behind it." },
  { stage: "counter_hypothesis", isSatisfied: (i) => !!i.counterHypothesisMechanism && !!i.counterHypothesisReasoning?.trim(), reason: "Name a genuinely plausible alternative, not a token one." },
  { stage: "socratic_challenge", isSatisfied: (i) => Array.isArray(i.socraticExchanges) && i.socraticExchanges.length > 0 && i.socraticExchanges.every((e) => e.question.trim() && e.response.trim()), reason: "At least one real Socratic exchange must be completed." },
  { stage: "revision", isSatisfied: (i) => !!i.revision?.trim(), reason: "State explicitly what, if anything, changed after the challenge." },
  { stage: "judgment", isSatisfied: (i) => !!i.judgmentMechanism && !!i.judgmentConfidence, reason: "Commit to a final mechanism and a stated confidence level." },
  { stage: "recommendation", isSatisfied: (i) => !!i.recommendation?.trim() && !!i.uncertaintyNotes?.trim(), reason: "A recommendation without a stated unknowns line is incomplete — uncertainty must be declared, not implied." },
  {
    stage: "verdict_revealed",
    isSatisfied: (i) => REFLECTION_QUESTIONS.every((q) => !!i.reflectionAnswers?.[q.key]?.trim()),
    reason: "All 7 comparative-reflection questions must be answered before the attempt is complete.",
  },
];

export interface StageAdvanceResult {
  canAdvance: boolean;
  reason?: string;
}

/** Can the attempt advance from `current` to the next stage, given what's been entered so far? */
export function canAdvanceStage(current: TrainingStage, inputs: AttemptInputs): StageAdvanceResult {
  const req = STAGE_REQUIREMENTS.find((r) => r.stage === current);
  if (!req) return { canAdvance: false, reason: `Unknown stage: ${current}` };
  if (!req.isSatisfied(inputs)) return { canAdvance: false, reason: req.reason };
  const idx = stageIndex(current);
  if (idx === STAGE_ORDER.length - 1) return { canAdvance: false, reason: "Already at the final stage." };
  return { canAdvance: true };
}

export function nextStage(current: TrainingStage): TrainingStage | null {
  const idx = stageIndex(current);
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

// ── Case provenance & hidden-verdict field gating ────────────────────────

export type CaseSourceType = "primary" | "practitioner_account" | "secondary_vendor" | "internal_sf_resolved";

// Observable material only — this is what's always safe to send, at any
// stage, to any authenticated session, regardless of attempt progress.
export interface ObservableCase {
  id: string;
  caseKey: string;
  title: string;
  companyName: string | null;
  sourceType: CaseSourceType;
  sourceUrl: string | null;
  sourceNote: string | null;
  landingPage: string | null;
  pricingPage: string | null;
  onboardingFlow: string | null;
  checkoutFlow: string | null;
  technicalFindings: string | null;
  contextualInfo: string | null;
}

// The hidden half — must never leave the server before verdict reveal.
export interface HiddenCaseVerdict {
  referenceMechanism: CanonicalMechanism;
  referenceMechanismNote: string | null;
  referenceDiagnosis: string;
  referenceRecommendation: string;
  referenceResult: string | null;
}

export type FullCaseRow = ObservableCase & HiddenCaseVerdict;

const HIDDEN_FIELD_KEYS = [
  "referenceMechanism", "referenceMechanismNote", "referenceDiagnosis",
  "referenceRecommendation", "referenceResult",
] as const;

/**
 * The single enforcement point for verdict secrecy. Given a full case row
 * and the requesting attempt's current stage, returns EXACTLY what's safe
 * to send — the hidden fields are structurally absent from the returned
 * object (not just falsy) until hasReachedStage(stage, "verdict_revealed").
 * No attemptStage at all (case browsing, before an attempt exists) is
 * treated as pre-reveal — the strictest default.
 */
export function visibleCaseFields(
  fullCase: FullCaseRow,
  attemptStage: TrainingStage | null
): ObservableCase | FullCaseRow {
  const revealed = attemptStage !== null && hasReachedStage(attemptStage, "verdict_revealed");
  if (revealed) return fullCase;
  const observable: Record<string, unknown> = { ...fullCase };
  for (const key of HIDDEN_FIELD_KEYS) delete observable[key];
  return observable as unknown as ObservableCase;
}

/** True only if none of the hidden verdict keys are present as own properties — used defensively in tests and at the API boundary. */
export function containsNoHiddenFields(payload: object): boolean {
  return HIDDEN_FIELD_KEYS.every((key) => !Object.prototype.hasOwnProperty.call(payload, key));
}
