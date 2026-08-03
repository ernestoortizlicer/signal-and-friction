import { MECHANISMS } from "./mechanisms";
import type { LearningPrompt } from "./types";

/**
 * Learning prompts derived programmatically from the mechanism registry —
 * not a second, hand-authored copy of the theory. `recall` and
 * `evidence-calibration` prompts need nothing beyond what mechanisms.ts
 * already contains, so they exist the moment the registry does.
 * `comparison`, `case-analysis`, and `diagnostic-practice` prompts need
 * real authored content (comparing two specific mechanisms, a real case)
 * and are intentionally left for a later pass — an empty array is honest
 * here; a stub or fabricated example would not be.
 */

function recallPrompts(): LearningPrompt[] {
  return MECHANISMS.map((m) => ({
    id: `recall-${m.id}`,
    mechanismId: m.id,
    promptType: "recall",
    question: `What is the underlying cognitive mechanism behind ${m.name} — not the definition, but what the mind is actually doing?`,
    expectedConcepts: [m.underlyingMechanism],
    rubric: [
      "Names the actual cognitive process, not just a restatement of the definition",
      "Does not treat the mechanism as a universal law",
    ],
  }));
}

/** One per weak/mixed-evidence mechanism — directly drills the entries most likely to be miscited as settled science. */
function evidenceCalibrationPrompts(): LearningPrompt[] {
  return MECHANISMS.filter((m) => m.evidenceStrength === "weak" || m.evidenceStrength === "mixed").map((m) => ({
    id: `calibration-${m.id}`,
    mechanismId: m.id,
    promptType: "evidence-calibration",
    question: `How strong is the evidence for ${m.name}, and what specifically limits how confidently it can be cited?`,
    expectedConcepts: [m.evidenceNotes, ...m.epistemicWarnings],
    rubric: [
      `Correctly identifies the evidence strength as "${m.evidenceStrength}", not stronger`,
      "Cites the specific limitation, not a generic 'more research is needed'",
    ],
  }));
}

export const LEARNING_PROMPTS: LearningPrompt[] = [
  ...recallPrompts(),
  ...evidenceCalibrationPrompts(),
];

export function getPromptsForMechanism(mechanismId: string): LearningPrompt[] {
  return LEARNING_PROMPTS.filter((p) => p.mechanismId === mechanismId);
}

export function getPromptsByType(type: LearningPrompt["promptType"]): LearningPrompt[] {
  return LEARNING_PROMPTS.filter((p) => p.promptType === type);
}
