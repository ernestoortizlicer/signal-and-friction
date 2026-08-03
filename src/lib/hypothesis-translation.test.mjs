/**
 * Regression tests for the client-facing hypothesis translation layer
 * (Phase 4.2) — the only code path allowed to turn internal reasoning_links
 * into anything a client sees. Run directly with Node (native TS
 * type-stripping, same as dosing.publish.test.mjs):
 *
 *   node src/lib/hypothesis-translation.test.mjs
 */
import assert from "node:assert/strict";
import { translateHypothesesForClient } from "./hypothesis-translation.ts";
import { getMechanism } from "../domain/reasoning/index.ts";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

function hypothesis(overrides) {
  return {
    id: overrides.id ?? "h-1",
    mechanismId: overrides.mechanismId,
    frictionMechanism: overrides.frictionMechanism,
    status: overrides.status ?? "pending",
    evidenceStrength: overrides.evidenceStrength ?? "contextual",
    analystRationale: overrides.analystRationale ?? "Private analyst reasoning — must never reach the client.",
    linkedObservationIds: [],
  };
}

// ── Empty / absent input is always valid, never an error ───────────────
check(
  "empty reasoning_links -> both null, no throw",
  JSON.stringify(translateHypothesesForClient([], "trust_deficit")) === JSON.stringify({ dominant: null, ruledOutAlternative: null })
);
check(
  "null dominantFrictionMechanism -> both null even with real hypotheses",
  translateHypothesesForClient([hypothesis({ mechanismId: "social-proof", frictionMechanism: "trust_deficit" })], null).dominant === null
);

// ── Exactly one match -> that's the dominant translation ───────────────
const single = translateHypothesesForClient(
  [hypothesis({ mechanismId: "social-proof", frictionMechanism: "trust_deficit" })],
  "trust_deficit"
);
const socialProof = getMechanism("social-proof");
check("single match: dominant.label is the real mechanism name", single.dominant?.label === socialProof.name);
check("single match: sentence is built from definition, not fabricated", single.dominant?.sentence.includes(socialProof.definition));
check("single match: no ruled-out alternative when nothing else was attached", single.ruledOutAlternative === null);

// ── Ambiguous match (>1 hypothesis for the same dominant friction) declines rather than guesses ──
const ambiguous = translateHypothesesForClient(
  [
    hypothesis({ id: "h-1", mechanismId: "social-proof", frictionMechanism: "trust_deficit" }),
    hypothesis({ id: "h-2", mechanismId: "authority-signaling", frictionMechanism: "trust_deficit" }),
  ],
  "trust_deficit"
);
check("ambiguous (2 matches for same friction): declines, dominant is null", ambiguous.dominant === null);
check("ambiguous: ruledOutAlternative is also null (nothing to contrast against)", ambiguous.ruledOutAlternative === null);

// ── A genuinely different friction mechanism is a valid ruled-out alternative ──
const withAlternative = translateHypothesesForClient(
  [
    hypothesis({ id: "h-1", mechanismId: "social-proof", frictionMechanism: "trust_deficit" }),
    hypothesis({ id: "h-2", mechanismId: "choice-overload", frictionMechanism: "cognitive_load" }),
  ],
  "trust_deficit"
);
const choiceOverload = getMechanism("choice-overload");
check("with alternative: dominant is still social proof", withAlternative.dominant?.label === socialProof.name);
check("with alternative: ruledOutAlternative is the OTHER mechanism", withAlternative.ruledOutAlternative?.label === choiceOverload.name);

// ── At most ONE ruled-out alternative, even with several candidates ────
const manyAlternatives = translateHypothesesForClient(
  [
    hypothesis({ id: "h-1", mechanismId: "social-proof", frictionMechanism: "trust_deficit" }),
    hypothesis({ id: "h-2", mechanismId: "choice-overload", frictionMechanism: "cognitive_load" }),
    hypothesis({ id: "h-3", mechanismId: "authority-signaling", frictionMechanism: "identity_friction" }),
  ],
  "trust_deficit"
);
check(
  "many candidates: exactly one ruledOutAlternative survives, never a list",
  manyAlternatives.ruledOutAlternative !== null && !Array.isArray(manyAlternatives.ruledOutAlternative)
);

// ── Structural leak check: nothing internal survives serialization ─────
const serialized = JSON.stringify(withAlternative);
check("serialized output never contains the private analyst rationale text", !serialized.includes("Private analyst reasoning"));
check("serialized output never contains a raw mechanism id", !serialized.includes("social-proof") && !serialized.includes("choice-overload"));
check("serialized output never contains an evidenceStrength value", !serialized.includes("contextual"));
check(
  "serialized output never contains registry-internal fields (diagnosticQuestions/evidenceNotes/manifestation keys)",
  !serialized.includes("diagnosticQuestions") && !serialized.includes("evidenceNotes") && !serialized.includes("manifestation")
);

// ── Framing never states a measured fact ────────────────────────────────
check(
  "dominant sentence is framed as an interpretation, not a stated fact",
  single.dominant?.sentence.startsWith("This reads as a case of")
);

// ── Unknown/stale mechanismId declines rather than showing a broken label ──
const staleId = translateHypothesesForClient(
  [hypothesis({ mechanismId: "does-not-exist-in-registry", frictionMechanism: "trust_deficit" })],
  "trust_deficit"
);
check("stale/unknown mechanismId: declines rather than fabricating a label", staleId.dominant === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
