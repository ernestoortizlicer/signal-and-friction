// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: LEARNING SOCRATIC TUTOR
// Path: supabase/functions/learning-socratic-tutor/index.ts
// Tier: see TUTOR_TIER below — this is real-time conversational tutoring,
//       not a batch job, so response latency matters as much as depth.
//
// Rebuilt 2026-08-01 for the diagnostic-craft training module (approved
// design: research + curriculum doc, same session). Two changes from the
// original version:
//
//   1. Cases are now real client deliverables (payflux, acme-corp,
//      growthly, startuphub — read from their groundTruthMechanism field),
//      not the six fictional companies this replaced. The learner submits
//      ONE claimed mechanism, not a multi-select — "select all that apply"
//      worked against the actual skill being tested (mechanism isolation
//      is a MECE question: is this mutually exclusive from the next-best
//      candidate, not "which of these also apply a little").
//   2. mechanism_correct is computed here in code — a plain string
//      equality between what the learner claimed and the case's real
//      groundTruthMechanism — never asked of the model. That comparison
//      has one right answer and zero need for judgment; asking an LLM to
//      grade something a === check already answers exactly would just be
//      a new place for it to be wrong.
//
// Two-step case-method flow, unchanged in shape:
//   1. step: "followup" — learner submits a hypothesis + ONE claimed
//      mechanism. Returns ONE Socratic question that engages with what
//      they specifically wrote — never the answer, the way a Harvard/
//      Stanford case-method cold-call works.
//   2. step: "verdict" — learner responds to that question. Returns a
//      real score, feedback, the exact subset of the case's real concept
//      titles they demonstrated (validated against the real list, never
//      an invented name), plus three further rubric dimensions the model
//      does need judgment for: evidence-tier discipline, the specificity
//      test, and confidence calibration.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { route, type Tier } from "../_shared/ai-router.ts";

// Single lever for this tutor's model — flip this one line, not the two
// route() calls below, to change it. Set to "sharp" (deepseek-v4-pro) for
// the best question quality, accepting slower/costlier responses. "core"
// (deepseek-v4-flash) is faster and cheap enough to run per-exchange, at
// some depth cost — worth trying if pro reads as overkill once there's
// real training volume to judge it against.
//
// Note on "sharp" specifically: deepseek-v4-pro has thinking mode ON by
// default (DeepSeek's own docs: "Thinking mode is enabled by default,
// with the default effort being high") — reasoning tokens are generated
// before the final answer and share the same maxTokens ceiling with it,
// per DeepSeek's docs. This is the same shape of risk that broke this
// tutor before under deepseek-reasoner (R1) — NOT the same tested model
// (v4-pro is new, never live-tested here), but the same failure mode is
// plausible for the same structural reason. See the maxTokens comments
// on both route() calls below.
const TUTOR_TIER: Tier = "sharp";

const ALLOWED_ORIGINS = [
  "https://signal-and-friction.com",
  "https://www.signal-and-friction.com",
  "https://signal-and-friction.pages.dev",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".signal-and-friction.pages.dev")
      ? origin
      : "https://signal-and-friction.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Duplicated from src/app/deliverable/fallback.ts — Deno edge functions
// can't import from src/, same cross-boundary pattern already used for
// Presence between functions/api/_scan.ts and the prospecting page.
type FrictionMechanism =
  | "cognitive_load"
  | "trust_deficit"
  | "commitment_anxiety"
  | "ordering_error"
  | "identity_friction"
  | "value_uncertainty";

const VALID_MECHANISMS: ReadonlySet<string> = new Set([
  "cognitive_load", "trust_deficit", "commitment_anxiety",
  "ordering_error", "identity_friction", "value_uncertainty",
]);

const MECHANISM_LABELS: Record<FrictionMechanism, string> = {
  cognitive_load: "Cognitive Load",
  trust_deficit: "Trust Deficit",
  commitment_anxiety: "Commitment Anxiety",
  ordering_error: "Ordering Error",
  identity_friction: "Identity Friction",
  value_uncertainty: "Value Uncertainty",
};

interface Concept {
  title: string;
  description: string;
}

interface Challenge {
  id: string;
  title: string;
  metrics: string;
  context: string;
  concepts: Concept[];
  groundTruthMechanism: FrictionMechanism;
}

const SYSTEM_PROMPT_FOLLOWUP = `You are a case-method instructor running a Socratic cold-call session, in the style of Harvard Business School or Stanford GSB. A student has just submitted a diagnostic hypothesis for a real B2B SaaS conversion-friction case, and has claimed ONE dominant friction mechanism.

Your job: ask exactly ONE sharp, specific follow-up question that engages directly with what THIS student wrote — not a generic prompt. The single highest-value move is usually to press on the MECE test: is there a plausible second mechanism their evidence could also support, and why did they rule it out (or did they)? Push on the weakest or most assumption-laden part of their reasoning. If they missed something the case data implies, ask a question that leads them toward noticing it themselves — never tell them the answer.

Rules:
- Exactly one question. No preamble, no "Great start!", no answer key.
- Reference specifics from their hypothesis by name/detail — this must be unmistakably about THEIR answer, not a template.
- Keep it under 60 words.
- Do not reveal whether their claimed mechanism is correct, or which concepts are "correct" — that only happens after their response.`;

const SYSTEM_PROMPT_VERDICT = `You are a case-method instructor concluding a Socratic cold-call session. The student submitted a hypothesis and a claimed friction mechanism, you asked one follow-up question, and they responded. Now give a real, honest verdict — not automatic praise.

You will be given the case's REAL documented concepts (title + description), and separately told (not asked to judge) whether the student's claimed mechanism was correct. Assess the student's full reasoning (hypothesis + follow-up response) against three further things, each requiring real judgment:

1. EVIDENCE-TIER DISCIPLINE: did they present any modeled/inferred claim as if it were directly measured? List each violation found, in their own words where possible. Empty list if none.
2. THE SPECIFICITY TEST: could their recommendation be handed unchanged to a different company in the same category, or is it genuinely grounded in this case's specific measured facts? Fail (false) if generic.
3. CONFIDENCE CALIBRATION: if they stated or implied a confidence level, was it proportional to the actual strength of their evidence — not uniformly certain, not hedged into uselessness? If they never addressed confidence at all, that itself fails this dimension — calibration has to be stated, not assumed.

Return your answer as strict JSON, no markdown fences, matching exactly:
{
  "score": <integer 0-100, honest — a shallow or wrong answer should score low, independent of whether the mechanism call was right>,
  "feedback": "<2-4 sentences, direct, citing specifics from what they actually wrote — what they got right, what they missed or got backwards>",
  "concepts_demonstrated": [<zero or more of the EXACT concept title strings provided below that their reasoning genuinely shows understanding of — copy the titles verbatim, do not paraphrase or invent new ones, and do not include a concept unless they actually engaged with it>],
  "evidence_tier_violations": [<zero or more short strings describing a specific modeled-presented-as-measured claim; empty array if none>],
  "specificity_pass": <true or false>,
  "confidence_calibrated": <true or false>
}`;

function buildCaseBlock(challenge: Challenge): string {
  return `CASE: ${challenge.title}\nMETRICS: ${challenge.metrics}\nCONTEXT: ${challenge.context}`;
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json() as {
      step: "followup" | "verdict";
      challenge: Challenge;
      hypothesis: string;
      mechanismClaimed: string;
      followupQuestion?: string;
      followupResponse?: string;
    };

    const { step, challenge, hypothesis, mechanismClaimed } = body;

    if (!challenge?.id || !hypothesis?.trim()) {
      return new Response(
        JSON.stringify({ error: "challenge and hypothesis are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (!VALID_MECHANISMS.has(mechanismClaimed)) {
      return new Response(
        JSON.stringify({ error: `mechanismClaimed must be one of: ${[...VALID_MECHANISMS].join(", ")}` }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (!VALID_MECHANISMS.has(challenge.groundTruthMechanism)) {
      return new Response(
        JSON.stringify({ error: "challenge.groundTruthMechanism is missing or invalid — this case cannot be graded" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const claimedLabel = MECHANISM_LABELS[mechanismClaimed as FrictionMechanism];

    if (step === "followup") {
      const userPrompt =
        `${buildCaseBlock(challenge)}\n\n` +
        `STUDENT'S CLAIMED MECHANISM: ${claimedLabel}\n` +
        `STUDENT'S HYPOTHESIS: "${hypothesis}"\n\n` +
        `Ask your one Socratic follow-up question now.`;

      const result = await route({
        tier: TUTOR_TIER,
        system: SYSTEM_PROMPT_FOLLOWUP,
        user: userPrompt,
        // TUTOR_TIER is "sharp" (deepseek-v4-pro), which has thinking mode
        // on by default (default effort "high") — reasoning tokens are
        // generated before the final answer and DeepSeek's docs describe
        // them as sharing this same maxTokens ceiling. This is the exact
        // failure this tutor already hit once, under deepseek-reasoner
        // (R1): 150 (sized for the ~60-word answer alone) left no room for
        // reasoning and every call returned empty. 8000 here is a sized-up
        // estimate, not empirically calibrated against v4-pro specifically
        // (no live account access to test it from this environment) —
        // "high" effort is presumably lighter than DeepSeek's separate
        // "Think Max" mode (which they recommend a 384K-token ceiling
        // for), but there's no vendor number for "high" to size against.
        // Watch the FIRST few real runs closely for an empty question —
        // that's this same bug recurring, and means this needs raising
        // further, not silently retrying.
        maxTokens: 8000,
        // Thinking mode ignores temperature/top_p entirely per DeepSeek's
        // docs (accepted without erroring, but has no effect) — left here
        // only so this still behaves normally if TUTOR_TIER switches back
        // to "core" (deepseek-v4-flash), which does use it.
        temperature: 0.6,
      });

      // finishReason "length" means maxTokens was hit before the model
      // finished — the exact silent-failure this tutor hit before under
      // deepseek-reasoner, where the whole budget went to hidden
      // reasoning and question came back "". Surface it as an explicit
      // error instead of returning an empty/truncated question with no
      // explanation.
      if (result.finishReason === "length") {
        return new Response(
          JSON.stringify({
            error: `Tutor response truncated — hit the token budget (maxTokens: 8000, tier: ${result.tier}, model: ${result.model}) before finishing. Raise maxTokens on this route() call.`,
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          type: "followup",
          question: result.text.trim(),
          meta: {
            model: result.model,
            tier: result.tier,
            estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)),
          },
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (step === "verdict") {
      const { followupQuestion, followupResponse } = body;
      if (!followupQuestion?.trim() || !followupResponse?.trim()) {
        return new Response(
          JSON.stringify({ error: "followupQuestion and followupResponse are required for step=verdict" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      // The one rubric dimension that is NOT the model's call — a plain
      // equality check against the case's real ground truth, computed
      // here, once, before the model is ever asked for a judgment.
      const mechanismCorrect = mechanismClaimed === challenge.groundTruthMechanism;

      const conceptsBlock = challenge.concepts
        .map((c) => `- "${c.title}": ${c.description}`)
        .join("\n");

      const userPrompt =
        `${buildCaseBlock(challenge)}\n\n` +
        `STUDENT'S CLAIMED MECHANISM: ${claimedLabel} (${mechanismCorrect ? "this was correct — do not treat the mechanism call as wrong in your feedback" : "this was NOT the case's real dominant mechanism — the real one is not being revealed to you either, judge only the reasoning quality, not whether they'd have guessed right"})\n` +
        `STUDENT'S HYPOTHESIS: "${hypothesis}"\n` +
        `YOUR FOLLOW-UP QUESTION: "${followupQuestion}"\n` +
        `STUDENT'S RESPONSE: "${followupResponse}"\n\n` +
        `REAL DOCUMENTED CONCEPTS FOR THIS CASE:\n${conceptsBlock}\n\n` +
        `Return the JSON verdict now — score, feedback, concepts_demonstrated, evidence_tier_violations, specificity_pass, confidence_calibrated. Do not include a mechanism-correctness judgment; that's handled separately.`;

      const result = await route({
        tier: TUTOR_TIER,
        system: SYSTEM_PROMPT_VERDICT,
        user: userPrompt,
        // Same thinking-mode headroom note as the followup call above —
        // verdict additionally reasons through four separate rubric
        // dimensions before emitting the JSON, so it gets more of it.
        // Same caveat: 12000 is a sized-up estimate, not empirically
        // calibrated against v4-pro. Watch the first few real runs for an
        // empty/truncated verdict.
        maxTokens: 12000,
        // Ignored in thinking mode (see the followup call's comment) —
        // kept for correct behavior if TUTOR_TIER switches to "core".
        temperature: 0.3,
      });

      // Same truncation check as the followup call above — worth catching
      // explicitly here even though a truncated response would likely
      // also fail the JSON.parse below anyway, since this gives a much
      // clearer error than "Model returned non-JSON verdict" for what is
      // actually a token-budget problem, not a formatting one.
      if (result.finishReason === "length") {
        return new Response(
          JSON.stringify({
            error: `Tutor verdict truncated — hit the token budget (maxTokens: 12000, tier: ${result.tier}, model: ${result.model}) before finishing. Raise maxTokens on this route() call.`,
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      let parsed: {
        score: number;
        feedback: string;
        concepts_demonstrated: string[];
        evidence_tier_violations: string[];
        specificity_pass: boolean;
        confidence_calibrated: boolean;
      };
      try {
        const jsonText = result.text.trim().replace(/^```json\s*|\s*```$/g, "");
        parsed = JSON.parse(jsonText);
      } catch {
        return new Response(
          JSON.stringify({ error: "Model returned non-JSON verdict", raw: result.text }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      // Never trust an invented concept name — filter to the real list.
      const realTitles = new Set(challenge.concepts.map((c) => c.title));
      const conceptsDemonstrated = (parsed.concepts_demonstrated ?? []).filter((t) => realTitles.has(t));
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      const evidenceTierViolations = Array.isArray(parsed.evidence_tier_violations)
        ? parsed.evidence_tier_violations.filter((v): v is string => typeof v === "string")
        : [];

      return new Response(
        JSON.stringify({
          type: "verdict",
          score,
          feedback: parsed.feedback ?? "",
          concepts_demonstrated: conceptsDemonstrated,
          mechanism_claimed: mechanismClaimed,
          mechanism_correct: mechanismCorrect,
          rubric_scores: {
            evidence_tier_violations: evidenceTierViolations,
            specificity_pass: parsed.specificity_pass === true,
            confidence_calibrated: parsed.confidence_calibrated === true,
          },
          meta: {
            model: result.model,
            tier: result.tier,
            estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)),
          },
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown step: ${step}` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
