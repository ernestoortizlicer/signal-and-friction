/**
 * Delivery policy — the typed, testable link between a commercial offer
 * and the client experience it's allowed to produce.
 * ════════════════════════════════════════════════════════════════════════════
 * Phase 4.3. This is the layer the audit found missing: dosing.ts already
 * governs which of the 7 scaffold fields' TEXT a tier sees, but nothing
 * before this file has ever governed which SECTIONS, MODULES, or ASSETS a
 * tier is allowed to show. Ten offers existed; two page shells rendered
 * them, differentiated only by whichever optional fields an admin happened
 * to fill in that day.
 *
 * priceId here is always read from offer-catalog.ts's own OfferPhase
 * objects (via priceIdForLineTier below) — never a hand-typed string
 * literal duplicating that file's identifiers. offer-catalog.ts remains
 * the sole commercial source of truth for price/name/scope copy; this
 * file only adds "and here is what that purchase is allowed to look like."
 *
 * Field presence still controls whether a module has content to show.
 * This file controls whether that content is allowed to belong to the
 * purchased experience in the first place — the two are independent, by
 * design (see DeliverableModulePolicy below).
 */

import { DWY_LADDER, DFY_LADDER } from "./offer-catalog.ts";
import type { Line, DwyTier, DfyTier } from "./dosing.ts";

// ── Module vocabulary ───────────────────────────────────────────────────

export type DeliverableModuleId =
  | "evidence"
  | "observation"
  | "behavioralInterpretation"
  | "ruledOutAlternative"
  | "judgment"
  | "recommendation"
  | "implementationPlan"
  | "expectedBeforeAfter"
  | "measuredBeforeAfter"
  | "monitoringFindings"
  | "executionSummary"
  | "unknowns"
  | "founderLearningModules"
  | "teamRunbook"
  | "embeddedVideo"
  | "checklist"
  | "handoffDocumentation";

export const ALL_MODULE_IDS: DeliverableModuleId[] = [
  "evidence", "observation", "behavioralInterpretation", "ruledOutAlternative",
  "judgment", "recommendation", "implementationPlan", "expectedBeforeAfter",
  "measuredBeforeAfter", "monitoringFindings", "executionSummary", "unknowns",
  "founderLearningModules", "teamRunbook", "embeddedVideo", "checklist",
  "handoffDocumentation",
];

/**
 * required   — core to this service's promise. The publish UI warns (not
 *               blocks — see admin safeguards) when the underlying data is
 *               completely absent. A module rendering a "required" slot
 *               with no content shows an honest pending/absent state, not
 *               nothing — silently omitting a required module reads as
 *               "we forgot", not "not applicable here".
 * allowed    — shown only when real content exists; fully omitted, no
 *               warning, when it doesn't. This is where field-presence
 *               alone still governs.
 * withheld   — the concept applies to this line, but this tier
 *               deliberately does not show it (e.g. the recommendation at
 *               DWY Diagnostic) — enforced here even if the underlying
 *               data happens to be present, which is the whole point:
 *               the policy is the gate, not what an admin typed that day.
 * unsupported— the concept doesn't exist for this line/tier at all (e.g.
 *               executionSummary for any DWY tier).
 */
export type DeliverableModulePolicy = "required" | "allowed" | "withheld" | "unsupported";

export interface VideoGuidance {
  role: string;
  approxDurationMinutes: [number, number];
}

export interface ServiceDeliveryPolicy {
  priceId: string;
  line: Line;
  tier: DwyTier | DfyTier;
  modules: Record<DeliverableModuleId, DeliverableModulePolicy>;
  videoGuidance: VideoGuidance;
}

// ── priceId lookup — derived from offer-catalog.ts, never duplicated ───

const TIER_ORDER: Record<DwyTier | DfyTier, 1 | 2 | 3 | 4 | 5> = {
  beta_diagnostic: 1, intervention: 2, monitoring: 3, expansion: 4, autonomy_kit: 5,
};

export function priceIdForLineTier(line: Line, tier: DwyTier | DfyTier): string {
  const ladder = line === "dwy" ? DWY_LADDER : DFY_LADDER;
  const order = TIER_ORDER[tier];
  const phase = ladder.find((p) => p.order === order);
  if (!phase) throw new Error(`No offer-catalog phase for ${line}/${tier} (order ${order})`);
  return phase.priceId;
}

// ── The 10 policies ──────────────────────────────────────────────────────

const dwyDiagnosticModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "withheld", // dosing.ts DWY_DOSING.beta_diagnostic withholds the_decision/what_to_avoid
  implementationPlan: "unsupported", // "Do not show: implementation plans" before a fix has been selected
  expectedBeforeAfter: "unsupported", // "inappropriate before a fix has been selected or implemented"
  measuredBeforeAfter: "unsupported",
  monitoringFindings: "unsupported",
  executionSummary: "unsupported", // DWY has no execution concept at all
  unknowns: "allowed",
  founderLearningModules: "unsupported",
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

const dwyInterventionModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "required", // the tier's core unlock — dosing.ts reveals it full here
  implementationPlan: "required", // "must be structurally distinct from a prose recommendation"
  expectedBeforeAfter: "allowed", // "clearly labeled as expected or modeled unless already measured"
  measuredBeforeAfter: "unsupported", // nothing has been measured yet — that's Monitoring's job
  monitoringFindings: "unsupported",
  executionSummary: "unsupported",
  unknowns: "allowed",
  founderLearningModules: "unsupported", // that's Autonomy Kit's job specifically
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

const dwyMonitoringModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "required", // "next friction or next decision"
  implementationPlan: "unsupported", // already done by this point
  expectedBeforeAfter: "unsupported",
  measuredBeforeAfter: "required", // the tier's whole promise — must render honestly even with no data yet
  monitoringFindings: "required",
  executionSummary: "unsupported",
  unknowns: "allowed",
  founderLearningModules: "unsupported",
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

// "Reuse the Diagnostic experience intentionally... Do not invent
// structural differentiation merely to make it look more expensive" —
// this is the one tier where being policy-identical to Diagnostic is the
// correct, deliberate design, not an oversight.
const dwyExpansionModules: Record<DeliverableModuleId, DeliverableModulePolicy> = { ...dwyDiagnosticModules };

const dwyAutonomyModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "allowed",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "allowed",
  recommendation: "allowed",
  implementationPlan: "allowed",
  expectedBeforeAfter: "allowed",
  measuredBeforeAfter: "allowed", // "worked examples where available"
  monitoringFindings: "unsupported",
  executionSummary: "unsupported",
  unknowns: "allowed",
  founderLearningModules: "required", // the defining module
  teamRunbook: "unsupported", // DFY Autonomy's distinct artifact, not this tier's
  embeddedVideo: "allowed",
  checklist: "required", // "This is the correct home for DWY checklist and learning-module interfaces"
  handoffDocumentation: "unsupported",
};

const dfyDiagnosticModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "required", // DFY never withholds — framed as proposed execution direction, not an assignment
  implementationPlan: "unsupported", // DFY's "plan" is S&F's own — carried in recommendation framing, not a client task list
  expectedBeforeAfter: "unsupported",
  measuredBeforeAfter: "unsupported",
  monitoringFindings: "unsupported",
  executionSummary: "unsupported", // nothing executed yet — DFY_TIER_SCOPE.beta_diagnostic.includesExecutionSummary === false
  unknowns: "allowed",
  founderLearningModules: "unsupported",
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

const dfyInterventionModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "required",
  implementationPlan: "unsupported",
  expectedBeforeAfter: "unsupported",
  measuredBeforeAfter: "allowed",
  monitoringFindings: "unsupported",
  executionSummary: "required", // the defining module — "What We Did"
  unknowns: "allowed",
  founderLearningModules: "unsupported",
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

const dfyMonitoringModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "required",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "required",
  recommendation: "required",
  implementationPlan: "unsupported",
  expectedBeforeAfter: "unsupported",
  measuredBeforeAfter: "allowed",
  monitoringFindings: "required", // the defining module — "What We Found"
  executionSummary: "allowed", // continuity context — DFY_TIER_SCOPE.monitoring.includesExecutionSummary === true, but not this tier's star
  unknowns: "allowed",
  founderLearningModules: "unsupported",
  teamRunbook: "unsupported",
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "unsupported",
};

// "Reuse the DFY Intervention structure, scoped to the new surface... Do
// not treat it as a generic second diagnostic" — matches
// DFY_TIER_SCOPE.expansion === DFY_TIER_SCOPE.intervention exactly.
const dfyExpansionModules: Record<DeliverableModuleId, DeliverableModulePolicy> = { ...dfyInterventionModules };

const dfyAutonomyModules: Record<DeliverableModuleId, DeliverableModulePolicy> = {
  evidence: "allowed",
  observation: "allowed",
  behavioralInterpretation: "allowed",
  ruledOutAlternative: "allowed",
  judgment: "allowed",
  recommendation: "allowed",
  implementationPlan: "unsupported",
  expectedBeforeAfter: "unsupported",
  measuredBeforeAfter: "allowed",
  monitoringFindings: "allowed", // DFY_TIER_SCOPE.autonomy_kit.includesMonitoringFindings === true
  executionSummary: "allowed", // DFY_TIER_SCOPE.autonomy_kit.includesExecutionSummary === true
  unknowns: "allowed",
  founderLearningModules: "unsupported", // "must not reuse the founder-oriented DWY Autonomy checklist"
  teamRunbook: "required", // the defining module — institutional capability transfer
  embeddedVideo: "allowed",
  checklist: "unsupported",
  handoffDocumentation: "required", // DFY_TIER_SCOPE.autonomy_kit.includesHandoffDocumentation === true
};

// Duration ranges are the product guideline given in the Phase 4 brief for
// every DWY tier and for the DFY tiers with a directly analogous job
// (Monitoring's "periodic interpretation" cadence, Autonomy's "capability
// transfer" framing) — never validated anywhere, purely descriptive copy
// surfaced next to the video player.
const POLICIES: ServiceDeliveryPolicy[] = [
  { priceId: priceIdForLineTier("dwy", "beta_diagnostic"), line: "dwy", tier: "beta_diagnostic", modules: dwyDiagnosticModules, videoGuidance: { role: "Explain the evidence → interpretation → judgment chain.", approxDurationMinutes: [3, 5] } },
  { priceId: priceIdForLineTier("dwy", "intervention"), line: "dwy", tier: "intervention", modules: dwyInterventionModules, videoGuidance: { role: "Demonstrate the intervention and guide execution.", approxDurationMinutes: [5, 8] } },
  { priceId: priceIdForLineTier("dwy", "monitoring"), line: "dwy", tier: "monitoring", modules: dwyMonitoringModules, videoGuidance: { role: "Concise periodic interpretation of signal movement.", approxDurationMinutes: [2, 3] } },
  { priceId: priceIdForLineTier("dwy", "expansion"), line: "dwy", tier: "expansion", modules: dwyExpansionModules, videoGuidance: { role: "Explain the evidence → interpretation → judgment chain for this new surface.", approxDurationMinutes: [3, 5] } },
  { priceId: priceIdForLineTier("dwy", "autonomy_kit"), line: "dwy", tier: "autonomy_kit", modules: dwyAutonomyModules, videoGuidance: { role: "Framework transfer and applied instruction.", approxDurationMinutes: [10, 15] } },
  { priceId: priceIdForLineTier("dfy", "beta_diagnostic"), line: "dfy", tier: "beta_diagnostic", modules: dfyDiagnosticModules, videoGuidance: { role: "Explain the dominant friction and the proposed execution direction.", approxDurationMinutes: [4, 6] } },
  { priceId: priceIdForLineTier("dfy", "intervention"), line: "dfy", tier: "intervention", modules: dfyInterventionModules, videoGuidance: { role: "Demonstrate what was implemented and why.", approxDurationMinutes: [5, 8] } },
  { priceId: priceIdForLineTier("dfy", "monitoring"), line: "dfy", tier: "monitoring", modules: dfyMonitoringModules, videoGuidance: { role: "Concise periodic interpretation of signal movement.", approxDurationMinutes: [2, 3] } },
  { priceId: priceIdForLineTier("dfy", "expansion"), line: "dfy", tier: "expansion", modules: dfyExpansionModules, videoGuidance: { role: "Demonstrate what was implemented and why, for this new surface.", approxDurationMinutes: [5, 8] } },
  { priceId: priceIdForLineTier("dfy", "autonomy_kit"), line: "dfy", tier: "autonomy_kit", modules: dfyAutonomyModules, videoGuidance: { role: "Institutional capability transfer and applied instruction.", approxDurationMinutes: [10, 15] } },
];

const POLICY_BY_PRICE_ID = new Map(POLICIES.map((p) => [p.priceId, p]));

export function getDeliveryPolicy(priceId: string | null | undefined): ServiceDeliveryPolicy | null {
  if (!priceId) return null;
  return POLICY_BY_PRICE_ID.get(priceId) ?? null;
}

export function getAllDeliveryPolicies(): ServiceDeliveryPolicy[] {
  return POLICIES;
}
