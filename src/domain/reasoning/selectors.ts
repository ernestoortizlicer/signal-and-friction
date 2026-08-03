import { MECHANISMS } from "./mechanisms.ts";
import { FAMILIES } from "./families.ts";
import type {
  ReasoningMechanism,
  FrictionMechanismId,
  PerformanceSignalId,
  DiagnosisHypothesis,
} from "./types.ts";

/**
 * Pure functions only — no I/O, no side effects. These generate CANDIDATE
 * reasoning for an analyst to review, never a committed diagnosis. Nothing
 * here writes to a scaffold, a deliverable, or any persisted state; every
 * function here returns a value, and the caller decides whether anything
 * happens with it. That boundary is the literal implementation of "the
 * reasoning engine generates candidate reasoning, the analyst generates
 * the diagnosis."
 */

export function getMechanism(id: string): ReasoningMechanism | undefined {
  return MECHANISMS.find((m) => m.id === id);
}

export function getFamily(id: string) {
  return FAMILIES.find((f) => f.id === id);
}

export function getMechanismsByFamily(familyId: string): ReasoningMechanism[] {
  return MECHANISMS.filter((m) => m.familyId === familyId);
}

export function getMechanismsForFrictionMechanism(
  frictionMechanism: FrictionMechanismId
): ReasoningMechanism[] {
  return MECHANISMS.filter((m) =>
    m.relevantFrictionMechanisms.some((r) => r.id === frictionMechanism)
  );
}

/** Mechanisms whose evidenceStrength is "weak" or "mixed" — the entries the epistemic standard most needs surfaced, e.g. for calibration drills. */
export function getWeakEvidenceMechanisms(): ReasoningMechanism[] {
  return MECHANISMS.filter((m) => m.evidenceStrength === "weak" || m.evidenceStrength === "mixed");
}

/**
 * Given the measured signals present on a scaffold (as a set of
 * PerformanceSignalId — the caller maps its own RawTechnicalSignals into
 * this vocabulary, keeping this function decoupled from any specific
 * scan-engine shape) and the friction mechanism the analyst has already
 * selected, return ranked candidate mechanisms. This is a SUGGESTION list
 * only — nothing here constructs a DiagnosisHypothesis; that object is
 * only ever created when an analyst deliberately attaches one (see
 * buildHypothesisDraft below, which still requires the caller to supply
 * an analystRationale — there is no path that produces a hypothesis with
 * an empty rationale).
 */
export function suggestMechanisms(
  presentSignals: PerformanceSignalId[],
  frictionMechanism: FrictionMechanismId | null
): ReasoningMechanism[] {
  const byFriction = frictionMechanism
    ? getMechanismsForFrictionMechanism(frictionMechanism)
    : MECHANISMS;

  const signalSet = new Set(presentSignals);
  const withSignalOverlap = byFriction.filter((m) =>
    m.relevantPerformanceSignals.some((mapping) => signalSet.has(mapping.signal))
  );

  // Signal-backed suggestions first (stronger candidate), then the rest of
  // the friction-mechanism-relevant set for the analyst to browse manually
  // — never silently dropped, just ranked lower.
  const withoutSignalOverlap = byFriction.filter((m) => !withSignalOverlap.includes(m));
  return [...withSignalOverlap, ...withoutSignalOverlap];
}

/**
 * Builds a DRAFT hypothesis object for the analyst to review/edit/discard —
 * this is the one place a DiagnosisHypothesis gets constructed, and it
 * deliberately requires the caller (the UI, driven by an analyst action)
 * to supply linkedObservationIds and analystRationale — there is no
 * zero-argument or auto-populated path. status defaults to "pending", not
 * "modeled" — the analyst has to deliberately upgrade it, the engine never
 * asserts a hypothesis is already modeled on the analyst's behalf.
 */
export function buildHypothesisDraft(params: {
  id: string;
  mechanismId: string;
  frictionMechanism: FrictionMechanismId;
  linkedObservationIds: string[];
  analystRationale: string;
}): DiagnosisHypothesis | null {
  const mechanism = getMechanism(params.mechanismId);
  if (!mechanism) return null;
  return {
    id: params.id,
    mechanismId: mechanism.id,
    frictionMechanism: params.frictionMechanism,
    status: "pending",
    evidenceStrength: mechanism.evidenceStrength, // read from the registry, never author-set
    analystRationale: params.analystRationale,
    linkedObservationIds: params.linkedObservationIds,
  };
}
