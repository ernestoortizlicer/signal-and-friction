// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: LEARNING SOCRATIC TUTOR
// Path: supabase/functions/learning-socratic-tutor/index.ts
// Tier: sharp (DeepSeek Reasoner) — genuine multi-step reasoning needed
//       to engage with a specific hypothesis, not boilerplate generation.
//
// Two-step case-method flow, not open-ended chat:
//   1. step: "followup" — learner submits a hypothesis + selected friction
//      mechanisms. Returns ONE Socratic question that engages with what
//      they specifically wrote — never the answer, the way a Harvard/
//      Stanford case-method cold-call works.
//   2. step: "verdict" — learner responds to that question. Returns a
//      real score, feedback, and the exact subset of the case study's
//      real concept titles the learner's reasoning actually demonstrated
//      (validated against the real list, never an invented concept name).
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { route } from "../_shared/ai-router.ts";

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
}

const SYSTEM_PROMPT_FOLLOWUP = `You are a case-method instructor running a Socratic cold-call session, in the style of Harvard Business School or Stanford GSB. A student has just submitted a diagnostic hypothesis for a real B2B SaaS conversion-friction case.

Your job: ask exactly ONE sharp, specific follow-up question that engages directly with what THIS student wrote — not a generic prompt. Reference their actual hypothesis and the mechanisms they selected. Push on the weakest or most assumption-laden part of their reasoning. If they missed something the case data implies, ask a question that leads them toward noticing it themselves — never tell them the answer.

Rules:
- Exactly one question. No preamble, no "Great start!", no answer key.
- Reference specifics from their hypothesis by name/detail — this must be unmistakably about THEIR answer, not a template.
- Keep it under 60 words.
- Do not reveal which concepts are "correct" — that only happens after their response.`;

const SYSTEM_PROMPT_VERDICT = `You are a case-method instructor concluding a Socratic cold-call session. The student submitted a hypothesis, you asked one follow-up question, and they responded. Now give a real, honest verdict — not automatic praise.

You will be given the case's REAL documented concepts (title + description). Assess the student's full reasoning (hypothesis + follow-up response) against those concepts honestly.

Return your answer as strict JSON, no markdown fences, matching exactly:
{
  "score": <integer 0-100, honest — a shallow or wrong answer should score low>,
  "feedback": "<2-4 sentences, direct, citing specifics from what they actually wrote — what they got right, what they missed or got backwards, referencing the real mechanism>",
  "concepts_demonstrated": [<zero or more of the EXACT concept title strings provided below that their reasoning genuinely shows understanding of — copy the titles verbatim, do not paraphrase or invent new ones, and do not include a concept unless they actually engaged with it>]
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
      selectedMechanisms: string[];
      followupQuestion?: string;
      followupResponse?: string;
    };

    const { step, challenge, hypothesis, selectedMechanisms } = body;

    if (!challenge?.id || !hypothesis?.trim()) {
      return new Response(
        JSON.stringify({ error: "challenge and hypothesis are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (step === "followup") {
      const userPrompt =
        `${buildCaseBlock(challenge)}\n\n` +
        `STUDENT'S SELECTED FRICTION MECHANISMS: ${selectedMechanisms.join("; ") || "(none selected)"}\n` +
        `STUDENT'S HYPOTHESIS: "${hypothesis}"\n\n` +
        `Ask your one Socratic follow-up question now.`;

      const result = await route({
        tier: "sharp",
        system: SYSTEM_PROMPT_FOLLOWUP,
        user: userPrompt,
        maxTokens: 150,
        temperature: 0.6,
      });

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

      const conceptsBlock = challenge.concepts
        .map((c) => `- "${c.title}": ${c.description}`)
        .join("\n");

      const userPrompt =
        `${buildCaseBlock(challenge)}\n\n` +
        `STUDENT'S SELECTED FRICTION MECHANISMS: ${selectedMechanisms.join("; ") || "(none selected)"}\n` +
        `STUDENT'S HYPOTHESIS: "${hypothesis}"\n` +
        `YOUR FOLLOW-UP QUESTION: "${followupQuestion}"\n` +
        `STUDENT'S RESPONSE: "${followupResponse}"\n\n` +
        `REAL DOCUMENTED CONCEPTS FOR THIS CASE:\n${conceptsBlock}\n\n` +
        `Return the JSON verdict now.`;

      const result = await route({
        tier: "sharp",
        system: SYSTEM_PROMPT_VERDICT,
        user: userPrompt,
        maxTokens: 400,
        temperature: 0.3,
      });

      let parsed: { score: number; feedback: string; concepts_demonstrated: string[] };
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

      return new Response(
        JSON.stringify({
          type: "verdict",
          score,
          feedback: parsed.feedback ?? "",
          concepts_demonstrated: conceptsDemonstrated,
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
