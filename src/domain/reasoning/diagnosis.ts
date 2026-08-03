import type {
  Diagnosis,
  DiagnosisEvidence,
  DiagnosisHypothesis,
  DiagnosisJudgment,
  DiagnosisRecommendation,
  DiagnosisUncertainty,
  FrictionMechanismId,
  ConfidenceLevel,
  MagnitudeLevel,
} from "./types.ts";

/**
 * scaffoldToDiagnosis — the Evidence/Decision Engine boundary adapter.
 * ════════════════════════════════════════════════════════════════════════════
 * Maps the diagnostic_scaffolds row shape (7 judgment fields + evidence +
 * technical_signals, unchanged since Phase 1, plus Phase 3's additive
 * reasoning_links/unknowns columns) into the canonical Diagnosis object.
 *
 * `hypotheses` reads the real `reasoning_links` column. A scaffold created
 * before that column existed simply has an empty array by default (the
 * migration is additive with DEFAULT '[]'::jsonb) — an honest, correct
 * state, not something requiring backfill. `observations` stays empty:
 * there is no UI yet for authoring a standalone observation independent
 * of a mechanism hypothesis, so returning fabricated ones would be worse
 * than returning none — a real gap, left honest rather than papered over.
 *
 * `uncertainty.unknowns` reads the real, analyst-authored `unknowns`
 * column. Never derived from confidence_and_why or anything else —
 * conflating "confidence in what was found" with "what remains unknown"
 * is exactly the kind of layer-collapsing this architecture exists to
 * prevent. Empty string for scaffolds where the analyst hasn't written
 * anything yet, distinct from "no uncertainty exists."
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
  /** Phase 3. Defaults to [] at the DB level — always a real array, never undefined, on any row created after the migration. Optional here only so pre-Phase-3 callers/fixtures that don't set it still type-check. */
  reasoning_links?: DiagnosisHypothesis[];
  /** Phase 3. Nullable at the DB level — analyst hasn't necessarily written anything. */
  unknowns?: string | null;
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

function mapUncertainty(s: ScaffoldLike): DiagnosisUncertainty {
  return { unknowns: s.unknowns ?? "", suggestedUnknowns: [] };
}

function mapHypotheses(s: ScaffoldLike): DiagnosisHypothesis[] {
  return s.reasoning_links ?? [];
}

export function scaffoldToDiagnosis(s: ScaffoldLike): Diagnosis {
  return {
    id: s.id,
    targetUrl: s.target_url,
    domain: s.domain,
    scannedAt: s.scanned_at,
    evidence: mapEvidence(s.evidence),
    observations: [],
    hypotheses: mapHypotheses(s),
    judgment: mapJudgment(s),
    recommendation: mapRecommendation(s),
    uncertainty: mapUncertainty(s),
    status: s.status,
  };
}
