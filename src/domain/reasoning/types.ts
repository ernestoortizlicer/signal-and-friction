/**
 * Decision Mechanisms — domain types.
 * ════════════════════════════════════════════════════════════════════════════
 * This is the domain model of Signal & Friction, not a subsystem of it.
 * Every projection — scaffold UI, teaser, Loom script, premium deliverable,
 * Learning activities, future AI agents — derives from the canonical
 * `Diagnosis` object defined here. If a future output needs information this
 * model doesn't carry, the model gains a field; the output generator does not
 * grow its own parallel copy of that information.
 *
 * Pure data/type module — zero framework imports, zero side effects — so it
 * can be mirrored verbatim into supabase/functions/_shared/reasoning/ for the
 * Deno edge-function runtime, the same duplication pattern src/lib/dosing.ts
 * already uses out of necessity (Cloudflare's esbuild can't resolve imports
 * across into src/lib at Cloudflare Pages Function compile time — same
 * constraint here). scripts/check-domain-drift.mjs diffs the two copies at
 * build time so this duplication can't silently drift, unlike dosing.ts's
 * today (also being covered by that script — see the script itself).
 *
 * Six layers, deliberately never collapsed into each other:
 *   evidence        → what a tool actually measured
 *   observation      → an analyst's plain-language reading of what that
 *                       measurement shows, before any mechanism label
 *   hypothesis       → a specific behavioral-mechanism claim interpreting
 *                       one or more observations — ALWAYS modeled or
 *                       pending, NEVER measured
 *   judgment         → the analyst's own synthesis: the one dominant
 *                       friction, and why
 *   recommendation   → the business-facing decision that follows
 *   uncertainty      → what remains unknown — always analyst-authored,
 *                       never auto-generated (see DiagnosisUncertainty)
 */

// ── The 6 canonical Signal & Friction friction mechanisms ──────────────────
// Exactly 6, on purpose — see the "Technical Friction" decision: measured
// technical signals always contribute toward one of these 6, never a 7th
// bucket of their own. Mirrors src/lib/dosing.ts's FrictionMechanism
// verbatim; kept as its own alias here rather than importing across the
// Cloudflare/Next boundary, for the same reason the file header explains.
export type FrictionMechanismId =
  | "cognitive_load"
  | "trust_deficit"
  | "commitment_anxiety"
  | "ordering_error"
  | "identity_friction"
  | "value_uncertainty";

export type EvidenceStrength = "strong" | "mixed" | "contextual" | "weak";

// A hypothesis is an interpretation of evidence, never itself evidence.
// "measured" is deliberately not a valid value here — only the underlying
// signal can be measured; a mechanism's application to a specific case is,
// at best, a modeled interpretation, or explicitly still pending.
export type InterpretationStatus = "modeled" | "pending";

export type ConfidenceLevel = "low" | "moderate" | "high";
export type MagnitudeLevel = "low" | "moderate" | "high";

// Controlled vocabulary mirroring RawTechnicalSignals' real field names
// (functions/api/_scan.ts) — deliberately not an independent taxonomy that
// could drift from what's actually measured. Add to this list only when
// _scan.ts gains a genuinely new measured signal.
export type PerformanceSignalId =
  | "lcp"
  | "cls"
  | "tbt"
  | "performance_score"
  | "viewport_meta_present"
  | "pricing_link"
  | "security_badges"
  | "third_party_review_link"
  | "on_site_testimonial"
  | "privacy_policy_link"
  | "terms_of_service_link"
  | "primary_cta_present"
  | "missing_og_tags"
  | "https_enabled";

// ── Reasoning registry — the 21 mechanisms, 7 families ──────────────────────

export interface PerformanceSignalMapping {
  signal: PerformanceSignalId;
  /**
   * Always "proposed" today — there is no mechanism, anywhere in this
   * system, that upgrades a mapping to "established" automatically or
   * otherwise. The field exists so a future, deliberate, human-reviewed
   * promotion is representable without a schema change — not because
   * "established" mappings currently exist or are expected soon.
   */
  status: "proposed";
  /** Why this specific signal is defensibly linked to this mechanism — required, not optional, because an unexplained mapping is indistinguishable from an arbitrary one. */
  rationale: string;
}

export interface ReasoningMechanism {
  id: string;
  name: string;
  familyId: string;
  definition: string;
  underlyingMechanism: string;
  evidenceStrength: EvidenceStrength;
  evidenceNotes: string;
  epistemicWarnings: string[];
  manifestation: string;
  diagnosticQuestions: string[];
  misinterpretations: string;
  relevantFrictionMechanisms: { id: FrictionMechanismId; primary: boolean }[];
  /** Empty by default — see the Performance Signal Mapping decision. Only populated where a defensible, explained relationship exists; never filled for completeness. */
  relevantPerformanceSignals: PerformanceSignalMapping[];
  contraindications: string[];
  references: { label: string; note?: string }[];
}

export interface ReasoningFamily {
  id: string;
  num: string;
  stage: string;
  title: string;
  intro: string;
}

// ── The canonical Diagnosis object ──────────────────────────────────────────

/** Evidence Engine output — a tool measurement. Unchanged shape from the existing ScaffoldEvidenceRow (functions/api/_scan.ts) — this is that same concept, named at the domain layer. */
export interface DiagnosisEvidence {
  id: string;
  tier: "measured";
  label: string;
  value: string;
  source: string;
}

/**
 * Reasoning Engine output, first stage — a structured, still largely
 * descriptive reading of what one or more measured signals show, in plain
 * language, before any mechanism label is attached. Analyst-authored;
 * the engine may suggest a starting point (Phase 3+), never commit one.
 */
export interface DiagnosisObservation {
  id: string;
  text: string;
  derivedFromEvidenceIds: string[];
}

/**
 * Reasoning Engine output, second stage — a candidate behavioral-mechanism
 * claim. This is exactly what "the reasoning engine generates candidate
 * reasoning, never diagnoses" means concretely: a hypothesis can exist,
 * fully formed, and never become part of the analyst's judgment. Nothing
 * elsewhere in the system treats an unattached hypothesis as a finding.
 */
export interface DiagnosisHypothesis {
  id: string;
  mechanismId: string;
  frictionMechanism: FrictionMechanismId;
  status: InterpretationStatus;
  /** Always read from the mechanism registry, never authored per-diagnosis — see the epistemic-standard non-negotiable: nobody can locally upgrade a mechanism's rating to sound more authoritative in one report. */
  evidenceStrength: EvidenceStrength;
  analystRationale: string;
  linkedObservationIds: string[];
}

/** Decision Engine output, first stage — the analyst's own synthesis. This is the only layer that ever names ONE dominant friction — "One friction. One decision." */
export interface DiagnosisJudgment {
  dominantFrictionMechanism: FrictionMechanismId;
  specificFrictionPoint: string;
  whyItBlocksConversion: string;
  confidenceLevel: ConfidenceLevel;
  confidenceRationale: string;
}

/** Decision Engine output, second stage — what follows from the judgment. */
export interface DiagnosisRecommendation {
  decision: string;
  whatToAvoid: string;
  projectedImpact: string;
  projectedImpactMagnitude: MagnitudeLevel | null;
}

/**
 * Always present, never optional, never auto-generated. Uncertainty is
 * part of the product, not a gap to be silently filled — see the
 * Unknowns decision. `suggestedUnknowns` is a placeholder for a future
 * system-suggested-candidates feature; empty and unused today, exactly
 * as `relevantPerformanceSignals` is on mechanisms with no defensible
 * mapping — an intentionally empty field, not a stub for later removal.
 */
export interface DiagnosisUncertainty {
  unknowns: string;
  suggestedUnknowns: string[];
}

export interface Diagnosis {
  id: string;
  targetUrl: string;
  domain: string;
  scannedAt: string;
  evidence: DiagnosisEvidence[];
  observations: DiagnosisObservation[];
  hypotheses: DiagnosisHypothesis[];
  judgment: DiagnosisJudgment | null;
  recommendation: DiagnosisRecommendation | null;
  uncertainty: DiagnosisUncertainty;
  status: "draft" | "pushed_to_deliverable";
}

// ── Learning — activities powered by the same registry, no parallel copy ───

export type LearningPromptType =
  | "recall"
  | "evidence-calibration"
  | "comparison"
  | "case-analysis"
  | "diagnostic-practice";

export interface LearningPrompt {
  id: string;
  mechanismId: string;
  promptType: LearningPromptType;
  question: string;
  expectedConcepts: string[];
  rubric: string[];
}
