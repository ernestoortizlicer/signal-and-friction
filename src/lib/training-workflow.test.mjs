/**
 * Diagnostic Calibration — workflow sequencing tests.
 * Run: node --experimental-strip-types src/lib/training-workflow.test.mjs
 */
import {
  STAGE_ORDER, canAdvanceStage, nextStage, hasReachedStage, visibleCaseFields,
  containsNoHiddenFields, isCanonicalMechanism, CANONICAL_MECHANISMS,
  CASE_DISPOSITIONS, isCaseDisposition, dispositionRequiresMechanism,
  REFLECTION_QUESTIONS,
} from "./training-workflow.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

check("stage order has exactly 10 stages", STAGE_ORDER.length === 10);
check("stage order matches the approved sequence verbatim", JSON.stringify(STAGE_ORDER) === JSON.stringify([
  "observation", "evidence_review", "hypothesis", "counter_hypothesis", "socratic_challenge",
  "revision", "judgment", "recommendation", "verdict_revealed", "reflection_complete",
]));

check("cannot advance from observation with empty input", !canAdvanceStage("observation", {}).canAdvance);
check("cannot advance from observation with whitespace-only input", !canAdvanceStage("observation", { observation: "   " }).canAdvance);
check("can advance from observation once real content exists", canAdvanceStage("observation", { observation: "Landing page has 6 fields." }).canAdvance);
check("blocked advance always states a reason", !!canAdvanceStage("observation", {}).reason);
check("hypothesis requires both mechanism and reasoning", !canAdvanceStage("hypothesis", { hypothesisMechanism: "cognitive_load" }).canAdvance);
check("hypothesis advances once both are present", canAdvanceStage("hypothesis", { hypothesisMechanism: "cognitive_load", hypothesisReasoning: "Too many fields." }).canAdvance);
check("socratic_challenge requires at least one non-empty exchange", !canAdvanceStage("socratic_challenge", { socraticExchanges: [] }).canAdvance);
check("socratic_challenge rejects an exchange with an empty response", !canAdvanceStage("socratic_challenge", { socraticExchanges: [{ question: "Why?", response: "" }] }).canAdvance);
check("socratic_challenge advances with a real exchange", canAdvanceStage("socratic_challenge", { socraticExchanges: [{ question: "Why?", response: "Because the evidence shows X." }] }).canAdvance);

check("judgment cannot advance without a disposition", !canAdvanceStage("judgment", { judgmentMechanism: "cognitive_load", judgmentConfidence: "high" }).canAdvance);
check("behavioral judgment requires a mechanism", !canAdvanceStage("judgment", { judgmentDisposition: "behavioral_diagnosis", judgmentConfidence: "high" }).canAdvance);
check("behavioral judgment advances with mechanism + confidence", canAdvanceStage("judgment", { judgmentDisposition: "behavioral_diagnosis", judgmentMechanism: "cognitive_load", judgmentConfidence: "high" }).canAdvance);
check("mixed condition also requires a mechanism", dispositionRequiresMechanism("mixed_condition") && !canAdvanceStage("judgment", { judgmentDisposition: "mixed_condition", judgmentConfidence: "moderate" }).canAdvance);
check("insufficient evidence is a valid abstention with no mechanism", canAdvanceStage("judgment", { judgmentDisposition: "insufficient_evidence", judgmentConfidence: "moderate" }).canAdvance);
check("abstention rejects a forced mechanism", !canAdvanceStage("judgment", { judgmentDisposition: "insufficient_evidence", judgmentMechanism: "value_uncertainty", judgmentConfidence: "moderate" }).canAdvance);

check("recommendation requires BOTH recommendation text and uncertainty notes", !canAdvanceStage("recommendation", { recommendation: "Do X." }).canAdvance);
check("recommendation advances once uncertainty is also stated", canAdvanceStage("recommendation", { recommendation: "Do X.", uncertaintyNotes: "Unclear if segment matters." }).canAdvance);
check("cannot advance past the final stage", !canAdvanceStage("reflection_complete", {}).canAdvance);

check("exactly 7 mandatory reflection questions defined", REFLECTION_QUESTIONS.length === 7);
check("cannot leave verdict_revealed with zero reflection answers", !canAdvanceStage("verdict_revealed", {}).canAdvance);
const sixOfSeven = Object.fromEntries(REFLECTION_QUESTIONS.slice(0, 6).map((q) => [q.key, "a real answer"]));
check("cannot leave verdict_revealed with only 6 of 7 answered", !canAdvanceStage("verdict_revealed", { reflectionAnswers: sixOfSeven }).canAdvance);
const allSeven = Object.fromEntries(REFLECTION_QUESTIONS.map((q) => [q.key, "a real answer"]));
check("can leave verdict_revealed once all 7 are answered", canAdvanceStage("verdict_revealed", { reflectionAnswers: allSeven }).canAdvance);
const oneBlank = { ...allSeven, [REFLECTION_QUESTIONS[0].key]: "   " };
check("a whitespace-only reflection answer does not count as answered", !canAdvanceStage("verdict_revealed", { reflectionAnswers: oneBlank }).canAdvance);

check("nextStage(observation) === evidence_review", nextStage("observation") === "evidence_review");
check("nextStage(reflection_complete) === null", nextStage("reflection_complete") === null);
check("hasReachedStage: judgment has reached hypothesis", hasReachedStage("judgment", "hypothesis"));
check("hasReachedStage: hypothesis has NOT reached judgment", !hasReachedStage("hypothesis", "judgment"));
check("hasReachedStage: a stage has reached itself", hasReachedStage("judgment", "judgment"));

const fullCase = {
  id: "1", caseKey: "test-case", title: "Test", companyName: "Acme",
  sourceType: "primary", sourceUrl: "https://example.com", sourceNote: null,
  landingPage: "...", pricingPage: null, onboardingFlow: null, checkoutFlow: null,
  technicalFindings: null, contextualInfo: null,
  referenceDisposition: "behavioral_diagnosis",
  referenceMechanism: "cognitive_load", referenceMechanismNote: null,
  referenceDiagnosis: "SECRET DIAGNOSIS", referenceRecommendation: "SECRET RECOMMENDATION",
  referenceResult: "SECRET RESULT",
};

for (const stage of STAGE_ORDER) {
  const visible = visibleCaseFields(fullCase, stage);
  const shouldBeRevealed = hasReachedStage(stage, "verdict_revealed");
  check(`visibleCaseFields at ${stage}: hidden fields match reveal state`, containsNoHiddenFields(visible) === !shouldBeRevealed);
}
check("no-attempt browsing is strict pre-reveal", containsNoHiddenFields(visibleCaseFields(fullCase, null)));
check("pre-reveal payload never contains secret diagnosis OR disposition", STAGE_ORDER.filter((s) => !hasReachedStage(s, "verdict_revealed")).every((s) => {
  const payload = JSON.stringify(visibleCaseFields(fullCase, s));
  return !payload.includes("SECRET") && !payload.includes("referenceDisposition");
}));
check("post-reveal payload contains the reference verdict", JSON.stringify(visibleCaseFields(fullCase, "verdict_revealed")).includes("SECRET DIAGNOSIS"));

check("all 6 canonical mechanisms recognized", CANONICAL_MECHANISMS.every((m) => isCanonicalMechanism(m)));
check("exactly 6 canonical mechanisms", CANONICAL_MECHANISMS.length === 6);
check("rejects a non-canonical mechanism", !isCanonicalMechanism("scope_creep"));
check("all 5 case dispositions recognized", CASE_DISPOSITIONS.length === 5 && CASE_DISPOSITIONS.every((d) => isCaseDisposition(d)));
check("rejects a non-canonical disposition", !isCaseDisposition("must_diagnose_anyway"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
