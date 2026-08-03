import type {
  Diagnosis,
  DiagnosisEvidence,
  DiagnosisJudgment,
  DiagnosisRecommendation,
  DiagnosisUncertainty,
  FrictionMechanismId,
  ConfidenceLevel,
  MagnitudeLevel,
} from "./types";

/**
 * scaffoldToDiagnosis — the Evidence/Decision Engine boundary adapter.
 * ════════════════════════════════════════════════════════════════════════════
 * Maps the EXISTING diagnostic_scaffolds row shape (7 judgment fields +
 * evidence + technical_signals — unchanged by this file) into the canonical
 * Diagnosis object. This is Phase 1/2 work: a read-only projection, no
 * schema change, no new columns required to use it. `observations` and
 * `hypotheses` are always empty until Phase 3 adds real `reasoning_links`
 * storage — that's a deliberate, honest default (no fabricated data),
 * not a placeholder pretending to be real.
 *
 * `uncertainty.unknowns` reads confidence_and_why today ONLY as a stopgap
 * display value, clearly not the same thing as a dedicated unknowns field —
 * Phase 3 replaces this with the real analyst-authored column. Marking this
 * explicitly rather than silently treating confidence_and_why as if it were
 * always about uncertainty, which it isn't.
 */

export interface ScaffoldLike {
  id: string;
  target_url: string;
  domain: string;
  scanned_at: string;
  evidence: Array<{ tier: "measured"; label: string; value: string; source: string }>;
  friction_mechanism: string | null;
  specific_friction_point: string | null;
  why_blocks_conversion: string | null;
  projected_impact: string | null;
  projected_impact_magnitude: MagnitudeLevel | null;
  the_decision: string | null;
  what_to_avoid: string | null;
  confidence_and_why: string | null;
  confidence_level: ConfidenceLevel | null;
  status: "draft" | "pushed_to_deliverable";
}

function mapEvidence(rows: ScaffoldLike["evidence"]): DiagnosisEvidence[] {
  return rows.map((row, i) => ({
    id: `${row.label}-${i}`,
    tier: "measured" as const,
    label: row.label,
    value: row.value,
    source: row.source,
  }));
}

function mapJudgment(s: ScaffoldLike): DiagnosisJudgment | null {
  if (!s.friction_mechanism || !s.specific_friction_point || !s.why_blocks_conversion) return null;
  return {
    dominantFrictionMechanism: s.friction_mechanism as FrictionMechanismId,
    specificFrictionPoint: s.specific_friction_point,
    whyItBlocksConversion: s.why_blocks_conversion,
    confidenceLevel: s.confidence_level ?? "moderate",
    confidenceRationale: s.confidence_and_why ?? "",
  };
}

function mapRecommendation(s: ScaffoldLike): DiagnosisRecommendation | null {
  if (!s.the_decision) return null;
  return {
    decision: s.the_decision,
    whatToAvoid: s.what_to_avoid ?? "",
    projectedImpact: s.projected_impact ?? "",
    projectedImpactMagnitude: s.projected_impact_magnitude,
  };
}

function mapUncertainty(_s: ScaffoldLike): DiagnosisUncertainty {
  // Deliberately NOT reading confidence_and_why here — that field is about
  // confidence in what WAS found, not what remains unknown; conflating the
  // two would be exactly the kind of layer-collapsing the architecture is
  // supposed to prevent. Returns genuinely empty until Phase 3's dedicated
  // `unknowns` column exists — an honest gap, not a stopgap guess.
  return { unknowns: "", suggestedUnknowns: [] };
}

export function scaffoldToDiagnosis(s: ScaffoldLike): Diagnosis {
  return {
    id: s.id,
    targetUrl: s.target_url,
    domain: s.domain,
    scannedAt: s.scanned_at,
    evidence: mapEvidence(s.evidence),
    observations: [], // Phase 3: populated from reasoning_links
    hypotheses: [],   // Phase 3: populated from reasoning_links
    judgment: mapJudgment(s),
    recommendation: mapRecommendation(s),
    uncertainty: mapUncertainty(s),
    status: s.status,
  };
}
