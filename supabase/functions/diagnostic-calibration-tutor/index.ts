// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: DIAGNOSTIC CALIBRATION TUTOR (v3)
// Path: supabase/functions/diagnostic-calibration-tutor/index.ts
//
// Backs the Diagnostic Calibration System v3's Socratic step and the
// post-reveal calibration profile. Distinct from learning-socratic-tutor
// (the older, still-live 2-step flow graded against S&F's own past
// deliverables) — this function serves the new real-case, 10-stage
// workflow and enforces a structurally stronger guarantee than "the
// prompt says don't reveal it":
//
//   step: "socratic" — the request body's `observableCase` type ONLY
//   carries observable fields (landingPage/pricingPage/onboardingFlow/
//   checkoutFlow/technicalFindings/contextualInfo, id/title/company/
//   provenance). There is no field on this request shape a caller could
//   even populate with referenceMechanism/referenceDiagnosis/
//   referenceRecommendation/referenceResult — the hidden verdict is not
//   merely instructed against, it is ABSENT from every prompt this step
//   builds. This is what "add protections against prompt leakage of the
//   hidden verdict" means here: zero-knowledge by construction, not a
//   system-prompt rule that could be argued around.
//
//   step: "calibrate" — the ONLY step that receives the hidden reference
//   fields, called ONLY by functions/api/training/attempt.ts's `reveal`
//   action (service-role authenticated, server-to-server), and only
//   after the analyst's judgment_mechanism/recommendation are already
//   locked in the database. DeepSeek is not selecting the diagnosis at
//   this step — the diagnosis and the reference already exist
//   independently; this step only scores reasoning QUALITY against them
//   (7 approved calibration dimensions) and assesses whether a
//   disagreement is defensible. mechanism_correct itself is a plain
//   string-equality check done by the CALLER in code, never asked of the
//   model — same principle as learning-socratic-tutor.
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { route, type Tier } from "../_shared/ai-router.ts";

// "Strongest currently configured DeepSeek reasoning model" per the
// approved spec — sharp = deepseek-v4-pro in this router's tier table.
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

// Duplicated (not imported) — Deno edge functions can't import from
// src/, same cross-boundary pattern as every other duplication in this
// codebase (see learning-socratic-tutor/index.ts for precedent).
type CanonicalMechanism =
  | "cognitive_load" | "trust_deficit" | "commitment_anxiety"
  | "ordering_error" | "identity_friction" | "value_uncertainty";

const VALID_MECHANISMS: ReadonlySet<string> = new Set([
  "cognitive_load", "trust_deficit", "commitment_anxiety",
  "ordering_error", "identity_friction", "value_uncertainty",
]);

const MECHANISM_LABELS: Record<CanonicalMechanism, string> = {
  cognitive_load: "Cognitive Load",
  trust_deficit: "Trust Deficit",
  commitment_anxiety: "Commitment Anxiety",
  ordering_error: "Ordering Error",
  identity_friction: "Identity Friction",
  value_uncertainty: "Value Uncertainty",
};

// ── Zero-knowledge shape: structurally cannot carry a hidden verdict field ──
interface ObservableCase {
  id: string;
  title: string;
  companyName: string | null;
  landingPage: string | null;
  pricingPage: string | null;
  onboardingFlow: string | null;
  checkoutFlow: string | null;
  technicalFindings: string | null;
  contextualInfo: string | null;
}

interface AttemptInputs {
  observation?: string;
  evidenceNotes?: string;
  hypothesisMechanism?: CanonicalMechanism;
  hypothesisReasoning?: string;
  counterHypothesisMechanism?: CanonicalMechanism;
  counterHypothesisReasoning?: string;
  socraticExchanges?: { question: string; response: string }[];
  revision?: string;
  judgmentMechanism?: CanonicalMechanism;
  judgmentConfidence?: "low" | "moderate" | "high";
  recommendation?: string;
  uncertaintyNotes?: string;
}

function buildObservableBlock(c: ObservableCase): string {
  const lines = [
    `CASE: ${c.title}${c.companyName ? ` (${c.companyName})` : ""}`,
    c.landingPage ? `LANDING PAGE: ${c.landingPage}` : null,
    c.pricingPage ? `PRICING PAGE: ${c.pricingPage}` : null,
    c.onboardingFlow ? `ONBOARDING FLOW: ${c.onboardingFlow}` : null,
    c.checkoutFlow ? `CHECKOUT FLOW: ${c.checkoutFlow}` : null,
    c.technicalFindings ? `TECHNICAL FINDINGS: ${c.technicalFindings}` : null,
    c.contextualInfo ? `CONTEXT: ${c.contextualInfo}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildReasoningTrailBlock(inputs: AttemptInputs): string {
  const parts = [
    inputs.observation ? `OBSERVATION: ${inputs.observation}` : null,
    inputs.evidenceNotes ? `EVIDENCE REVIEW: ${inputs.evidenceNotes}` : null,
    inputs.hypothesisMechanism ? `HYPOTHESIS: ${MECHANISM_LABELS[inputs.hypothesisMechanism]} — ${inputs.hypothesisReasoning ?? ""}` : null,
    inputs.counterHypothesisMechanism ? `COUNTER-HYPOTHESIS: ${MECHANISM_LABELS[inputs.counterHypothesisMechanism]} — ${inputs.counterHypothesisReasoning ?? ""}` : null,
    inputs.revision ? `REVISION AFTER CHALLENGE: ${inputs.revision}` : null,
    inputs.judgmentMechanism ? `FINAL JUDGMENT: ${MECHANISM_LABELS[inputs.judgmentMechanism]} (confidence: ${inputs.judgmentConfidence ?? "unstated"})` : null,
    inputs.recommendation ? `RECOMMENDATION: ${inputs.recommendation}` : null,
    inputs.uncertaintyNotes ? `STATED UNCERTAINTY: ${inputs.uncertaintyNotes}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

const SYSTEM_PROMPT_SOCRATIC = `You are a Socratic case-method instructor training a behavioral conversion analyst, in the style of Harvard Business School or Stanford GSB cold-calling. You are shown a real historical case's OBSERVABLE material and the analyst's own reasoning so far. You do NOT know — and must never claim to know — which of the six canonical friction mechanisms (Cognitive Load, Trust Deficit, Commitment Anxiety, Ordering Error, Identity Friction, Value Uncertainty) is the documented answer for this case, because you have not been told it.

Your job: ask exactly ONE sharp question that challenges the analyst's own reasoning as written. Prioritize, in order of value: (1) an unsupported claim — something stated as fact without evidence given, (2) a contradiction between two things they wrote, (3) a plausible alternative mechanism their own evidence could equally support, (4) their stated (or unstated) confidence versus the actual strength of what they've shown.

Rules:
- Exactly one question. No preamble, no praise, no answer key.
- Reference specifics from what THIS analyst wrote — never a generic prompt.
- Under 60 words.
- Never assert which mechanism is correct. Never say a mechanism is "right" or "wrong" — you don't know. Never suggest you're withholding an answer either; simply don't reference correctness at all.
- Never invent case facts beyond what's given in the observable material.`;

const SYSTEM_PROMPT_CALIBRATE = `You are assessing a behavioral conversion analyst's completed diagnostic reasoning against a real historical case's now-revealed reference verdict. The analyst's judgment and recommendation were already locked in before you were shown the reference material, so your assessment cannot influence what they submitted — score honestly.

You will be given: the case's observable material, the analyst's full reasoning trail (observation through recommendation), the reference mechanism (with a note on why it was chosen over defensible alternatives, if any), the reference diagnosis, the reference recommendation, and whether the analyst's claimed mechanism matched the reference exactly (computed separately, not your call).

Score these seven dimensions, each 1-5 (5 = excellent, 1 = poor), based on the reasoning trail:
1. evidence_evaluation — did they correctly separate directly-observable facts from inference?
2. hypothesis_generation — was the initial hypothesis well-formed and evidence-grounded?
3. uncertainty_estimation — is their stated uncertainty proportional to what's actually unknown?
4. prioritization — did they focus on the evidence that actually mattered most?
5. differential_diagnosis — did the counter-hypothesis represent a genuinely plausible alternative, not a token one?
6. confidence_calibration — does their stated confidence level match the actual strength of their evidence?
7. recommendation_quality — does the recommendation follow logically from their own stated diagnosis?

Also assess:
- evidence_discipline_pass: true unless they presented an inferred/assumed claim as if directly measured/observed.
- disagreement_defensible: ONLY relevant if their claimed mechanism did NOT match the reference. Is their reasoning a genuinely defensible alternative interpretation (the case is ambiguous, their evidence citation is real and relevant, a reasonable analyst could land there) — or is it simply weaker reasoning? Set to true only for real defensibility, not to be kind. If mechanismCorrect is true, set this to null.

Return strict JSON, no markdown fences, matching exactly:
{
  "calibration_profile": { "evidence_evaluation": <1-5>, "hypothesis_generation": <1-5>, "uncertainty_estimation": <1-5>, "prioritization": <1-5>, "differential_diagnosis": <1-5>, "confidence_calibration": <1-5>, "recommendation_quality": <1-5> },
  "evidence_discipline_pass": <true|false>,
  "disagreement_defensible": <true|false|null>,
  "feedback": "<3-5 sentences, direct, citing specifics from their actual reasoning trail>"
}`;

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const step = body.step as "socratic" | "calibrate";

    if (step === "socratic") {
      const observableCase = body.observableCase as ObservableCase;
      const inputs = body.inputs as AttemptInputs;
      const priorExchanges = (body.priorExchanges ?? []) as { question: string; response: string }[];

      if (!observableCase?.id) {
        return new Response(JSON.stringify({ error: "observableCase is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const exchangeBlock = priorExchanges.length > 0
        ? `\n\nPRIOR EXCHANGES IN THIS SESSION:\n${priorExchanges.map((e, i) => `Q${i + 1}: ${e.question}\nA${i + 1}: ${e.response}`).join("\n")}`
        : "";

      const userPrompt =
        `${buildObservableBlock(observableCase)}\n\n` +
        `ANALYST'S REASONING SO FAR:\n${buildReasoningTrailBlock(inputs)}${exchangeBlock}\n\n` +
        `Ask your one Socratic question now.`;

      const result = await route({
        tier: TUTOR_TIER,
        system: SYSTEM_PROMPT_SOCRATIC,
        user: userPrompt,
        // deepseek-v4-pro has thinking mode on by default (high effort) —
        // reasoning tokens share this budget with the final answer. See
        // learning-socratic-tutor's identical note; same sized-up
        // estimate, not empirically calibrated from this environment.
        maxTokens: 8000,
        temperature: 0.6,
      });

      if (result.finishReason === "length") {
        return new Response(
          JSON.stringify({ error: `Tutor response truncated (maxTokens: 8000, tier: ${result.tier}, model: ${result.model}).` }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ type: "socratic", question: result.text.trim(), meta: { model: result.model, tier: result.tier, estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)) } }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (step === "calibrate") {
      const observableCase = body.observableCase as ObservableCase;
      const referenceMechanism = body.referenceMechanism as string;
      const referenceMechanismNote = body.referenceMechanismNote as string | null;
      const referenceDiagnosis = body.referenceDiagnosis as string;
      const referenceRecommendation = body.referenceRecommendation as string;
      const inputs = body.inputs as AttemptInputs;
      const mechanismCorrect = body.mechanismCorrect as boolean;

      if (!VALID_MECHANISMS.has(referenceMechanism)) {
        return new Response(JSON.stringify({ error: "referenceMechanism missing or invalid" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const userPrompt =
        `${buildObservableBlock(observableCase)}\n\n` +
        `ANALYST'S FULL REASONING TRAIL:\n${buildReasoningTrailBlock(inputs)}\n\n` +
        `REFERENCE MECHANISM: ${MECHANISM_LABELS[referenceMechanism as CanonicalMechanism]}${referenceMechanismNote ? ` (${referenceMechanismNote})` : ""}\n` +
        `REFERENCE DIAGNOSIS: ${referenceDiagnosis}\n` +
        `REFERENCE RECOMMENDATION: ${referenceRecommendation}\n` +
        `mechanismCorrect (computed, not your call): ${mechanismCorrect}\n\n` +
        `Return the JSON calibration assessment now.`;

      const result = await route({
        tier: TUTOR_TIER,
        system: SYSTEM_PROMPT_CALIBRATE,
        user: userPrompt,
        maxTokens: 12000,
        temperature: 0.3,
      });

      if (result.finishReason === "length") {
        return new Response(
          JSON.stringify({ error: `Calibration truncated (maxTokens: 12000, tier: ${result.tier}, model: ${result.model}).` }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      let parsed: {
        calibration_profile: Record<string, number>;
        evidence_discipline_pass: boolean;
        disagreement_defensible: boolean | null;
        feedback: string;
      };
      try {
        const jsonText = result.text.trim().replace(/^```json\s*|\s*```$/g, "");
        parsed = JSON.parse(jsonText);
      } catch {
        return new Response(JSON.stringify({ error: "Model returned non-JSON calibration", raw: result.text }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const clamp = (n: unknown): number => Math.max(1, Math.min(5, Math.round(Number(n) || 3)));
      const profile = parsed.calibration_profile ?? {};

      return new Response(
        JSON.stringify({
          type: "calibrate",
          calibration_profile: {
            evidence_evaluation: clamp(profile.evidence_evaluation),
            hypothesis_generation: clamp(profile.hypothesis_generation),
            uncertainty_estimation: clamp(profile.uncertainty_estimation),
            prioritization: clamp(profile.prioritization),
            differential_diagnosis: clamp(profile.differential_diagnosis),
            confidence_calibration: clamp(profile.confidence_calibration),
            recommendation_quality: clamp(profile.recommendation_quality),
          },
          evidence_discipline_pass: parsed.evidence_discipline_pass !== false,
          disagreement_defensible: mechanismCorrect ? null : parsed.disagreement_defensible === true,
          feedback: parsed.feedback ?? "",
          meta: { model: result.model, tier: result.tier, estimatedCostUSD: parseFloat(result.estimatedCostUSD.toFixed(6)) },
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown step: ${step}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
