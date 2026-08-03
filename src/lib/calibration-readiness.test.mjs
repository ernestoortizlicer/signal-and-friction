/**
 * Diagnostic Calibration v3 — readiness model tests. Run:
 *   node src/lib/calibration-readiness.test.mjs
 */
import assert from "node:assert/strict";
import { computeReadiness, topConfusionPairs, DEFAULT_READINESS_CONFIG } from "./calibration-readiness.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

function attempt(overrides) {
  return {
    caseId: "c1",
    referenceMechanism: "cognitive_load",
    judgmentMechanism: "cognitive_load",
    judgmentConfidence: "high",
    disagreementDefensible: null,
    evidenceDisciplinePass: true,
    differentialDiagnosisQuality: 4,
    uncertaintyHandling: 4,
    recommendationCoherence: 4,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── No opaque single score — readiness is always a list of named criteria ──
const empty = computeReadiness([]);
check("empty attempt history: not ready", empty.ready === false);
check("empty attempt history: still returns the full criteria list, not a blank result", empty.criteria.length === 6);
check("every criterion carries its own actual value and threshold, never just pass/fail", empty.criteria.every((c) => "actual" in c && "threshold" in c && "detail" in c));

// ── A too-small, all-agreeing window still fails on case count / coverage ──
const tooFew = computeReadiness([attempt({}), attempt({})]);
check("too few cases: not ready even with perfect agreement", tooFew.ready === false);
check("too few cases: case_count criterion explicitly fails", tooFew.criteria.find((c) => c.id === "case_count").passed === false);

// ── A strong, diverse, well-calibrated window passes every criterion ──
const mechanisms = ["cognitive_load", "trust_deficit", "commitment_anxiety", "ordering_error"];
const strongWindow = mechanisms.flatMap((m, i) =>
  [0, 1, 2].map(() => attempt({
    referenceMechanism: m, judgmentMechanism: m, judgmentConfidence: "high",
    evidenceDisciplinePass: true, recommendationCoherence: 4.5,
    completedAt: new Date(Date.now() - i * 1000).toISOString(),
  }))
);
const strong = computeReadiness(strongWindow, DEFAULT_READINESS_CONFIG);
check("strong, diverse, well-calibrated window: ready", strong.ready === true);
check("strong window: all 6 criteria individually pass", strong.criteria.every((c) => c.passed));

// ── Raw agreement alone is NOT sufficient — overconfidence must fail calibration ──
const overconfident = mechanisms.flatMap((m) =>
  [0, 1, 2].map(() => attempt({
    referenceMechanism: m, judgmentMechanism: "value_uncertainty", // always WRONG
    judgmentConfidence: "high", // but always claims high confidence
    disagreementDefensible: false,
    evidenceDisciplinePass: true, recommendationCoherence: 4,
  }))
);
const overconfidentResult = computeReadiness(overconfident, DEFAULT_READINESS_CONFIG);
check("consistently wrong-but-confident window: not ready", overconfidentResult.ready === false);
check("consistently wrong-but-confident window: confidence_calibration criterion fails", overconfidentResult.criteria.find((c) => c.id === "confidence_calibration").passed === false);
check("consistently wrong-but-confident window: agreement_or_defensible criterion fails", overconfidentResult.criteria.find((c) => c.id === "agreement_or_defensible").passed === false);

// ── Defensible disagreement counts toward calibration, unresolved disagreement does not ──
const defensibleDisagreement = mechanisms.flatMap((m) =>
  [0, 1, 2].map(() => attempt({
    referenceMechanism: m, judgmentMechanism: "value_uncertainty",
    judgmentConfidence: "moderate",
    disagreementDefensible: true, // explicitly flagged defensible
    evidenceDisciplinePass: true, recommendationCoherence: 4,
  }))
);
const defensibleResult = computeReadiness(defensibleDisagreement, DEFAULT_READINESS_CONFIG);
check("all-defensible-disagreement window still passes agreement_or_defensible", defensibleResult.criteria.find((c) => c.id === "agreement_or_defensible").passed === true);

const unresolvedDisagreement = mechanisms.flatMap((m) =>
  [0, 1, 2].map(() => attempt({
    referenceMechanism: m, judgmentMechanism: "value_uncertainty",
    judgmentConfidence: "moderate",
    disagreementDefensible: null, // never assessed — must NOT get free credit
    evidenceDisciplinePass: true, recommendationCoherence: 4,
  }))
);
const unresolvedResult = computeReadiness(unresolvedDisagreement, DEFAULT_READINESS_CONFIG);
check("unresolved (null) disagreement does NOT count toward agreement_or_defensible", unresolvedResult.criteria.find((c) => c.id === "agreement_or_defensible").actual === 0);

// ── Window respects windowSize and picks the MOST RECENT attempts ───────
const old = attempt({ completedAt: "2020-01-01T00:00:00Z", referenceMechanism: "identity_friction" });
const recent = mechanisms.flatMap((m) => [0, 1, 2].map(() => attempt({ referenceMechanism: m, completedAt: new Date().toISOString() })));
const windowed = computeReadiness([old, ...recent], { ...DEFAULT_READINESS_CONFIG, windowSize: recent.length });
check("windowing excludes older attempts beyond windowSize, unsorted input handled correctly", windowed.windowUsed === recent.length);

// ── topConfusionPairs — never fabricates confusion where none exists ────
check("topConfusionPairs on empty input returns []", topConfusionPairs([]).length === 0);
check("topConfusionPairs on all-agreeing attempts returns [] (no real confusion)", topConfusionPairs(strongWindow).length === 0);
const confused = [
  attempt({ referenceMechanism: "commitment_anxiety", judgmentMechanism: "identity_friction" }),
  attempt({ referenceMechanism: "commitment_anxiety", judgmentMechanism: "identity_friction" }),
  attempt({ referenceMechanism: "cognitive_load", judgmentMechanism: "ordering_error" }),
];
const pairs = topConfusionPairs(confused, 3);
check("topConfusionPairs ranks the most frequent pair first", pairs[0].reference === "commitment_anxiety" && pairs[0].claimed === "identity_friction" && pairs[0].count === 2);
check("topConfusionPairs includes the less-frequent real pair too", pairs.some((p) => p.reference === "cognitive_load" && p.claimed === "ordering_error"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
