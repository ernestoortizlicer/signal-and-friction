/**
 * Regression test for the paid-delivery contract and its boundary with
 * the free teaser. dosing.test.ts (Deno) covers the edge runtime in more
 * depth; this also calls mapDosedScaffoldToDelivery(), the function
 * handlePublishDelivery actually uses in src/app/admin/dashboard/page.tsx.
 * No test framework is configured in this project (no Jest/Vitest) — run
 * directly with Node, which has native TS type-stripping for erasable
 * syntax (this file has no enums/decorators, so it works unflagged):
 *
 *   node src/lib/dosing.publish.test.mjs
 */
import { generateTeaser, mapDosedScaffoldToDelivery } from "./dosing.ts";

const SAMPLE = {
  friction_mechanism: "trust_deficit",
  specific_friction_point: "Pricing page shows 3 tiers but never states what happens after the trial ends.",
  why_blocks_conversion: "Visitors hit an unanswered question right at the decision moment.",
  projected_impact: "Likely costing a meaningful share of otherwise-ready signups.",
  the_decision: "Add 'Cancel anytime, no charge until day 15' directly under the CTA.",
  what_to_avoid: "Don't bury this in a FAQ or Terms link.",
  confidence_and_why: "High — a well-documented trust pattern, directly observable on the page.",
  funnel_stage: "pricing",
  projected_impact_magnitude: "moderate",
  confidence_level: "high",
  dfy_execution_summary: null,
  dfy_monitoring_findings: null,
  dfy_handoff_documentation: null,
};

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

// The paid Diagnostic contract includes both the recommended decision and
// what not to do. Information dosing stops at the free teaser boundary.
const teaser = generateTeaser(SAMPLE);
check("free teaser: never reveals the recommended decision", !teaser.includes(SAMPLE.the_decision));
check("free teaser: never reveals what not to do", !teaser.includes(SAMPLE.what_to_avoid));

const betaDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dwy", "beta_diagnostic");
check("DWY beta: finalDecision carries the promised recommendation", betaDelivery.finalDecision?.action === SAMPLE.the_decision);
check("DWY beta: finalDecision retains the analyst's reasoning", betaDelivery.finalDecision?.reasoning === SAMPLE.why_blocks_conversion);
check("DWY beta: avoid carries the promised what-not-to-do judgment", betaDelivery.avoid[0]?.action === SAMPLE.what_to_avoid);
check("DWY beta: serialized payload contains the_decision text", JSON.stringify(betaDelivery).includes(SAMPLE.the_decision));
check("DWY beta: serialized payload contains what_to_avoid text", JSON.stringify(betaDelivery).includes(SAMPLE.what_to_avoid));
check("DWY beta: diagnosis (mechanism/rootCause) IS present", betaDelivery.friction.mechanism.length > 0 && betaDelivery.friction.rootCause.length > 0);

const interventionDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dwy", "intervention");
check("DWY intervention: finalDecision.action reveals the real decision", interventionDelivery.finalDecision?.action === SAMPLE.the_decision);
check("DWY intervention: avoid array reveals the real avoid text", interventionDelivery.avoid[0]?.action === SAMPLE.what_to_avoid);

const dfyBetaDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dfy", "beta_diagnostic");
check("DFY beta: finalDecision revealed immediately (DFY has no disclosure withholding)", dfyBetaDelivery.finalDecision?.action === SAMPLE.the_decision);
check("DFY beta: avoid reveals what not to do", dfyBetaDelivery.avoid[0]?.action === SAMPLE.what_to_avoid);

// Phase 4.0 — dfyDelivery must no longer be silently dropped between
// applyDosing() and the delivery payload.
check("DWY beta: dfyDelivery is null (DWY has no execution/monitoring/handoff concept)", betaDelivery.dfyDelivery === null);
check("DFY beta: dfyDelivery is present (not dropped)", dfyBetaDelivery.dfyDelivery !== null);
check(
  "DFY beta: execution_summary honestly labeled NOT_YET_DELIVERED (Beta scope excludes it, scaffold has none)",
  dfyBetaDelivery.dfyDelivery?.execution_summary === "Not yet delivered."
);

const scaffoldWithRealExecution = { ...SAMPLE, dfy_execution_summary: "Rebuilt the pricing page trial-end messaging directly." };
const dfyInterventionDelivery = mapDosedScaffoldToDelivery(scaffoldWithRealExecution, "dfy", "intervention");
check(
  "DFY intervention: real execution_summary survives the mapping (DFY_TIER_SCOPE.intervention.includesExecutionSummary)",
  dfyInterventionDelivery.dfyDelivery?.execution_summary === "Rebuilt the pricing page trial-end messaging directly."
);
check(
  "DFY intervention: monitoring_findings still honestly NOT_YET_DELIVERED (out of scope at this tier)",
  dfyInterventionDelivery.dfyDelivery?.monitoring_findings === "Not yet delivered."
);

const scaffoldWithFullDfyWork = {
  ...SAMPLE,
  dfy_execution_summary: "Rebuilt the pricing page trial-end messaging directly.",
  dfy_monitoring_findings: "Trial-to-paid conversion up 4.2pts over 30 days, measured via Stripe.",
  dfy_handoff_documentation: "Runbook: review trial messaging quarterly against churn cohort data.",
};
const dfyAutonomyDelivery = mapDosedScaffoldToDelivery(scaffoldWithFullDfyWork, "dfy", "autonomy_kit");
check(
  "DFY autonomy_kit: all 3 dfyDelivery fields carry real content (full DFY_TIER_SCOPE)",
  dfyAutonomyDelivery.dfyDelivery?.execution_summary === scaffoldWithFullDfyWork.dfy_execution_summary &&
  dfyAutonomyDelivery.dfyDelivery?.monitoring_findings === scaffoldWithFullDfyWork.dfy_monitoring_findings &&
  dfyAutonomyDelivery.dfyDelivery?.handoff_documentation === scaffoldWithFullDfyWork.dfy_handoff_documentation
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
