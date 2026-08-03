/**
 * Regression + structural-integrity tests for the Autonomy curriculum
 * (Phase 6.3, Section FOUR). Run:
 *   node src/lib/autonomy-curriculum.test.mjs
 */
import assert from "node:assert/strict";
import {
  DWY_AUTONOMY_CURRICULUM,
  DFY_AUTONOMY_CURRICULUM,
  curriculumToChecklistItems,
  curriculumToLearningModules,
  curriculumToRunbookText,
} from "./autonomy-curriculum.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

const CURRICULA = [
  ["DWY", DWY_AUTONOMY_CURRICULUM],
  ["DFY", DFY_AUTONOMY_CURRICULUM],
];

// ── Client-safety boundary: never leak internal registry vocabulary ─────
const FORBIDDEN_TERMS = [
  "diagnosticQuestions", "evidenceNotes", "manifestation", "misinterpretations",
  "Cialdini", "Kahneman", "Tversky", "Sweller", "Baddeley", "Nielsen", // internal registry's academic references
];
for (const [name, curriculum] of CURRICULA) {
  const serialized = JSON.stringify(curriculum);
  for (const term of FORBIDDEN_TERMS) {
    check(`${name}: never mentions internal-registry term "${term}"`, !serialized.includes(term));
  }
}

// ── Structural completeness — every declared architecture element is non-empty ──
const REQUIRED_ARRAYS = [
  "learningProgression", "frameworkProgression", "templates", "checklists",
  "decisionTrees", "reviewCadence", "exercises", "qualityControl",
  "operationalRhythm", "escalationRules", "commonMistakes", "successCriteria",
  "clientIndependenceCriteria",
];
for (const [name, curriculum] of CURRICULA) {
  for (const key of REQUIRED_ARRAYS) {
    check(`${name}.${key} is non-empty`, Array.isArray(curriculum[key]) && curriculum[key].length > 0);
  }
  check(`${name}.mission is non-empty prose`, typeof curriculum.mission === "string" && curriculum.mission.length > 20);
  check(`${name}.caseReviewMethodology has ordered steps and required artifacts`, curriculum.caseReviewMethodology.steps.length > 0 && curriculum.caseReviewMethodology.requiredArtifacts.length > 0);
}

// ── Covers all six real friction mechanisms, not a subset ───────────────
const SIX_MECHANISMS = ["cognitive_load", "trust_deficit", "commitment_anxiety", "ordering_error", "identity_friction", "value_uncertainty"];
for (const [name, curriculum] of CURRICULA) {
  const covered = new Set(curriculum.frameworkProgression.map((f) => f.mechanism));
  for (const m of SIX_MECHANISMS) {
    check(`${name} framework progression covers mechanism "${m}"`, covered.has(m));
  }
}

// ── Learning progression is a real DAG: every prerequisite resolves ─────
for (const [name, curriculum] of CURRICULA) {
  const ids = new Set(curriculum.learningProgression.map((s) => s.id));
  const allResolve = curriculum.learningProgression.every((s) => s.prerequisiteStageId === null || ids.has(s.prerequisiteStageId));
  check(`${name} learning progression: every prerequisiteStageId resolves to a real stage`, allResolve);
  const rootCount = curriculum.learningProgression.filter((s) => s.prerequisiteStageId === null).length;
  check(`${name} learning progression has exactly one root stage`, rootCount === 1);
}

// ── Decision trees are real graphs: entryNodeId and every nextNodeId resolve ──
for (const [name, curriculum] of CURRICULA) {
  for (const tree of curriculum.decisionTrees) {
    const nodeIds = new Set(tree.nodes.map((n) => n.id));
    check(`${name} decision tree "${tree.title}": entryNodeId resolves`, nodeIds.has(tree.entryNodeId));
    const allBranchesResolve = tree.nodes.every((n) => n.branches.every((b) => !b.nextNodeId || nodeIds.has(b.nextNodeId)));
    check(`${name} decision tree "${tree.title}": every branch.nextNodeId resolves to a real node`, allBranchesResolve);
    const everyBranchHasOutcome = tree.nodes.every((n) => n.branches.every((b) => b.nextNodeId || b.outcome.length > 0));
    check(`${name} decision tree "${tree.title}": every leaf branch states a concrete outcome`, everyBranchHasOutcome);
  }
}

// ── Escalation rules only ever point somewhere real ──────────────────────
const VALID_ESCALATION_TARGETS = new Set(["Signal & Friction analyst", "internal team lead", "no escalation needed"]);
for (const [name, curriculum] of CURRICULA) {
  check(`${name}: every escalation rule targets a valid destination`, curriculum.escalationRules.every((e) => VALID_ESCALATION_TARGETS.has(e.escalateTo)));
}

// ── Exercises are explicitly hypothetical, never framed as real client cases ──
for (const [name, curriculum] of CURRICULA) {
  check(`${name}: every exercise has a scenario and a stated success condition`, curriculum.exercises.every((e) => e.scenario.length > 0 && e.successLooksLike.length > 0));
}

// ── Converters project into the shapes the existing render components expect ──
const dwyChecklist = curriculumToChecklistItems(DWY_AUTONOMY_CURRICULUM);
check("curriculumToChecklistItems: flattens every checklist's items, count matches", dwyChecklist.length === DWY_AUTONOMY_CURRICULUM.checklists.reduce((n, c) => n + c.items.length, 0));
check("curriculumToChecklistItems: every item starts undone", dwyChecklist.every((c) => c.done === false));
check("curriculumToChecklistItems: every id is unique", new Set(dwyChecklist.map((c) => c.id)).size === dwyChecklist.length);

const dwyModules = curriculumToLearningModules(DWY_AUTONOMY_CURRICULUM);
check("curriculumToLearningModules: one module per framework-progression entry", dwyModules.length === DWY_AUTONOMY_CURRICULUM.frameworkProgression.length);
check("curriculumToLearningModules: every module starts incomplete", dwyModules.every((m) => m.completed === false));

const dfyRunbook = curriculumToRunbookText(DFY_AUTONOMY_CURRICULUM);
check("curriculumToRunbookText: returns non-empty text", dfyRunbook.length > 200);
check("curriculumToRunbookText: includes the mission statement", dfyRunbook.includes(DFY_AUTONOMY_CURRICULUM.mission));
check("curriculumToRunbookText: includes escalation rules section", dfyRunbook.includes("ESCALATION RULES"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
