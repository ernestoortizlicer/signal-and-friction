/**
 * Client-facing translation of the internal reasoning registry.
 * ════════════════════════════════════════════════════════════════════════════
 * Phase 4.2 — the ONLY place internal reasoning_links (DiagnosisHypothesis[])
 * are allowed to influence anything a client sees. Every structural
 * guarantee below is enforced by what this function reads and returns, not
 * by convention:
 *
 *   - Reads ONLY mechanism.name and mechanism.definition off the registry.
 *     Never touches diagnosticQuestions, evidenceNotes, epistemicWarnings,
 *     manifestation, misinterpretations, contraindications, references, or
 *     evidenceStrength — those are analyst-training content, not client
 *     content, and this function has no code path that can leak them.
 *   - Never reads analystRationale, status, or linkedObservationIds off a
 *     DiagnosisHypothesis — the private "why I attached this" reasoning
 *     stays wherever the analyst wrote it, never paraphrased or quoted here.
 *   - Returns AT MOST one dominant interpretation and AT MOST one ruled-out
 *     alternative — the return type makes a second alternative
 *     unrepresentable, not just discouraged.
 *   - An ambiguous or absent match returns { dominant: null,
 *     ruledOutAlternative: null } — it never guesses which of several
 *     candidates is "the" dominant one. Declining to translate is always
 *     safe; the scaffold's own friction_mechanism label (already client-
 *     facing via dosing.ts's MECHANISM_LABELS/MECHANISM_SENTENCES) covers
 *     the coarser judgment regardless of whether this layer has anything
 *     to add.
 *   - Every sentence is framed as an interpretation ("reads as a case
 *     of...") never a measured fact — there is no code path in this file
 *     that can upgrade a modeled behavioral claim into a stated certainty.
 *   - An empty or absent hypotheses array is a normal, valid, common input
 *     (most scaffolds have none) — always returns the empty result, never
 *     throws, never fabricates a placeholder interpretation.
 *
 * Uses relative imports (not the "@/" alias) so this stays runnable via
 * plain `node` for regression tests, same reason src/lib/dosing.ts does —
 * see hypothesis-translation.test.mjs.
 */

import { getMechanism } from "../domain/reasoning/index.ts";
import type { DiagnosisHypothesis, FrictionMechanismId } from "../domain/reasoning/index.ts";

export interface ClientInterpretation {
  /** The registry mechanism's proper-noun name, e.g. "Social Proof" — never its internal id. */
  label: string;
  /** One interpretive sentence built only from mechanism.definition — never analyst rationale. */
  sentence: string;
}

export interface ClientBehavioralInterpretation {
  dominant: ClientInterpretation | null;
  ruledOutAlternative: ClientInterpretation | null;
}

const EMPTY: ClientBehavioralInterpretation = { dominant: null, ruledOutAlternative: null };

function toClientInterpretation(mechanismId: string): ClientInterpretation | null {
  const mechanism = getMechanism(mechanismId);
  if (!mechanism) return null; // stale/removed id — decline rather than show a broken reference
  return {
    label: mechanism.name,
    sentence: `This reads as a case of ${mechanism.name.toLowerCase()}: ${mechanism.definition}`,
  };
}

/**
 * hypotheses: the scaffold's real reasoning_links, unfiltered.
 * dominantFrictionMechanism: the scaffold's own analyst-set friction_mechanism
 * (the 6-category judgment, already shown elsewhere in the deliverable via
 * dosing.ts) — used only to find which attached hypothesis, if any,
 * unambiguously corresponds to it.
 */
export function translateHypothesesForClient(
  hypotheses: DiagnosisHypothesis[],
  dominantFrictionMechanism: FrictionMechanismId | null,
): ClientBehavioralInterpretation {
  if (!hypotheses.length || !dominantFrictionMechanism) return EMPTY;

  const matchingDominant = hypotheses.filter((h) => h.frictionMechanism === dominantFrictionMechanism);
  if (matchingDominant.length !== 1) return EMPTY; // 0 = nothing to add; >1 = ambiguous, decline rather than guess

  const dominantSource = matchingDominant[0];
  const dominant = toClientInterpretation(dominantSource.mechanismId);
  if (!dominant) return EMPTY;

  const alternativeSource = hypotheses.find(
    (h) => h !== dominantSource && h.frictionMechanism !== dominantFrictionMechanism
  );
  const ruledOutAlternative = alternativeSource ? toClientInterpretation(alternativeSource.mechanismId) : null;

  return { dominant, ruledOutAlternative };
}
