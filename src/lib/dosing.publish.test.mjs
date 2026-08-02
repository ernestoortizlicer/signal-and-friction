/**
 * Regression test for the PUBLISH path specifically — not the teaser.
 * dosing.test.ts (Deno) already covers generateTeaser()/applyDosing();
 * this covers mapDosedScaffoldToDelivery(), the function
 * handlePublishDelivery actually calls in src/app/admin/dashboard/page.tsx.
 * No test framework is configured in this project (no Jest/Vitest) — run
 * directly with Node, which has native TS type-stripping for erasable
 * syntax (this file has no enums/decorators, so it works unflagged):
 *
 *   node src/lib/dosing.publish.test.mjs
 */
import assert from "node:assert/strict";
import { mapDosedScaffoldToDelivery } from "./dosing.ts";

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

// The single most important assertion in this whole file.
const betaDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dwy", "beta_diagnostic");
check("DWY beta: finalDecision is null (not an object with empty strings — genuinely absent)", betaDelivery.finalDecision === null);
check("DWY beta: avoid array is empty", betaDelivery.avoid.length === 0);
check("DWY beta: serialized payload never contains the_decision text", !JSON.stringify(betaDelivery).includes(SAMPLE.the_decision));
check("DWY beta: serialized payload never contains what_to_avoid text", !JSON.stringify(betaDelivery).includes(SAMPLE.what_to_avoid));
check("DWY beta: diagnosis (mechanism/rootCause) IS present", betaDelivery.friction.mechanism.length > 0 && betaDelivery.friction.rootCause.length > 0);

const interventionDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dwy", "intervention");
check("DWY intervention: finalDecision.action reveals the real decision", interventionDelivery.finalDecision?.action === SAMPLE.the_decision);
check("DWY intervention: avoid array reveals the real avoid text", interventionDelivery.avoid[0]?.action === SAMPLE.what_to_avoid);

const dfyBetaDelivery = mapDosedScaffoldToDelivery(SAMPLE, "dfy", "beta_diagnostic");
check("DFY beta: finalDecision revealed immediately (DFY has no disclosure withholding)", dfyBetaDelivery.finalDecision?.action === SAMPLE.the_decision);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
