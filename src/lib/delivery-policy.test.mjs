/**
 * Regression tests for the delivery-policy layer (Phase 4.3). Run with:
 *   node src/lib/delivery-policy.test.mjs
 */
import { ALL_LADDERS } from "./offer-catalog.ts";
import { getDeliveryPolicy, getAllDeliveryPolicies, ALL_MODULE_IDS, priceIdForLineTier } from "./delivery-policy.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

const policies = getAllDeliveryPolicies();

// ── Requirement 1: every offer ID resolves to exactly one delivery policy ──
check("exactly 10 offers in the catalog", ALL_LADDERS.length === 10);
check("exactly 10 delivery policies exist", policies.length === 10);
for (const phase of ALL_LADDERS) {
  const policy = getDeliveryPolicy(phase.priceId);
  check(`offer ${phase.priceId} resolves to exactly one policy`, !!policy && policy.priceId === phase.priceId);
}
// No orphan policy references a priceId that isn't a real catalog offer.
const catalogIds = new Set(ALL_LADDERS.map((p) => p.priceId));
for (const policy of policies) {
  check(`policy priceId ${policy.priceId} is a real offer-catalog id`, catalogIds.has(policy.priceId));
}
// No duplicate policies for the same priceId.
check("no duplicate priceIds across policies", new Set(policies.map((p) => p.priceId)).size === policies.length);

// ── Requirement 2: no offer policy references an unknown module ────────
const knownModules = new Set(ALL_MODULE_IDS);
for (const policy of policies) {
  const keys = Object.keys(policy.modules);
  check(`${policy.priceId}: declares exactly the known module set, nothing extra/missing`, keys.length === ALL_MODULE_IDS.length && keys.every((k) => knownModules.has(k)));
}

// ── Requirement 3: Diagnostic tiers cannot receive implementation, monitoring, or autonomy-only modules ──
const AUTONOMY_ONLY = ["founderLearningModules", "teamRunbook", "checklist", "handoffDocumentation"];
const IMPLEMENTATION_ONLY = ["implementationPlan"];
const MONITORING_ONLY = ["monitoringFindings"];

function forbidsAll(policy, moduleIds) {
  return moduleIds.every((m) => policy.modules[m] === "withheld" || policy.modules[m] === "unsupported");
}

const dwyDiagnostic = getDeliveryPolicy(priceIdForLineTier("dwy", "beta_diagnostic"));
const dwyExpansion = getDeliveryPolicy(priceIdForLineTier("dwy", "expansion"));
const dfyDiagnostic = getDeliveryPolicy(priceIdForLineTier("dfy", "beta_diagnostic"));

for (const [label, policy] of [["DWY Diagnostic", dwyDiagnostic], ["DWY Expansion", dwyExpansion], ["DFY Diagnostic", dfyDiagnostic]]) {
  check(`${label}: cannot receive implementation-only modules`, forbidsAll(policy, IMPLEMENTATION_ONLY));
  check(`${label}: cannot receive monitoring-only modules`, forbidsAll(policy, MONITORING_ONLY));
  check(`${label}: cannot receive autonomy-only modules`, forbidsAll(policy, AUTONOMY_ONLY));
  check(`${label}: evidence, judgment, and recommendation are all required`,
    policy.modules.evidence === "required" &&
    policy.modules.judgment === "required" &&
    policy.modules.recommendation === "required"
  );
}
check("both paid Diagnostic lines require the promised recommendation",
  dwyDiagnostic.modules.recommendation === "required" && dfyDiagnostic.modules.recommendation === "required"
);
check("DWY Expansion is policy-identical to DWY Diagnostic by design", JSON.stringify(dwyExpansion.modules) === JSON.stringify(dwyDiagnostic.modules));

// ── Service-defining modules land exactly where the product brief says ──
const dfyIntervention = getDeliveryPolicy(priceIdForLineTier("dfy", "intervention"));
const dfyMonitoring = getDeliveryPolicy(priceIdForLineTier("dfy", "monitoring"));
const dfyAutonomy = getDeliveryPolicy(priceIdForLineTier("dfy", "autonomy_kit"));
const dwyIntervention = getDeliveryPolicy(priceIdForLineTier("dwy", "intervention"));
const dwyAutonomy = getDeliveryPolicy(priceIdForLineTier("dwy", "autonomy_kit"));

check("DFY Intervention: executionSummary is required (the restored bug, now load-bearing)", dfyIntervention.modules.executionSummary === "required");
check("DFY Monitoring: monitoringFindings is required", dfyMonitoring.modules.monitoringFindings === "required");
check("DFY Autonomy: handoffDocumentation is required", dfyAutonomy.modules.handoffDocumentation === "required");
check("DFY Autonomy: founderLearningModules is unsupported (must not reuse the DWY checklist)", dfyAutonomy.modules.founderLearningModules === "unsupported");
check("DWY Intervention: implementationPlan is required", dwyIntervention.modules.implementationPlan === "required");
check("DWY Autonomy: checklist and founderLearningModules are both required", dwyAutonomy.modules.checklist === "required" && dwyAutonomy.modules.founderLearningModules === "required");
check("DWY Autonomy: teamRunbook is unsupported (that's the DFY artifact)", dwyAutonomy.modules.teamRunbook === "unsupported");
check("DFY Expansion mirrors DFY Intervention by design", JSON.stringify(getDeliveryPolicy(priceIdForLineTier("dfy", "expansion")).modules) === JSON.stringify(dfyIntervention.modules));

// ── unknowns is never withheld/unsupported anywhere — it's not a premium feature ──
for (const policy of policies) {
  check(`${policy.priceId}: unknowns is never withheld or unsupported`, policy.modules.unknowns === "required" || policy.modules.unknowns === "allowed");
}

// ── Backward compatibility: a deliverable with no offerPriceId (every
// deliverable published before Phase 4.3) must never resolve a policy —
// this is the entire routing switch DeliverableClientView.tsx relies on
// to fall through to the original, untouched rendering. ──
check("getDeliveryPolicy(undefined) -> null", getDeliveryPolicy(undefined) === null);
check("getDeliveryPolicy(null) -> null", getDeliveryPolicy(null) === null);
check("getDeliveryPolicy('') -> null", getDeliveryPolicy("") === null);
check("getDeliveryPolicy(unknown string) -> null, never a guessed/default policy", getDeliveryPolicy("not-a-real-price-id") === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
