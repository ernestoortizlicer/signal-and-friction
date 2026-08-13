/**
 * Diagnostic Calibration System v3 — workflow sequencing.
 * ════════════════════════════════════════════════════════════════════════════
 * Pure, no React/DB dependency — the single source of truth both the
 * Cloudflare Functions (server-side gate) and the UI (client-side
 * progressive disclosure) read from, so the two can never silently
 * disagree about which stage unlocks what.
 *
 * Production integrity contract (2026-08-13 reconciliation): a final
 * judgment commits first to a CASE DISPOSITION. Only behavioral_diagnosis
 * and mixed_condition may carry a behavioral mechanism. technical_blocker,
 * insufficient_evidence, and scope_change_required are first-class
 * abstentions and MUST NOT be forced into one of the six mechanisms.
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

export type CaseDisposition =
  | "behavioral_diagnosis"
  | "technical_blocker"
  | "mixed_condition"
  | "insufficient_evidence"
  | "scope_change_required";

export const CASE_DISPOSITIONS: CaseDisposition[] = [
  "behavioral_diagnosis",
  "technical_blocker",
  "mixed_condition",
  "insufficient_evidence",
  "scope_change_required",
];

export function isCanonicalMechanism(value: unknown): value is CanonicalMechanism {
  return typeof value === "string" && (CANONICAL_MECHANISMS as string[]).includes(value);
}

export function isCaseDisposition(value: unknown): value is CaseDisposition {
  return typeof value === "string" && (CASE_DISPOSITIONS as string[]).includes(value);
}

export function dispositionRequiresMechanism(disposition: CaseDisposition | undefined): boolean {
  return disposition === "behavioral_diagnosis" || disposition === "mixed_condition";
}

export function stageIndex(stage: TrainingStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function hasReachedStage(stage: TrainingStage, target: TrainingStage): boolean {
  return stageIndex(stage) >= stageIndex(target);
}

export interface AttemptInputs {
  observation?: string;
  evidenceNotes?: string;
  hypothesisMechanism?: CanonicalMechanism;
  hypothesisReasoning?: string;
  counterHypothesisMechanism?: CanonicalMechanism;
  counterHypothesisReasoning?: string;
  socraticExchanges?: { question: string; response: string }[];
  revision?: string;
  judgmentDisposition?: CaseDisposition;
  judgmentMechanism?: CanonicalMechanism;
  judgmentConfidence?: "low" | "moderate" | "high";
  recommendation?: string;
  uncertaintyNotes?: string;
  reflectionAnswers?: Record<string, string>;
}

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

function judgmentComplete(i: AttemptInputs): boolean {
  if (!i.judgmentDisposition || !i.judgmentConfidence) return false;
  if (dispositionRequiresMechanism(i.judgmentDisposition)) return !!i.judgmentMechanism;
  return !i.judgmentMechanism;
}

const STAGE_REQUIREMENTS: StageRequirement[] = [
  { stage: "observation", isSatisfied: (i) => !!i.observation?.trim(), reason: "Record what is directly observable before interpreting anything." },
  { stage: "evidence_review", isSatisfied: (i) => !!i.evidenceNotes?.trim(), reason: "Evaluate the evidence before forming a hypothesis." },
  { stage: "hypothesis", isSatisfied: (i) => !!i.hypothesisMechanism && !!i.hypothesisReasoning?.trim(), reason: "State a candidate mechanism and the reasoning behind it." },
  { stage: "counter_hypothesis", isSatisfied: (i) => !!i.counterHypothesisMechanism && !!i.counterHypothesisReasoning?.trim(), reason: "Name a genuinely plausible alternative, not a token one." },
  { stage: "socratic_challenge", isSatisfied: (i) => Array.isArray(i.socraticExchanges) && i.socraticExchanges.length > 0 && i.socraticExchanges.every((e) => e.question.trim() && e.response.trim()), reason: "At least one real Socratic exchange must be completed." },
  { stage: "revision", isSatisfied: (i) => !!i.revision?.trim(), reason: "State explicitly what, if anything, changed after the challenge." },
  { stage: "judgment", isSatisfied: judgmentComplete, reason: "Commit to a disposition and confidence. Behavioral or mixed judgments require one mechanism; abstention judgments must not force a mechanism." },
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

export type CaseSourceType = "primary" | "practitioner_account" | "secondary_vendor" | "internal_sf_resolved";

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

export interface HiddenCaseVerdict {
  referenceDisposition: CaseDisposition;
  referenceMechanism: CanonicalMechanism | null;
  referenceMechanismNote: string | null;
  referenceDiagnosis: string;
  referenceRecommendation: string;
  referenceResult: string | null;
}

export type FullCaseRow = ObservableCase & HiddenCaseVerdict;

const HIDDEN_FIELD_KEYS = [
  "referenceDisposition", "referenceMechanism", "referenceMechanismNote", "referenceDiagnosis",
  "referenceRecommendation", "referenceResult",
] as const;

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

export function containsNoHiddenFields(payload: object): boolean {
  return HIDDEN_FIELD_KEYS.every((key) => !Object.prototype.hasOwnProperty.call(payload, key));
}
