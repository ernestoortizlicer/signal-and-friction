import { createClient } from '@supabase/supabase-js';
import { LINGUISTIC_SANDBOX } from '../../src/lib/linguistic-sandbox';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Accepts either a full scan-url report or a minimal custom data object
interface DiagnosePayload {
  // From scan-url
  domain?: string;
  url?: string;
  grade?: string;
  frictionScore?: number;
  metrics?: {
    lcp?: { ms: number; status: string };
    tbt?: { ms: number; status: string };
    cls?: { value: number; status: string };
    performanceScore?: number;
  };
  signals?: {
    platform?: string | null;
    hasStripe?: boolean;
    scriptCount?: number;
    missingOgTags?: string[];
    hasCheckoutIndicator?: boolean;
  };
  frictionMechanisms?: Array<{ type: string; severity: string; detail: string }>;
  abandonmentDelta?: number;
  estimatedAbandonmentLoss?: string | null;
  // Custom / minimal
  company?: string;
  context?: string;
  website?: string;
}

interface DiagnoseResult {
  signal: string;
  friction: string;
  hypothesis: string;
  decision: {
    type: 'A' | 'B' | 'C';
    label: string;
    action: string;
    reasoning: string;
    tradeoff: string;
  };
  confidence: number;
}

const DIAGNOSTIC_SYSTEM_PROMPT = `${LINGUISTIC_SANDBOX}

---

You are the sovereign diagnostic engine for Signal & Friction — a clinical B2B conversion intelligence system. You receive telemetry data about a website or funnel and return a structured diagnostic.

IDENTITY CONSTRAINTS:
- Non-agentic. You do not ask questions. You diagnose.
- You do not explain your reasoning process. You output a decision.
- Every claim is traceable to a specific data point in the input.
- If data is absent, you flag it as "data pending" — you do not fabricate.

OUTPUT FORMAT: You MUST return only valid JSON. No markdown fences, no commentary, no text outside the JSON object.

Required schema:
{
  "signal": "string — the behavioral signal observed (what users are doing, quantified where possible)",
  "friction": "string — the friction mechanism and its root cause (one sentence, max 2)",
  "hypothesis": "string — causal hypothesis with confidence framing (one sentence)",
  "decision": {
    "type": "A" | "B" | "C",
    "label": "string — short intervention label",
    "action": "string — specific, implementable intervention (no abstract verbs)",
    "reasoning": "string — why this intervention, grounded in the telemetry",
    "tradeoff": "string — what this approach sacrifices or risks"
  },
  "confidence": number between 0 and 100
}

CONFIDENCE CALIBRATION:
- 85–100: multiple corroborating data points, clear causal isolation
- 65–84: single strong signal, low confounders
- 40–64: pattern match, moderate confounders
- below 40: insufficient data — flag explicitly in hypothesis

DECISION TYPES:
- A (Conservative): minimal scope change, lowest implementation risk
- B (Aggressive): structural intervention, highest expected yield
- C (Lateral): indirect approach, addresses root cause upstream`;

function buildUserContent(payload: DiagnosePayload): string {
  const lines: string[] = ['SITE DIAGNOSTIC MATRIX:'];

  if (payload.domain || payload.url || payload.website) {
    lines.push(`Domain: ${payload.domain || payload.url || payload.website}`);
  }
  if (payload.company) lines.push(`Company: ${payload.company}`);
  if (payload.grade) lines.push(`Friction Grade: ${payload.grade}`);
  if (payload.frictionScore !== undefined) lines.push(`Friction Score: ${payload.frictionScore}/100`);

  if (payload.metrics) {
    const m = payload.metrics;
    if (m.lcp) lines.push(`LCP: ${m.lcp.ms}ms (${m.lcp.status})`);
    if (m.tbt) lines.push(`TBT: ${m.tbt.ms}ms (${m.tbt.status})`);
    if (m.cls) lines.push(`CLS: ${m.cls.value} (${m.cls.status})`);
    if (m.performanceScore !== undefined) lines.push(`Performance Score: ${m.performanceScore}/100`);
  }

  if (payload.signals) {
    const s = payload.signals;
    if (s.platform) lines.push(`Platform: ${s.platform}`);
    if (s.hasStripe !== undefined) lines.push(`Stripe Detected: ${s.hasStripe}`);
    if (s.scriptCount !== undefined) lines.push(`Script Count: ${s.scriptCount}`);
    if (s.missingOgTags?.length) lines.push(`Missing OG Tags: ${s.missingOgTags.join(', ')}`);
    if (s.hasCheckoutIndicator !== undefined) lines.push(`Checkout Indicator: ${s.hasCheckoutIndicator}`);
  }

  if (payload.frictionMechanisms?.length) {
    lines.push('Detected Friction Mechanisms:');
    for (const fm of payload.frictionMechanisms) {
      lines.push(`  [${fm.severity.toUpperCase()}] ${fm.type}: ${fm.detail}`);
    }
  }

  if (payload.abandonmentDelta) {
    lines.push(`Abandonment Delta: +${payload.abandonmentDelta}% vs baseline`);
  }
  if (payload.estimatedAbandonmentLoss) {
    lines.push(`Estimated Monthly Loss: ${payload.estimatedAbandonmentLoss}`);
  }
  if (payload.context) {
    lines.push(`Additional Context: ${payload.context}`);
  }

  return lines.join('\n');
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  // Validate environment
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server misconfiguration: Supabase env vars absent' }, { status: 500 });
  }

  let payload: DiagnosePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Retrieve ANTHROPIC_API_KEY from Supabase Vault — never expose to client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: anthropicKey, error: vaultError } = await supabase.rpc('get_anthropic_key');
  if (vaultError || !anthropicKey) {
    return Response.json(
      { error: 'Vault retrieval failed — ANTHROPIC_API_KEY not initialized. Run vault.create_secret() in Supabase dashboard.' },
      { status: 503 }
    );
  }

  const userContent = buildUserContent(payload);

  // Call Anthropic API with prompt caching on the system block
  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: DIAGNOSTIC_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (fetchErr) {
    return Response.json({ error: `Anthropic API unreachable: ${String(fetchErr)}` }, { status: 502 });
  }

  if (!anthropicResponse.ok) {
    const errBody = await anthropicResponse.text().catch(() => '');
    return Response.json(
      { error: `Anthropic API error ${anthropicResponse.status}`, detail: errBody },
      { status: 502 }
    );
  }

  const anthropicData = await anthropicResponse.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const rawText = anthropicData.content?.find(b => b.type === 'text')?.text ?? '';

  let result: DiagnoseResult;
  try {
    // Strip any accidental markdown fences if model adds them
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    result = JSON.parse(cleaned);
  } catch {
    return Response.json(
      { error: 'Model returned non-JSON output', raw: rawText },
      { status: 422 }
    );
  }

  return Response.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
