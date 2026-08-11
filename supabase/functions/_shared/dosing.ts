/**
 * Commercial Dosing Engine — Signal & Friction
 *
 * See src/lib/dosing.ts for what the marker below is for.
 * MIRROR-SYNC-START
 *
 * Single source of truth for "which of the 7 scaffold judgment fields does
 * a given service level see, and how." A scaffold's 7 fields are filled
 * ONCE by a human; every output (free teaser, DWY tier, DFY tier) is a
 * pure function of that one filled scaffold plus this config — nothing
 * here ever re-asks the human to redact their own judgment per tier.
 *
 * Two structurally different axes, per the approved strategy:
 *   - DWY: only the FREE TEASER is information-dosed. Every paid tier
 *     receives the complete 7-field judgment, including the recommended
 *     decision and what to avoid. Later tiers add implementation,
 *     monitoring, expansion, or autonomy work; they do not unlock pieces
 *     of a diagnosis already purchased. Teaser redaction is 100%
 *     deterministic — zero AI calls anywhere in this file, on purpose.
 *     Partial teaser reveals use 3 companion enums (funnel_stage,
 *     projected_impact_magnitude, confidence_level) plus 6 static
 *     per-mechanism sentences — never a paraphrase of the human's own
 *     free text, which would be a fabrication-adjacent risk.
 *   - DFY: the axis is WORK COMPLETENESS, not disclosure. All 7 fields
 *     are full from Beta Diagnostic upward — withholding the fix doesn't
 *     protect anything when the client isn't the one executing it. The
 *     upsell driver across DFY tiers is the 3 dfy_* fields, which are
 *     honestly absent (labeled, not faked) until real delivery work has
 *     happened — they cannot be derived from the original scaffold fill,
 *     because the work doesn't exist yet at that point.
 */

export type DwyTier = "beta_diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit";
export type DfyTier = "beta_diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit";
export type Line = "dwy" | "dfy";
export type FrictionMechanism =
  | "cognitive_load" | "trust_deficit" | "commitment_anxiety"
  | "ordering_error" | "identity_friction" | "value_uncertainty";
export type FunnelStage = "landing" | "pricing" | "signup" | "checkout" | "activation";
export type MagnitudeLevel = "low" | "moderate" | "high";
export type ConfidenceLevel = "low" | "moderate" | "high";

// The 7 judgment fields, always exactly this shape regardless of tier —
// this is literally the diagnostic_scaffolds row, filled once.
export interface ScaffoldJudgment {
  friction_mechanism: FrictionMechanism | null;
  specific_friction_point: string | null;
  why_blocks_conversion: string | null;
  projected_impact: string | null;
  the_decision: string | null;
  what_to_avoid: string | null;
  confidence_and_why: string | null;
  funnel_stage: FunnelStage | null;
  projected_impact_magnitude: MagnitudeLevel | null;
  confidence_level: ConfidenceLevel | null;
  dfy_execution_summary: string | null;
  dfy_monitoring_findings: string | null;
  dfy_handoff_documentation: string | null;
}

type Disclosure = "full" | "region" | "directional" | "partial_label" | "withheld";

type DwyDosingRule = Record<
  Exclude<keyof ScaffoldJudgment, "funnel_stage" | "projected_impact_magnitude" | "confidence_level" | "dfy_execution_summary" | "dfy_monitoring_findings" | "dfy_handoff_documentation">,
  Disclosure
>;

// ── DWY dosing config — matches the approved strategy doc field-by-field ──
export const DWY_DOSING: Record<"teaser" | DwyTier, DwyDosingRule> = {
  teaser: {
    friction_mechanism: "full",
    specific_friction_point: "region",
    why_blocks_conversion: "partial_label",
    projected_impact: "directional",
    the_decision: "withheld",
    what_to_avoid: "withheld",
    confidence_and_why: "partial_label",
  },
  beta_diagnostic: {
    friction_mechanism: "full",
    specific_friction_point: "full",
    why_blocks_conversion: "full",
    projected_impact: "full",
    the_decision: "full",
    what_to_avoid: "full",
    confidence_and_why: "full",
  },
  intervention: {
    friction_mechanism: "full", specific_friction_point: "full", why_blocks_conversion: "full",
    projected_impact: "full", the_decision: "full", what_to_avoid: "full", confidence_and_why: "full",
  },
  monitoring: {
    // Same field disclosure as intervention — monitoring's value is
    // evidence-tier upgrade (modeled -> measured via PostHog, Part 3b),
    // not revealing more of the 7 fields. See dosing decision log below.
    friction_mechanism: "full", specific_friction_point: "full", why_blocks_conversion: "full",
    projected_impact: "full", the_decision: "full", what_to_avoid: "full", confidence_and_why: "full",
  },
  expansion: {
    // Applies to a NEW scaffold instance for the new surface — same rules,
    // fresh fields.
    friction_mechanism: "full", specific_friction_point: "full", why_blocks_conversion: "full",
    projected_impact: "full", the_decision: "full", what_to_avoid: "full", confidence_and_why: "full",
  },
  autonomy_kit: {
    friction_mechanism: "full", specific_friction_point: "full", why_blocks_conversion: "full",
    projected_impact: "full", the_decision: "full", what_to_avoid: "full", confidence_and_why: "full",
  },
};

// ── DFY dosing config — full reveal from Beta upward; the upsell axis is
// the 3 dfy_* fields below, honestly absent until real work exists. ──
export const DFY_TIER_SCOPE: Record<DfyTier, { includesExecutionSummary: boolean; includesMonitoringFindings: boolean; includesHandoffDocumentation: boolean }> = {
  beta_diagnostic: { includesExecutionSummary: false, includesMonitoringFindings: false, includesHandoffDocumentation: false },
  intervention:    { includesExecutionSummary: true,  includesMonitoringFindings: false, includesHandoffDocumentation: false },
  monitoring:      { includesExecutionSummary: true,  includesMonitoringFindings: true,  includesHandoffDocumentation: false },
  expansion:       { includesExecutionSummary: true,  includesMonitoringFindings: false, includesHandoffDocumentation: false },
  autonomy_kit:    { includesExecutionSummary: true,  includesMonitoringFindings: true,  includesHandoffDocumentation: true },
};

export const NOT_YET_DELIVERED = "Not yet delivered.";

// ── Static, reusable per-mechanism sentences — written once, never a
// paraphrase of any specific scaffold's own text. ──
export const MECHANISM_SENTENCES: Record<FrictionMechanism, string> = {
  cognitive_load: "When a decision takes more mental effort than expected, most people don't push through — they leave and decide later, which usually means never.",
  trust_deficit: "When trust-related uncertainty shows up at a decision point, visitors read the silence as risk — and the safe move is to walk away, not ask.",
  commitment_anxiety: "When a step feels harder to undo than it should, visitors hesitate before starting at all — not because the product is wrong for them, but because backing out looks costly.",
  ordering_error: "When information arrives in the wrong sequence, visitors are asked to decide before they have what they need to decide — so they stall exactly where the sequence breaks.",
  identity_friction: "When a page doesn't clearly reflect who it's for, visitors quietly conclude \"this isn't built for someone like me\" and leave without engaging the actual offer.",
  value_uncertainty: "When the value of acting isn't obvious before the ask, visitors default to the safest choice — doing nothing — rather than gambling on an unclear payoff.",
};

export const MECHANISM_LABELS: Record<FrictionMechanism, string> = {
  cognitive_load: "cognitive load",
  trust_deficit: "trust deficit",
  commitment_anxiety: "commitment anxiety",
  ordering_error: "ordering error",
  identity_friction: "identity friction",
  value_uncertainty: "value uncertainty",
};

const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  landing: "your homepage",
  pricing: "your pricing page",
  signup: "your signup flow",
  checkout: "checkout",
  activation: "the first-use experience after signup",
};

const MAGNITUDE_PHRASES: Record<MagnitudeLevel, string> = {
  low: "likely a smaller, but real, share of otherwise-ready signups at this stage",
  moderate: "likely costing a meaningful, double-digit share of otherwise-ready signups at this stage",
  high: "likely costing a substantial share of otherwise-ready signups at this stage",
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: "Low", moderate: "Moderate", high: "High",
};

/**
 * Free prospecting teaser — pre-purchase, always uses DWY_DOSING.teaser
 * regardless of which line the prospect eventually buys. Plain text,
 * ready to paste into outreach. the_decision and what_to_avoid never
 * enter this function's control flow at all — there is no branch that
 * reads them.
 */
export function generateTeaser(scaffold: ScaffoldJudgment): string {
  if (!scaffold.friction_mechanism) {
    throw new Error("Cannot generate a teaser from a scaffold with no friction_mechanism set.");
  }

  const mechanismLabel = MECHANISM_LABELS[scaffold.friction_mechanism];
  const region = scaffold.funnel_stage ? FUNNEL_STAGE_LABELS[scaffold.funnel_stage] : "your funnel";
  const causalSentence = MECHANISM_SENTENCES[scaffold.friction_mechanism];
  const magnitude = scaffold.projected_impact_magnitude
    ? MAGNITUDE_PHRASES[scaffold.projected_impact_magnitude]
    : "likely a real, measurable share of otherwise-ready signups at this stage";
  const confidenceLabel = scaffold.confidence_level ? CONFIDENCE_LABELS[scaffold.confidence_level] : "Moderate";

  return [
    `Signal & Friction found a specific ${mechanismLabel} on ${region}.`,
    ``,
    causalSentence,
    ``,
    `${magnitude[0].toUpperCase()}${magnitude.slice(1)} (modeled estimate, not a measured number).`,
    ``,
    `Confidence: ${confidenceLabel} — based on multiple converging signals. Sharpens further with real session data.`,
    ``,
    `I know exactly where this is and how to fix it. Want the full diagnostic?`,
  ].join("\n");
}

// ── Dosed output for a purchased tier — used by the (still manual) publish
// step, never auto-published. Withheld fields are OMITTED from the
// returned object entirely (not set to null, not present-but-empty) —
// the object literally doesn't have the key, so nothing downstream can
// accidentally serialize it. ──
export interface DosedOutput {
  line: Line;
  tier: DwyTier | DfyTier;
  fields: Partial<Record<keyof DwyDosingRule, string>>;
  dfyDelivery?: {
    execution_summary: string;
    monitoring_findings: string;
    handoff_documentation: string;
  };
}

export function applyDosing(scaffold: ScaffoldJudgment, line: Line, tier: DwyTier | DfyTier): DosedOutput {
  if (line === "dwy") {
    const rules = DWY_DOSING[tier];
    const fields: DosedOutput["fields"] = {};

    if (rules.friction_mechanism === "full" && scaffold.friction_mechanism) {
      fields.friction_mechanism = MECHANISM_LABELS[scaffold.friction_mechanism];
    }
    if (rules.specific_friction_point === "full" && scaffold.specific_friction_point) {
      fields.specific_friction_point = scaffold.specific_friction_point;
    } else if (rules.specific_friction_point === "region" && scaffold.funnel_stage) {
      fields.specific_friction_point = FUNNEL_STAGE_LABELS[scaffold.funnel_stage];
    }
    if (rules.why_blocks_conversion === "full" && scaffold.why_blocks_conversion) {
      fields.why_blocks_conversion = scaffold.why_blocks_conversion;
    } else if (rules.why_blocks_conversion === "partial_label" && scaffold.friction_mechanism) {
      fields.why_blocks_conversion = MECHANISM_SENTENCES[scaffold.friction_mechanism];
    }
    if (rules.projected_impact === "full" && scaffold.projected_impact) {
      fields.projected_impact = scaffold.projected_impact;
    } else if (rules.projected_impact === "directional" && scaffold.projected_impact_magnitude) {
      fields.projected_impact = MAGNITUDE_PHRASES[scaffold.projected_impact_magnitude];
    }
    if (rules.the_decision === "full" && scaffold.the_decision) {
      fields.the_decision = scaffold.the_decision;
    }
    if (rules.what_to_avoid === "full" && scaffold.what_to_avoid) {
      fields.what_to_avoid = scaffold.what_to_avoid;
    }
    if (rules.confidence_and_why === "full" && scaffold.confidence_and_why) {
      fields.confidence_and_why = scaffold.confidence_and_why;
    } else if (rules.confidence_and_why === "partial_label" && scaffold.confidence_level) {
      fields.confidence_and_why = `${CONFIDENCE_LABELS[scaffold.confidence_level]} confidence.`;
    }

    return { line, tier, fields };
  }

  // DFY: all 7 fields full, always — see file header.
  const fields: DosedOutput["fields"] = {
    friction_mechanism: scaffold.friction_mechanism ? MECHANISM_LABELS[scaffold.friction_mechanism] : undefined,
    specific_friction_point: scaffold.specific_friction_point ?? undefined,
    why_blocks_conversion: scaffold.why_blocks_conversion ?? undefined,
    projected_impact: scaffold.projected_impact ?? undefined,
    the_decision: scaffold.the_decision ?? undefined,
    what_to_avoid: scaffold.what_to_avoid ?? undefined,
    confidence_and_why: scaffold.confidence_and_why ?? undefined,
  };

  const scope = DFY_TIER_SCOPE[tier as DfyTier];
  return {
    line,
    tier,
    fields,
    dfyDelivery: {
      execution_summary: scope.includesExecutionSummary
        ? (scaffold.dfy_execution_summary ?? NOT_YET_DELIVERED)
        : NOT_YET_DELIVERED,
      monitoring_findings: scope.includesMonitoringFindings
        ? (scaffold.dfy_monitoring_findings ?? NOT_YET_DELIVERED)
        : NOT_YET_DELIVERED,
      handoff_documentation: scope.includesHandoffDocumentation
        ? (scaffold.dfy_handoff_documentation ?? NOT_YET_DELIVERED)
        : NOT_YET_DELIVERED,
    },
  };
}

// MIRROR-SYNC-END
