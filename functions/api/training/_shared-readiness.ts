/**
 * Diagnostic Calibration System v3 — readiness model.
 * ════════════════════════════════════════════════════════════════════════════
 * Pure function, no DB/React dependency. Per the approved spec: "Do not
 * declare the analyst ready merely because of raw agreement percentage.
 * Do not treat the reference consultancy as infallible... Show exactly
 * why readiness has or has not been reached." This file is the entire
 * enforcement of that: readiness is never a single opaque score — it's a
 * fixed list of named, independently-thresholded criteria, and the
 * analyst is ready only when every one of them passes. Each criterion
 * reports its own actual value against its own threshold so the caller
 * can render exactly why.
 *
 * A "defensible disagreement" (analyst's mechanism differs from the
 * reference, but the disagreement is flagged defensible — ambiguous case,
 * genuinely arguable alternative reading) counts toward calibration the
 * same as agreement. This is deliberate: rewarding only raw agreement
 * would teach imitation of the reference, not judgment — the opposite of
 * this system's stated purpose.
 */

// Duplicated (not imported) from ./training-workflow.ts's CanonicalMechanism
// — deliberately, so this file stays a trivially mirror-able, dependency-
// free single file across the src/lib <-> functions/api/training boundary
// (see scripts/check-domain-drift.mjs), same reasoning as every other
// cross-runtime duplication in this codebase.
export type CanonicalMechanism =
  | "cognitive_load" | "trust_deficit" | "commitment_anxiety"
  | "ordering_error" | "identity_friction" | "value_uncertainty";

export type JudgmentConfidence = "low" | "moderate" | "high";

export interface CompletedAttemptSummary {
  caseId: string;
  referenceMechanism: CanonicalMechanism;
  judgmentMechanism: CanonicalMechanism;
  judgmentConfidence: JudgmentConfidence;
  // null = not yet assessed for defensibility (treated as NOT counted
  // toward the agreement-or-defensible rate — an unresolved disagreement
  // is not silently given credit).
  disagreementDefensible: boolean | null;
  evidenceDisciplinePass: boolean;
  // 1-5, from the post-reveal calibration profile.
  differentialDiagnosisQuality: number;
  uncertaintyHandling: number;
  recommendationCoherence: number;
  completedAt: string; // ISO
}

export interface ReadinessConfig {
  windowSize: number;
  minCasesInWindow: number;
  minMechanismCoverage: number; // distinct reference mechanisms seen
  minAgreementOrDefensibleRate: number; // 0-1
  minEvidenceDisciplineRate: number; // 0-1
  maxConfidenceBrierScore: number; // lower is better; 0.25 = no-skill baseline
  minAverageRecommendationCoherence: number; // 1-5 scale
}

export const DEFAULT_READINESS_CONFIG: ReadinessConfig = {
  windowSize: 12,
  minCasesInWindow: 8,
  minMechanismCoverage: 4,
  minAgreementOrDefensibleRate: 0.75,
  minEvidenceDisciplineRate: 0.85,
  maxConfidenceBrierScore: 0.2,
  minAverageRecommendationCoherence: 3.5,
};

export interface ReadinessCriterion {
  id: string;
  label: string;
  passed: boolean;
  actual: number | string;
  threshold: number | string;
  detail: string;
}

export interface ReadinessResult {
  ready: boolean;
  windowUsed: number; // how many attempts were actually in the window
  criteria: ReadinessCriterion[];
}

// low/moderate/high confidence mapped to an implied probability-of-being-
// right estimate — a stated, inspectable mapping, not a hidden one.
const CONFIDENCE_TO_PROBABILITY: Record<JudgmentConfidence, number> = {
  low: 0.4,
  moderate: 0.65,
  high: 0.85,
};

function outcomeCountsAsCorrect(a: CompletedAttemptSummary): boolean {
  if (a.judgmentMechanism === a.referenceMechanism) return true;
  return a.disagreementDefensible === true;
}

function brierScore(attempts: CompletedAttemptSummary[]): number {
  if (attempts.length === 0) return 1; // worst possible — no data is not "well calibrated"
  const sum = attempts.reduce((acc, a) => {
    const p = CONFIDENCE_TO_PROBABILITY[a.judgmentConfidence];
    const outcome = outcomeCountsAsCorrect(a) ? 1 : 0;
    return acc + (p - outcome) ** 2;
  }, 0);
  return sum / attempts.length;
}

/**
 * Computes readiness over the most recent `config.windowSize` completed
 * attempts (chronological, newest last in the input is not assumed —
 * this function sorts by completedAt itself). Every criterion is
 * evaluated independently; `ready` is true only if all of them pass.
 */
export function computeReadiness(
  allAttempts: CompletedAttemptSummary[],
  config: ReadinessConfig = DEFAULT_READINESS_CONFIG
): ReadinessResult {
  const sorted = [...allAttempts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const window = sorted.slice(0, config.windowSize);
  const n = window.length;

  const criteria: ReadinessCriterion[] = [];

  criteria.push({
    id: "case_count",
    label: "Enough recent cases completed",
    passed: n >= config.minCasesInWindow,
    actual: n,
    threshold: config.minCasesInWindow,
    detail: `${n} of the most recent ${config.windowSize}-case window completed.`,
  });

  const mechanismsCovered = new Set(window.map((a) => a.referenceMechanism)).size;
  criteria.push({
    id: "mechanism_coverage",
    label: "Distinct mechanisms practiced",
    passed: mechanismsCovered >= config.minMechanismCoverage,
    actual: mechanismsCovered,
    threshold: config.minMechanismCoverage,
    detail: `${mechanismsCovered} of 6 canonical mechanisms appear in the window — narrow coverage means readiness in the untested mechanisms is unknown, not assumed.`,
  });

  const agreementOrDefensible = n > 0 ? window.filter(outcomeCountsAsCorrect).length / n : 0;
  criteria.push({
    id: "agreement_or_defensible",
    label: "Agreement with reference, or a defensible disagreement",
    passed: n > 0 && agreementOrDefensible >= config.minAgreementOrDefensibleRate,
    actual: Math.round(agreementOrDefensible * 1000) / 1000,
    threshold: config.minAgreementOrDefensibleRate,
    detail: "Raw disagreement is not automatically a failure, and raw agreement is not automatically a pass — only disagreements explicitly flagged defensible count toward this rate.",
  });

  const evidenceRate = n > 0 ? window.filter((a) => a.evidenceDisciplinePass).length / n : 0;
  criteria.push({
    id: "evidence_discipline",
    label: "Evidence-tier discipline maintained",
    passed: n > 0 && evidenceRate >= config.minEvidenceDisciplineRate,
    actual: Math.round(evidenceRate * 1000) / 1000,
    threshold: config.minEvidenceDisciplineRate,
    detail: "Share of attempts with no modeled/inferred claim presented as directly measured.",
  });

  const brier = brierScore(window);
  criteria.push({
    id: "confidence_calibration",
    label: "Confidence calibration",
    passed: n > 0 && brier <= config.maxConfidenceBrierScore,
    actual: Math.round(brier * 1000) / 1000,
    threshold: config.maxConfidenceBrierScore,
    detail: "Brier score between stated confidence and actual outcome — lower is better calibrated; 0.25 is the no-skill baseline of always guessing 50/50.",
  });

  const avgCoherence = n > 0 ? window.reduce((s, a) => s + a.recommendationCoherence, 0) / n : 0;
  criteria.push({
    id: "recommendation_coherence",
    label: "Recommendations follow from the evidence",
    passed: n > 0 && avgCoherence >= config.minAverageRecommendationCoherence,
    actual: Math.round(avgCoherence * 100) / 100,
    threshold: config.minAverageRecommendationCoherence,
    detail: "Average 1-5 recommendation-coherence rating across the window.",
  });

  return {
    ready: criteria.every((c) => c.passed),
    windowUsed: n,
    criteria,
  };
}

// ── Mechanism-pair confusion — "identify which mechanism pair is being
// confused most frequently" ────────────────────────────────────────────

export interface ConfusionPairCount {
  reference: CanonicalMechanism;
  claimed: CanonicalMechanism;
  count: number;
}

/** Real disagreements only (reference !== claimed), ranked most-frequent first. Empty input -> empty output, never a fabricated "no confusion" claim. */
export function topConfusionPairs(attempts: CompletedAttemptSummary[], limit = 3): ConfusionPairCount[] {
  const counts = new Map<string, ConfusionPairCount>();
  for (const a of attempts) {
    if (a.referenceMechanism === a.judgmentMechanism) continue;
    const key = `${a.referenceMechanism}->${a.judgmentMechanism}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { reference: a.referenceMechanism, claimed: a.judgmentMechanism, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
