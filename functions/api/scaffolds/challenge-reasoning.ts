import { requireAdmin } from '../_admin-auth';
import { REASONING_CHALLENGE_MAX_TOKENS } from '../_models';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Phase 3.1 — the AI as an active reasoning PARTNER, not a decision maker.
// This endpoint never writes to the database and never returns anything
// that looks like a diagnosis. It takes the analyst's own in-progress
// judgment text (whatever is currently on screen, saved or not — same
// principle as the free-teaser generator) and asks a model to push back
// on it: alternative readings, contradictions, missing evidence,
// counterarguments, one probing question. The analyst decides what, if
// anything, to do with any of it. Nothing from this response can be
// attached as a hypothesis directly — that still requires the analyst to
// go through the deterministic mechanism picker in ReasoningPanel.tsx and
// write their own rationale by hand.

interface EvidenceRow {
  label: string;
  value: string;
  source: string;
}

interface AttachedHypothesis {
  mechanismName: string;
  analystRationale: string;
}

interface CanonicalMechanism {
  id: string;
  name: string;
  definition: string;
}

interface ChallengeRequest {
  domain?: string;
  targetUrl?: string;
  evidence?: EvidenceRow[];
  frictionMechanism?: string;
  specificFrictionPoint?: string;
  whyBlocksConversion?: string;
  projectedImpact?: string;
  theDecision?: string;
  whatToAvoid?: string;
  confidenceAndWhy?: string;
  unknowns?: string;
  attachedHypotheses?: AttachedHypothesis[];
  canonicalMechanisms?: CanonicalMechanism[];
}

interface ChallengeResult {
  probing_question: string;
  alternative_hypotheses: string[];
  contradictions: string[];
  missing_evidence: string[];
  counterarguments: string[];
}

const SYSTEM_PROMPT = `You are a reasoning partner for a human analyst at Signal & Friction, a B2B behavioral-diagnostics practice. The analyst has already written their own judgment about a friction issue on a company's website. Your job is to strengthen and challenge their thinking — never to replace it.

YOU ARE NOT THE DECISION MAKER. Never state what the diagnosis is. Never tell the analyst which mechanism is correct or what they should conclude. You only raise questions, tensions, and possibilities for the analyst to weigh. The analyst remains the only authority who can attach a hypothesis, name the dominant friction, or make a recommendation.

HARD RULES:
- Ground every claim ONLY in the measured evidence and the analyst's own written text given below. Never invent a fact, number, or detail that is not present in the input.
- When naming a specific behavioral mechanism, use ONLY a name from the CANONICAL MECHANISM LIST given below, verbatim. Never invent a mechanism name or cite a psychological concept outside that list.
- Never introduce a friction category outside the 6 canonical friction mechanisms (cognitive_load, trust_deficit, commitment_anxiety, ordering_error, identity_friction, value_uncertainty). There is no 7th category — not even for a technical or performance issue.
- Never state a definitive diagnosis, recommendation, or "the correct answer." Every item you produce is a question or possibility for the analyst to consider, not a conclusion.
- If you have nothing genuine to add in a category, return an empty array for it rather than inventing filler to look thorough.
- Be direct and specific to this case. Do not produce generic advice that would apply to any website.

Return ONLY a JSON object with exactly this shape, nothing else, no markdown fences:
{
  "probing_question": "one direct question that pushes the analyst to check their own blind spot on this specific case",
  "alternative_hypotheses": ["a different mechanism, from the canonical list, that could also explain the observation, and why", "..."],
  "contradictions": ["a tension between the evidence and the stated judgment, or within the judgment itself", "..."],
  "missing_evidence": ["something absent that would meaningfully strengthen or overturn this read", "..."],
  "counterarguments": ["a reason the recommendation might be wrong or premature", "..."]
}`;

function buildUserContent(body: ChallengeRequest): string {
  const lines: string[] = [
    `CASE — ${body.domain ?? "unknown domain"} (${body.targetUrl ?? "unknown URL"})`,
    '',
  ];

  if (body.evidence?.length) {
    lines.push('MEASURED EVIDENCE:');
    for (const row of body.evidence) {
      lines.push(`- ${row.label}: ${row.value} (${row.source})`);
    }
    lines.push('');
  }

  lines.push('ANALYST\'S OWN JUDGMENT SO FAR:');
  lines.push(`Friction mechanism selected: ${body.frictionMechanism || '(not yet selected)'}`);
  lines.push(`Specific friction point: ${body.specificFrictionPoint || '(not yet written)'}`);
  lines.push(`Why it blocks conversion: ${body.whyBlocksConversion || '(not yet written)'}`);
  if (body.confidenceAndWhy?.trim()) lines.push(`Confidence & why: ${body.confidenceAndWhy.trim()}`);
  if (body.projectedImpact?.trim()) lines.push(`Projected impact: ${body.projectedImpact.trim()}`);
  if (body.theDecision?.trim()) lines.push(`The decision (recommendation): ${body.theDecision.trim()}`);
  if (body.whatToAvoid?.trim()) lines.push(`What to avoid: ${body.whatToAvoid.trim()}`);
  if (body.unknowns?.trim()) lines.push(`Analyst-stated unknowns: ${body.unknowns.trim()}`);
  lines.push('');

  if (body.attachedHypotheses?.length) {
    lines.push('MECHANISMS THE ANALYST HAS ALREADY ATTACHED (with their own rationale):');
    for (const h of body.attachedHypotheses) {
      lines.push(`- ${h.mechanismName}: ${h.analystRationale}`);
    }
    lines.push('');
  }

  if (body.canonicalMechanisms?.length) {
    lines.push('CANONICAL MECHANISM LIST (use ONLY these names when naming a mechanism):');
    for (const m of body.canonicalMechanisms) {
      lines.push(`- ${m.name}: ${m.definition}`);
    }
  } else {
    lines.push('No canonical mechanism list was provided — do not name any specific psychological mechanism; focus on contradictions, missing evidence, and counterarguments instead.');
  }

  return lines.join('\n');
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function validateChallengeResult(v: unknown): v is ChallengeResult {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.probing_question === 'string' &&
    isStringArray(r.alternative_hypotheses) &&
    isStringArray(r.contradictions) &&
    isStringArray(r.missing_evidence) &&
    isStringArray(r.counterarguments)
  );
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let payload: ChallengeRequest;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  // Server-side gate, not just a disabled button — there has to be a real
  // observation and a real causal claim already written before there's
  // anything honest to challenge.
  const missing: string[] = [];
  if (!payload.frictionMechanism?.trim()) missing.push('frictionMechanism');
  if (!payload.specificFrictionPoint?.trim()) missing.push('specificFrictionPoint');
  if (!payload.whyBlocksConversion?.trim()) missing.push('whyBlocksConversion');
  if (missing.length > 0) {
    return Response.json(
      { error: `Write your own friction mechanism, specific friction point, and why-it-blocks-conversion first — there's nothing to challenge yet: missing ${missing.join(', ')}` },
      { status: 422, headers: CORS }
    );
  }

  const deepseekKey = env.DEEPSEEK_API_KEY?.trim();
  if (!deepseekKey) {
    return Response.json(
      { error: 'The reasoning partner is unavailable right now — no AI provider is configured for this feature yet.' },
      { status: 503, headers: CORS }
    );
  }

  const userContent = buildUserContent(payload);

  let deepseekResponse: Response;
  try {
    // sharp tier (deepseek-v4-pro) — this is multi-step critical reasoning
    // across a full judgment, not classification or rhetorical restyling,
    // so it gets the heavier of the two DeepSeek tiers this codebase uses
    // (see supabase/functions/_shared/ai-router.ts's own tier table).
    // Called as a flat fetch, not through that router module, for the same
    // cross-directory-import constraint documented in functions/api/_models.ts.
    deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        max_tokens: REASONING_CHALLENGE_MAX_TOKENS,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (fetchErr) {
    return Response.json({ error: `AI provider unreachable: ${String(fetchErr)}` }, { status: 502, headers: CORS });
  }

  if (!deepseekResponse.ok) {
    const errBody = await deepseekResponse.text().catch(() => '');
    return Response.json({ error: `AI provider error ${deepseekResponse.status}`, detail: errBody }, { status: 502, headers: CORS });
  }

  const deepseekData = await deepseekResponse.json() as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = deepseekData.choices?.[0];

  if (choice?.finish_reason === 'length') {
    return Response.json(
      { error: 'The critique was truncated at the token ceiling. Try again — this usually resolves on retry.' },
      { status: 422, headers: CORS }
    );
  }

  const raw = (choice?.message?.content ?? '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'The AI response could not be parsed. Try again.' }, { status: 502, headers: CORS });
  }

  if (!validateChallengeResult(parsed)) {
    return Response.json({ error: 'The AI response did not match the expected shape. Try again.' }, { status: 502, headers: CORS });
  }

  return Response.json(parsed, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
